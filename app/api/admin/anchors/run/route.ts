// app/api/admin/anchors/run/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, logAdminAction, AdminAuthError } from '@/lib/admin/auth'
import { PERMISSIONS } from '@/lib/admin/permissions'
import { shouldAnchor, runAnchor } from '@/lib/anchors/batcher'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/admin/anchors/run
 *
 * Admin-triggered anchor run. Requires the `run:anchor` permission.
 * Logs the action to the audit log.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAdmin(request, PERMISSIONS.RUN_ANCHOR)

    // ── Cadence check ─────────────────────────────────────
    const check = await shouldAnchor()

    if (!check.should) {
      await logAdminAction(
        ctx,
        'anchor.run',
        'anchors',
        { skipped: true, reason: check.reason }
      )

      return NextResponse.json({
        // Spread first so pendingCount / daysSinceLast / reason come through
        ...check,
        // Explicit overrides after the spread
        success: true,
        anchored: false,
      })
    }

    // ── Run the anchor ────────────────────────────────────
    const result = await runAnchor()

    await logAdminAction(
      ctx,
      'anchor.run',
      result.batchId || 'anchors',
      result,
      result.success
    )

    return NextResponse.json({
      // Spread first so batchId / merkleRoot / txHash / error come through
      ...result,
      // Explicit overrides after the spread
      success: result.success,
      anchored: result.success,
    })
  } catch (err: any) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status }
      )
    }
    console.error('Admin anchor run failed:', err)
    return NextResponse.json(
      { error: err?.message || 'Anchor run failed' },
      { status: 500 }
    )
  }
}