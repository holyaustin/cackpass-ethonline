// app/api/admin/contract/anchor/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { requireAdmin, AdminAuthError } from '@/lib/admin/auth'
import { PERMISSIONS } from '@/lib/admin/permissions'

const ABI = [
  'function batchExists(bytes32 batchId) view returns (bool)',
  'function getAnchor(bytes32 batchId) view returns (tuple(bytes32 merkleRoot, uint256 recordCount, uint256 anchoredAt, string batchLabel))',
]

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request, PERMISSIONS.VIEW_ANCHORS)
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

    const exists = await contract.batchExists(id)
    if (!exists) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })

    const a = await contract.getAnchor(id)
    return NextResponse.json({
      anchor: {
        merkleRoot: a.merkleRoot,
        recordCount: Number(a.recordCount),
        anchoredAt: Number(a.anchoredAt),
        batchLabel: a.batchLabel,
      },
    })
  } catch (err: any) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}