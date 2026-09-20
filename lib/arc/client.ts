// lib/arc/client.ts
import { ethers } from 'ethers'

const ARC_CONFIG = {
  rpcUrl:
    process.env.NEXT_PUBLIC_ARC_RPC_URL ||
    'https://rpc.testnet.arc.network',
  rpcUrlFallback:
    process.env.NEXT_PUBLIC_ARC_RPC_URL_FALLBACK ||
    'https://arc-testnet.drpc.org',
  explorerUrl:
    process.env.NEXT_PUBLIC_ARC_EXPLORER_URL ||
    'https://testnet.arcscan.app',
  chainId: 5042002,
  chainIdHex: '0x4cef52',
  chainName: 'Arc Testnet',
  registryAddress:
    process.env.NEXT_PUBLIC_ARC_REGISTRY_ADDRESS || '',
  treasuryAddress:
    process.env.NEXT_PUBLIC_TREASURY_WALLET || '',
  usdcAddress:
    process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS ||
    '0x3600000000000000000000000000000000000000',
  usdcDecimals: 6,
  nativeDecimals: 18,
} as const


// ═══════════════════════════════════════════════════════════
// ABI — matches CackPassArcRegistry
// ═══════════════════════════════════════════════════════════
export const CackPassArcRegistryABI = [
  // ── Write functions ──
  "function recordPayment(bytes32 paymentId, address payer, uint256 amount, string paymentReference, bytes32 eventId, uint256 ticketQuantity, bytes32 orderHash, bytes32 paymentTxHash) external",
  "function confirmPayment(bytes32 paymentId) external",
  "function failPayment(bytes32 paymentId, string reason) external",
  "function refundPayment(bytes32 paymentId, string reason) external",
  "function anchorBatch(bytes32 batchId, bytes32 merkleRoot, uint256 recordCount, string batchLabel) external",

  // ── View functions ──
  "function getPayment(bytes32 paymentId) view returns (tuple(bytes32 paymentId, address payer, uint256 amount, string paymentReference, uint8 status, uint256 createdAt, uint256 confirmedAt, bytes32 eventId, uint256 ticketQuantity, bytes32 orderHash, bytes32 paymentTxHash))",
  "function getPaymentStatus(bytes32 paymentId) view returns (string)",
  "function paymentExists(bytes32 paymentId) view returns (bool)",
  "function getUserPayments(address user) view returns (bytes32[])",
  "function getPaymentTxHash(bytes32 paymentId) view returns (bytes32)",
  "function verifyOrderHash(bytes32 paymentId, bytes32 orderHash) view returns (bool)",
  "function getAnchor(bytes32 batchId) view returns (tuple(bytes32 merkleRoot, uint256 recordCount, uint256 anchoredAt, string batchLabel))",
  "function batchExists(bytes32 batchId) view returns (bool)",
  "function getTotalBatches() view returns (uint256)",
  "function getBatchIdAt(uint256 index) view returns (bytes32)",
  "function verifyBatchEntry(bytes32 batchId, bytes32 recordHash, bytes32[] proof) view returns (bool)",

  // ── Roles / state ──
  "function platformOwner() view returns (address)",
  "function paymentProcessor() view returns (address)",
  "function paused() view returns (bool)",

  // ── Events ──
  "event PaymentRecorded(bytes32 indexed paymentId, address indexed payer, bytes32 indexed eventId, uint256 amount, uint256 ticketQuantity, bytes32 orderHash, bytes32 paymentTxHash, string paymentReference, uint256 timestamp)",
  "event PaymentConfirmed(bytes32 indexed paymentId, address indexed payer, uint256 amount, uint256 timestamp)",
  "event BatchAnchored(bytes32 indexed batchId, bytes32 merkleRoot, uint256 recordCount, string batchLabel, uint256 timestamp)",
] as const

// ═══════════════════════════════════════════════════════════
// Enum mirror — PaymentStatus
// ═══════════════════════════════════════════════════════════
export const PaymentStatus = {
  0: 'pending',
  1: 'confirmed',
  2: 'failed',
  3: 'refunded',
} as const

export type OnChainPayment = {
  paymentId: string
  payer: string
  amount: string
  paymentReference: string
  status: string
  createdAt: number
  confirmedAt: number
  eventId: string
  ticketQuantity: number
  orderHash: string
  paymentTxHash: string
}

// ═══════════════════════════════════════════════════════════
// Provider + wallet
// ═══════════════════════════════════════════════════════════
function getProvider() {
  const rpcUrl =
    ARC_CONFIG?.rpcUrl ||
    process.env.NEXT_PUBLIC_ARC_RPC_URL ||
    'https://rpc.testnet.arc.network'
  console.log('🔗 [client.ts] Using RPC:', rpcUrl)
  return new ethers.JsonRpcProvider(rpcUrl)
}

function getSigner() {
  const key =
    process.env.PAYMENT_PROCESSOR_PRIVATE_KEY ||
    process.env.GASLESS_PRIVATE_KEY
  if (!key) {
    throw new Error('No payment processor key configured')
  }
  return new ethers.Wallet(key, getProvider())
}

function getRegistryReadOnly() {
  const addr = process.env.NEXT_PUBLIC_ARC_REGISTRY_ADDRESS
  if (!addr) throw new Error('NEXT_PUBLIC_ARC_REGISTRY_ADDRESS missing')
  return new ethers.Contract(addr, CackPassArcRegistryABI, getProvider())
}

function getRegistryWithSigner() {
  const addr = process.env.NEXT_PUBLIC_ARC_REGISTRY_ADDRESS
  if (!addr) throw new Error('NEXT_PUBLIC_ARC_REGISTRY_ADDRESS missing')
  return new ethers.Contract(addr, CackPassArcRegistryABI, getSigner())
}

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════
export function generatePaymentId(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).substring(2, 10)
  return ethers.id(`CACK-${ts}-${rand}`)
}

export function paymentIdToBytes32(id: string): string {
  return ethers.id(id)
}

export function eventIdToBytes32(eventId: string): string {
  return ethers.id(eventId)
}

export function batchIdFromString(label: string): string {
  return ethers.id(label)
}

/**
 * Build the orderHash that ties a MongoDB order to this payment.
 * The backend must compute this EXACT same hash when storing in MongoDB,
 * so verification succeeds.
 */
export function computeOrderHash(order: {
  orderId: string
  payer: string
  eventId: string
  ticketTypeId: string
  quantity: number
  amount: string
  paymentReference: string
}): string {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['string', 'address', 'string', 'string', 'uint256', 'string', 'string'],
      [
        order.orderId,
        order.payer,
        order.eventId,
        order.ticketTypeId,
        order.quantity,
        order.amount,
        order.paymentReference,
      ]
    )
  )
}

// ═══════════════════════════════════════════════════════════
// Write functions (called by backend)
// ═══════════════════════════════════════════════════════════
export async function recordPaymentOnChain(input: {
  paymentId: string        // bytes32 (already hashed)
  payer: string
  amount: string           // USDC amount, decimal string (e.g. "0.5")
  paymentReference: string
  eventId: string          // bytes32
  ticketQuantity: number
  orderHash: string        // bytes32
  paymentTxHash: string    // bytes32 (USDC tx hash)
}): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = getRegistryWithSigner()

    // Amount is in 18-decimal native units on Arc
    const amountWei = ethers.parseUnits(input.amount, 18)

    const tx = await contract.recordPayment(
      input.paymentId,
      input.payer,
      amountWei,
      input.paymentReference,
      input.eventId,
      input.ticketQuantity,
      input.orderHash,
      input.paymentTxHash,
      { gasLimit: 400000 }
    )

    const receipt = await tx.wait()
    return {
      success: true,
      txHash: tx.hash,
    }
  } catch (error: any) {
    console.error('recordPayment failed:', error)
    return {
      success: false,
      error: error.message || 'recordPayment failed',
    }
  }
}

export async function confirmPaymentOnChain(
  paymentId: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = getRegistryWithSigner()
    const tx = await contract.confirmPayment(paymentId, { gasLimit: 150000 })
    await tx.wait()
    return { success: true, txHash: tx.hash }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function anchorBatchOnChain(input: {
  batchId: string          // bytes32
  merkleRoot: string       // bytes32
  recordCount: number
  batchLabel: string       // "2026-09-week3"
}): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const contract = getRegistryWithSigner()
    const tx = await contract.anchorBatch(
      input.batchId,
      input.merkleRoot,
      input.recordCount,
      input.batchLabel,
      { gasLimit: 300000 }
    )
    await tx.wait()
    return { success: true, txHash: tx.hash }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ═══════════════════════════════════════════════════════════
// Read functions
// ═══════════════════════════════════════════════════════════
export async function getOnChainPayment(
  paymentId: string
): Promise<OnChainPayment | null> {
  try {
    const contract = getRegistryReadOnly()
    const exists = await contract.paymentExists(paymentId)
    if (!exists) return null

    const p = await contract.getPayment(paymentId)
    return {
      paymentId: p.paymentId,
      payer: p.payer,
      amount: ethers.formatUnits(p.amount, 18),
      paymentReference: p.paymentReference,
      status: PaymentStatus[Number(p.status) as 0 | 1 | 2 | 3] || 'unknown',
      createdAt: Number(p.createdAt),
      confirmedAt: Number(p.confirmedAt),
      eventId: p.eventId,
      ticketQuantity: Number(p.ticketQuantity),
      orderHash: p.orderHash,
      paymentTxHash: p.paymentTxHash,
    }
  } catch (error) {
    console.error('getOnChainPayment failed:', error)
    return null
  }
}

export async function getOnChainAnchor(batchId: string) {
  try {
    const contract = getRegistryReadOnly()
    const exists = await contract.batchExists(batchId)
    if (!exists) return null
    const a = await contract.getAnchor(batchId)
    return {
      merkleRoot: a.merkleRoot,
      recordCount: Number(a.recordCount),
      anchoredAt: Number(a.anchoredAt),
      batchLabel: a.batchLabel,
    }
  } catch (error) {
    console.error('getOnChainAnchor failed:', error)
    return null
  }
}