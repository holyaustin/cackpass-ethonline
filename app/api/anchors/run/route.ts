// app/api/admin/anchors/run/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, logAdminAction, AdminAuthError } from '@/lib/admin/auth'
import { PERMISSIONS } from '@/lib/admin/permissions'
import { shouldAnchor, runAnchor } from '@/lib/anchors/batcher'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAdmin(request, PERMISSIONS.RUN_ANCHOR)

    const check = await shouldAnchor()
    if (!check.should) {
      await logAdminAction(ctx, 'anchor.run', 'anchors', { skipped: true, reason: check.reason })
      // Spread check first, then override — order matters
      return NextResponse.json({ ...check, anchored: false })
    }

    const result = await runAnchor()
    await logAdminAction(ctx, 'anchor.run', result.batchId || 'anchors', result, result.success)
    // Spread result first, then override — order matters
    return NextResponse.json({ ...result, anchored: result.success })
  } catch (err: any) {
    if (err instanceof AdminAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}