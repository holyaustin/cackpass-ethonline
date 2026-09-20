// app/api/admin/contract/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { requireAdmin, AdminAuthError } from '@/lib/admin/auth'
import { PERMISSIONS } from '@/lib/admin/permissions'
import { CackPassArcRegistryABI } from '@/lib/arc/client'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request, PERMISSIONS.VIEW_ANCHORS)

    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.network'
    )
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_ARC_REGISTRY_ADDRESS!,
      CackPassArcRegistryABI,
      provider
    )

    const [owner, processor, isPaused, totalBatches] = await Promise.all([
      contract.platformOwner(),
      contract.paymentProcessor(),
      contract.paused(),
      contract.getTotalBatches(),
    ])

    return NextResponse.json({
      owner,
      processor,
      paused: isPaused,
      totalBatches: Number(totalBatches),
      address: process.env.NEXT_PUBLIC_ARC_REGISTRY_ADDRESS,
    })
  } catch (err: any) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}