// app/api/admin/contract/update-processor/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { requireAdmin, logAdminAction, AdminAuthError } from '@/lib/admin/auth'
import { PERMISSIONS } from '@/lib/admin/permissions'

const ABI = ['function updatePaymentProcessor(address newProcessor) external']

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAdmin(request, PERMISSIONS.UPDATE_PROCESSOR)
    const { newProcessor } = await request.json()
    if (!newProcessor || !/^0x[a-fA-F0-9]{40}$/.test(newProcessor)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
    }

    const key = process.env.PAYMENT_PROCESSOR_PRIVATE_KEY || process.env.GASLESS_PRIVATE_KEY
    if (!key) throw new Error('No signer key configured')

    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.mainnet.arc.io'
    )
    const wallet = new ethers.Wallet(key, provider)
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_ARC_REGISTRY_ADDRESS!,
      ABI,
      wallet
    )

    const tx = await contract.updatePaymentProcessor(newProcessor, { gasLimit: 100000 })
    await tx.wait()

    await logAdminAction(ctx, 'contract.updateProcessor', newProcessor, { txHash: tx.hash })
    return NextResponse.json({ success: true, txHash: tx.hash })
  } catch (err: any) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}