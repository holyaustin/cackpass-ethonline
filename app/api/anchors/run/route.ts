// app/api/anchors/run/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { shouldAnchor, runAnchor } from '@/lib/anchors/batcher'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/anchors/run
 *
 * Trigger the fiat anchor batcher.
 *
 * Protected by a secret header. The header can come from either:
 *   - `x-cron-secret: <secret>`              (manual trigger)
 *   - `Authorization: Bearer <secret>`       (Vercel Cron)
 *
 * The batcher itself decides whether to actually anchor based on
 * the cadence rules (ANCHOR_MIN_RECORDS / ANCHOR_MAX_DAYS).
 */
export async function POST(request: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────
    const expected = process.env.ANCHOR_CRON_SECRET
    if (!expected) {
      console.error('ANCHOR_CRON_SECRET is not configured')
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 500 }
      )
    }

    const provided =
      request.headers.get('x-cron-secret') ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      ''

    if (provided !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Cadence check ─────────────────────────────────────
    const check = await shouldAnchor()

    if (!check.should) {
      return NextResponse.json({
        // Spread first so we inherit pendingCount / daysSinceLast / reason
        ...check,
        // Explicit overrides after the spread
        success: true,
        anchored: false,
      })
    }

    // ── Run the anchor ────────────────────────────────────
    const result = await runAnchor()

    return NextResponse.json({
      // Spread first so we inherit batchId / merkleRoot / txHash / error
      ...result,
      // Explicit overrides after the spread
      success: result.success,
      anchored: result.success,
    })
  } catch (error: any) {
    console.error('Anchor run failed:', error)
    return NextResponse.json(
      {
        success: false,
        anchored: false,
        error: error?.message || 'Anchor run failed',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/anchors/run
 *
 * Status check — reports whether the cadence is met without anchoring.
 * Public read-only, no auth required.
 */
export async function GET() {
  try {
    const check = await shouldAnchor()
    return NextResponse.json({
      ...check,
      minRecords: Number(process.env.ANCHOR_MIN_RECORDS) || 50,
      maxDays: Number(process.env.ANCHOR_MAX_DAYS) || 7,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Status check failed' },
      { status: 500 }
    )
  }
}