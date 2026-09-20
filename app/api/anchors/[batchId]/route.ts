import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { Payment } from '@/lib/database/models'
import { getOnChainAnchor } from '@/lib/arc/client'
import { hashRecord } from '@/lib/anchors/merkle'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params

    await connectDB()

    // On-chain anchor
    const anchor = await getOnChainAnchor(batchId)
    if (!anchor) {
      return NextResponse.json({ error: 'Batch not found on-chain' }, { status: 404 })
    }

    // All records in this batch
    const records = await Payment.find({
      'metadata.anchorBatchId': batchId,
    }).lean()

    const leaves = records.map((r) => ({
      paymentId: r.metadata?.paymentId,
      reference: r.paymentReference,
      leafHash: hashRecord(r),
      merkleProof: r.metadata?.merkleProof || [],
    }))

    return NextResponse.json({
      success: true,
      batchId,
      anchor,
      records: leaves,
      recordCount: records.length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}