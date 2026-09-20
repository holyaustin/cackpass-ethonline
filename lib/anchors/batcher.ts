import { connectDB } from '@/lib/database/connection'
import { Payment } from '@/lib/database/models'
import { anchorBatchOnChain, batchIdFromString } from '@/lib/arc/client'
import { buildMerkleTree, hashRecord, getMerkleProof } from './merkle'
import { ethers } from 'ethers'

const MIN_RECORDS = Number(process.env.ANCHOR_MIN_RECORDS) || 50
const MAX_DAYS = Number(process.env.ANCHOR_MAX_DAYS) || 7

export async function shouldAnchor(): Promise<{
  should: boolean
  reason: string
  pendingCount: number
  daysSinceLast: number
}> {
  await connectDB()

  const pendingCount = await Payment.countDocuments({
    paymentMethod: 'flutterwave',
    paymentStatus: 'completed',
    'metadata.anchorBatchId': null,
  })

  // Find latest anchor
  const lastAnchor = await Payment.findOne(
    { 'metadata.anchorBatchId': { $ne: null } },
    { 'metadata.anchoredAt': 1 },
    { sort: { 'metadata.anchoredAt': -1 } }
  ).lean()

  const lastAnchorTime = lastAnchor?.metadata?.anchoredAt
    ? new Date(lastAnchor.metadata.anchoredAt).getTime()
    : 0
  const daysSinceLast = lastAnchorTime
    ? (Date.now() - lastAnchorTime) / (1000 * 60 * 60 * 24)
    : Infinity

  if (pendingCount >= MIN_RECORDS) {
    return { should: true, reason: `records>=${MIN_RECORDS}`, pendingCount, daysSinceLast }
  }
  if (daysSinceLast >= MAX_DAYS && pendingCount > 0) {
    return { should: true, reason: `days>=${MAX_DAYS}`, pendingCount, daysSinceLast }
  }
  return { should: false, reason: 'cadence-not-met', pendingCount, daysSinceLast }
}

export async function runAnchor(): Promise<{
  success: boolean
  batchId?: string
  merkleRoot?: string
  recordCount?: number
  txHash?: string
  error?: string
}> {
  await connectDB()

  // Fetch all pending fiat records
  const pending = await Payment.find({
    paymentMethod: 'flutterwave',
    paymentStatus: 'completed',
    'metadata.anchorBatchId': null,
  }).lean()

  if (pending.length === 0) {
    return { success: false, error: 'No pending records' }
  }

  // Compute leaf hashes
  const leaves = pending.map((p) => hashRecord(p))

  // Build tree
  const { root, layers } = buildMerkleTree(leaves)

  // Batch label
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const week = Math.ceil(now.getUTCDate() / 7)
  const label = `${year}-${month}-week${week}`
  const batchId = batchIdFromString(label)

  // Write to registry
  const result = await anchorBatchOnChain({
    batchId,
    merkleRoot: root,
    recordCount: pending.length,
    batchLabel: label,
  })

  if (!result.success) {
    return { success: false, error: result.error }
  }

  // Update MongoDB records with anchor info
  for (let i = 0; i < pending.length; i++) {
    const p = pending[i]
    const leaf = leaves[i]
    const proof = getMerkleProof(leaf, layers)

    await Payment.updateOne(
      { _id: p._id },
      {
        $set: {
          'metadata.anchorBatchId': batchId,
          'metadata.anchorLabel': label,
          'metadata.merkleProof': proof,
          'metadata.merkleRoot': root,
          'metadata.registryAnchorTxHash': result.txHash,
          'metadata.anchoredAt': new Date(),
        },
      }
    )
  }

  return {
    success: true,
    batchId,
    merkleRoot: root,
    recordCount: pending.length,
    txHash: result.txHash,
  }
}