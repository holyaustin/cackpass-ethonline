// app/api/admin/contract/payment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { requireAdmin, AdminAuthError } from '@/lib/admin/auth'
import { PERMISSIONS } from '@/lib/admin/permissions'

const ABI = [
  'function paymentExists(bytes32 paymentId) view returns (bool)',
  'function getPayment(bytes32 paymentId) view returns (tuple(bytes32 paymentId, address payer, uint256 amount, string paymentReference, uint8 status, uint256 createdAt, uint256 confirmedAt, bytes32 eventId, uint256 ticketQuantity, bytes32 orderHash, bytes32 paymentTxHash))',
]

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request, PERMISSIONS.VIEW_PAYMENTS)
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.mainnet.arc.io'
    )
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_ARC_REGISTRY_ADDRESS!,
      ABI,
      provider
    )

    const exists = await contract.paymentExists(id)
    if (!exists) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    const p = await contract.getPayment(id)
    return NextResponse.json({
      payment: {
        paymentId: p.paymentId,
        payer: p.payer,
        amount: ethers.formatUnits(p.amount, 18),
        paymentReference: p.paymentReference,
        status: ['pending', 'confirmed', 'failed', 'refunded'][Number(p.status)],
        createdAt: Number(p.createdAt),
        confirmedAt: Number(p.confirmedAt),
        eventId: p.eventId,
        ticketQuantity: Number(p.ticketQuantity),
        orderHash: p.orderHash,
        paymentTxHash: p.paymentTxHash,
      },
    })
  } catch (err: any) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}