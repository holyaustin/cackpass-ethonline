// app/api/admin/events/attendees/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import {
  Event,
  MyTicket,
  User,
  Order,
  Payment,
  TicketType,
} from '@/lib/database/models'
import {
  requireAdmin,
  logAdminAction,
  AdminAuthError,
} from '@/lib/admin/auth'
import { PERMISSIONS } from '@/lib/admin/permissions'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/events/attendees
 *
 * Two modes:
 *   ?list=1                       → returns all events (id + title + date)
 *   ?eventId=<mongoObjectId>      → returns attendees for that event
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request, PERMISSIONS.VIEW_PAYMENTS)
    await connectDB()

    const { searchParams } = new URL(request.url)
    const listMode = searchParams.get('list') === '1'
    const eventId = searchParams.get('eventId')

    // ────────────────────────────────────────────────
    // Mode 1 — List all events
    // ────────────────────────────────────────────────
    if (listMode) {
      const events = await Event.find({})
        .select('_id title startDate endDate venue isFree ticketsSold')
        .sort({ startDate: -1 })
        .lean()

      return NextResponse.json({
        success: true,
        events: events.map((e: any) => ({
          _id: e._id.toString(),
          title: e.title,
          startDate: e.startDate,
          endDate: e.endDate,
          venue: e.venue || '',
          isFree: !!e.isFree,
          ticketsSold: e.ticketsSold || 0,
        })),
      })
    }

    // ────────────────────────────────────────────────
    // Mode 2 — Attendees for a specific event
    // ────────────────────────────────────────────────
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'eventId is required' },
        { status: 400 }
      )
    }

    // Pull all tickets for this event, with their related data
    const tickets = await MyTicket.find({ eventId })
      .populate({
        path: 'userId',
        model: User,
        select: 'firstName lastName email walletAddress username',
      })
      .populate({
        path: 'orderId',
        model: Order,
        select: 'totalAmount originalAmount currency paymentMethod paymentStatus paymentReference metadata createdAt',
      })
      .populate({
        path: 'ticketTypeId',
        model: TicketType,
        select: 'name category price',
      })
      .sort({ createdAt: -1 })
      .lean()

    // Look up the Payment records for this event (for email-sent status)
    const payments = await Payment.find({ eventId })
      .select('paymentReference metadata')
      .lean()

    // Map reference → { emailSent, discountCode, discountAmount, discountPercent }
    const paymentByRef = new Map<string, any>()
    for (const p of payments as any[]) {
      if (p.paymentReference) {
        paymentByRef.set(p.paymentReference, {
          emailSent: p.metadata?.emailSent === true,
          discountCode: p.metadata?.discountCode || null,
          discountPercent: p.metadata?.discountPercent || 0,
          discountAmount: p.metadata?.discountAmount || 0,
          paymentMethod: p.metadata?.paymentMethod || null,
        })
      }
    }

    // Group rows by payment reference (one row per order, not per ticket)
    type Row = {
      reference: string
      buyerName: string
      buyerEmail: string
      walletAddress: string
      ticketCount: number
      ticketNumbers: string[]
      ticketType: string
      amountPaid: number
      originalAmount: number
      currency: string
      paymentMethod: string
      paymentStatus: string
      discountCode: string | null
      discountPercent: number
      discountAmount: number
      emailSent: boolean
      purchasedAt: string
      ticketStatus: string
    }

    const rowsByRef: Record<string, Row> = {}

    for (const t of tickets as any[]) {
      const buyer = t.userId || {}
      const order = t.orderId || {}
      const ticketType = t.ticketTypeId || {}

      // The reference is embedded in the ticketNumber ("<reference>-<n>")
      const ref = order.paymentReference || (t.ticketNumber || '').split('-').slice(0, 2).join('-')
      if (!ref) continue

      const payMeta = paymentByRef.get(ref)

      if (!rowsByRef[ref]) {
        const fullName =
          `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim() ||
          buyer.username ||
          'Guest'

        rowsByRef[ref] = {
          reference: ref,
          buyerName: fullName,
          buyerEmail: buyer.email || t.customerEmail || '',
          walletAddress: buyer.walletAddress || '',
          ticketCount: 0,
          ticketNumbers: [],
          ticketType: ticketType.name || 'General',
          amountPaid: order.totalAmount || 0,
          originalAmount: order.originalAmount || 0,
          currency: order.currency || 'NGN',
          paymentMethod: order.paymentMethod || '—',
          paymentStatus: order.paymentStatus || 'pending',
          discountCode: payMeta?.discountCode || order?.metadata?.discountCode || null,
          discountPercent: payMeta?.discountPercent || order?.metadata?.discountPercent || 0,
          discountAmount: payMeta?.discountAmount || order?.metadata?.discountAmount || 0,
          emailSent: payMeta?.emailSent || false,
          purchasedAt: order.createdAt
            ? new Date(order.createdAt).toISOString()
            : new Date(t.createdAt).toISOString(),
          ticketStatus: t.status || 'active',
        }
      }

      rowsByRef[ref].ticketCount += 1
      rowsByRef[ref].ticketNumbers.push(t.ticketNumber)
    }

    const attendees = Object.values(rowsByRef).sort(
      (a, b) =>
        new Date(b.purchasedAt).getTime() -
        new Date(a.purchasedAt).getTime()
    )

    // Summary stats
    const stats = {
      totalOrders: attendees.length,
      totalTickets: attendees.reduce((s, r) => s + r.ticketCount, 0),
      emailsSent: attendees.filter((r) => r.emailSent).length,
      emailsFailed: attendees.filter((r) => !r.emailSent).length,
    }

    return NextResponse.json({
      success: true,
      attendees,
      stats,
    })
  } catch (err: any) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[admin/events/attendees] error:', err)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/events/attendees
 * Body: { reference, eventId }
 * Resends the ticket confirmation email for a single order.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAdmin(request, PERMISSIONS.VIEW_PAYMENTS)
    await connectDB()

    const { reference, eventId } = await request.json()
    if (!reference || !eventId) {
      return NextResponse.json(
        { success: false, error: 'reference and eventId required' },
        { status: 400 }
      )
    }

    const event = await Event.findById(eventId).lean()
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Find the payment + tickets so we can rebuild the email payload
    const payment = await Payment.findOne({
      paymentReference: reference,
      eventId,
    }).lean()

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      )
    }

    const tickets = await MyTicket.find({
      eventId,
      ticketNumber: { $regex: `^${reference}-` },
    }).lean()

    if (tickets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No tickets found for this reference' },
        { status: 404 }
      )
    }

    const buyerEmail =
      (payment as any).customerEmail ||
      (tickets[0] as any).customerEmail ||
      ''

    if (!buyerEmail) {
      return NextResponse.json(
        { success: false, error: 'No buyer email on file' },
        { status: 400 }
      )
    }

    // Fire the email API
    const emailRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/email/ticket-confirmation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: buyerEmail,
          name: (payment as any).metadata?.userName || buyerEmail.split('@')[0],
          eventTitle: (event as any).title,
          eventDate: (event as any).startDate?.toISOString?.() || (event as any).startDate,
          venue: (event as any).venue || 'Online Event',
          ticketCount: tickets.length,
          ticketType:
            (payment as any).metadata?.ticketName || 'General Admission',
          amount: (payment as any).amount,
          reference,
        }),
      }
    )

    if (!emailRes.ok) {
      const errText = await emailRes.text()
      await logAdminAction(
        ctx,
        'email.resend',
        reference,
        { eventId, success: false, error: errText },
        false,
        errText
      )
      return NextResponse.json(
        { success: false, error: errText },
        { status: 500 }
      )
    }

    // Mark emailSent in Payment
    await Payment.updateOne(
      { _id: (payment as any)._id },
      { $set: { 'metadata.emailSent': true, 'metadata.resentAt': new Date() } }
    )

    await logAdminAction(ctx, 'email.resend', reference, { eventId, success: true })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[admin/events/attendees POST] error:', err)
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    )
  }
}