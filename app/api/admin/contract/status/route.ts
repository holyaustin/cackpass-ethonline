// app/api/admin/contract/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { requireAdmin, AdminAuthError } from '@/lib/admin/auth'
import { PERMISSIONS } from '@/lib/admin/permissions'

const ABI = [
  'function platformOwner() view returns (address)',
  'function paymentProcessor() view returns (address)',
  'function paused() view returns (bool)',
  'function getTotalBatches() view returns (uint256)',
]

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request, PERMISSIONS.VIEW_ANCHORS)

    const address = process.env.NEXT_PUBLIC_ARC_REGISTRY_ADDRESS || ''
    const rpcUrl = process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.mainnet.arc.io'

    if (!address) {
      return NextResponse.json({
        address: '',
        owner: '',
        processor: '',
        paused: false,
        totalBatches: 0,
        rpcUrl,
        error: 'NEXT_PUBLIC_ARC_REGISTRY_ADDRESS is not set in .env',
      })
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
      staticNetwork: true,
      batchMaxCount: 1,
    })
    const contract = new ethers.Contract(address, ABI, provider)

    const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn() } catch { return fallback }
    }

    const [owner, processor, isPaused, totalBatches] = await Promise.all([
      safe(() => contract.platformOwner(), ''),
      safe(() => contract.paymentProcessor(), ''),
      safe(() => contract.paused(), false),
      safe(() => contract.getTotalBatches(), 0n),
    ])

    return NextResponse.json({
      address,
      owner: owner || '',
      processor: processor || '',
      paused: !!isPaused,
      totalBatches: Number(totalBatches),
      rpcUrl,
    })
  } catch (err: any) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}