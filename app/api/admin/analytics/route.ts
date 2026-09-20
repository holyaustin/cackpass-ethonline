// app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { Payment, MyTicket } from '@/lib/database/models'
import { requireAdmin, AdminAuthError } from '@/lib/admin/auth'
import { PERMISSIONS } from '@/lib/admin/permissions'

export const dynamic = 'force-dynamic'

type Period = 'day' | 'week' | 'month'

function periodStart(period: Period): Date {
  const d = new Date()
  if (period === 'day') d.setHours(0, 0, 0, 0)
  else if (period === 'week') {
    const day = d.getDay()
    d.setDate(d.getDate() - day)
    d.setHours(0, 0, 0, 0)
  } else {
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
  }
  return d
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request, PERMISSIONS.VIEW_ANALYTICS)
    const period = (request.nextUrl.searchParams.get('period') || 'day') as Period
    await connectDB()

    const since = periodStart(period)

    const [paymentUsers, ticketUsers] = await Promise.all([
      Payment.distinct('userId', { createdAt: { $gte: since } }),
      MyTicket.distinct('userId', { createdAt: { $gte: since } }),
    ])
    const activeUsers = new Set([
      ...paymentUsers.map((id: any) => String(id)),
      ...ticketUsers.map((id: any) => String(id)),
    ]).size

    const ticketsSold = await MyTicket.countDocuments({ createdAt: { $gte: since } })
    const paymentsCount = await Payment.countDocuments({
      createdAt: { $gte: since },
      paymentStatus: 'completed',
    })

    const markupAgg = await Payment.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          paymentMethod: 'arc_usdc',
          createdAt: { $gte: since },
        },
      },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$metadata.processingMarkup', 0] } } } },
    ])
    const usdcMarkupAccrued = markupAgg[0]?.total ?? 0

    const buckets: { label: string; start: Date; end: Date }[] = []
    for (let i = 6; i >= 0; i--) {
      const start = new Date(since)
      const end = new Date(since)
      if (period === 'day') {
        start.setDate(start.getDate() - i)
        end.setDate(start.getDate() + 1)
      } else if (period === 'week') {
        start.setDate(start.getDate() - i * 7)
        end.setDate(start.getDate() + 7)
      } else {
        start.setMonth(start.getMonth() - i)
        end.setMonth(start.getMonth() + 1)
      }
      const label =
        period === 'day'
          ? start.toISOString().slice(0, 10)
          : period === 'week'
          ? `W${Math.ceil(start.getDate() / 7)} ${start.toISOString().slice(0, 7)}`
          : start.toISOString().slice(0, 7)
      buckets.push({ label, start, end })
    }

    const trend = await Promise.all(
      buckets.map(async (b) => {
        const [users, tickets, markup] = await Promise.all([
          Payment.distinct('userId', { createdAt: { $gte: b.start, $lt: b.end } }),
          MyTicket.countDocuments({ createdAt: { $gte: b.start, $lt: b.end } }),
          Payment.aggregate([
            {
              $match: {
                paymentStatus: 'completed',
                paymentMethod: 'arc_usdc',
                createdAt: { $gte: b.start, $lt: b.end },
              },
            },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$metadata.processingMarkup', 0] } } } },
          ]),
        ])
        return { label: b.label, users: users.length, tickets, usdcMarkup: markup[0]?.total ?? 0 }
      })
    )

    return NextResponse.json({
      period,
      since: since.toISOString(),
      activeUsers,
      ticketsSold,
      paymentsCount,
      usdcMarkupAccrued,
      trend,
    })
  } catch (err: any) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}