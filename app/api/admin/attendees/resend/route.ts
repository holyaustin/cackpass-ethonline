// app/api/admin/attendees/resend/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import {
  MyTicket,
  Event,
  TicketType,
  User,
  AdminUser,
} from '@/lib/database/models'
import { SUPER_ADMIN_EMAIL, PERMISSIONS } from '@/lib/admin/permissions'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/attendees/resend
 * Body: { eventId, reference, walletAddress }
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    const { eventId, reference, walletAddress } = body

    console.log('📧 Resend request received:', {
      eventId,
      reference,
      walletAddress: walletAddress?.slice(0, 10) + '...',
    })

    // ── 1. Validate required fields ──
    if (!eventId || !reference || !walletAddress) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: {
            eventId: !!eventId,
            reference: !!reference,
            walletAddress: !!walletAddress,
          },
        },
        { status: 400 }
      )
    }

    // ── 2. Resolve the caller from wallet address ──
    const caller = await User.findOne({
      walletAddress: { $regex: new RegExp(`^${walletAddress}$`, 'i') },
    }).lean()

    if (!caller || !caller.email) {
      console.error('Resend: caller not found or has no email', {
        walletAddress,
      })
      return NextResponse.json(
        { error: 'Unauthorized: caller has no email on record' },
        { status: 401 }
      )
    }

    const callerEmail = caller.email.toLowerCase()
    let hasPermission = false

    if (callerEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      hasPermission = true
    } else {
      const admin = await AdminUser.findOne({
        email: callerEmail,
        isActive: true,
      }).lean()
      hasPermission =
        !!admin?.permissions?.includes(PERMISSIONS.VIEW_ATTENDEES)
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden: missing view:attendees permission' },
        { status: 403 }
      )
    }

    // ── 3. Load the tickets ──
    // Reference may be either the payment reference OR the full ticket
    // number. Handle both by matching the ticket-number prefix and by
    // matching the order's paymentReference.
    let tickets = await MyTicket.find({
      eventId,
      ticketNumber: { $regex: `^${reference}` },
    })
      .populate({
        path: 'userId',
        model: User,
        select: 'firstName lastName email walletAddress username phoneNumber',
      })
      .lean()

    // Fallback: look up by order's paymentReference
    if (tickets.length === 0) {
      const mongoose = await import('mongoose')
      tickets = await MyTicket.aggregate([
        {
          $match: {
            eventId: new mongoose.Types.ObjectId(eventId),
          },
        },
        {
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: '_id',
            as: 'order',
          },
        },
        { $unwind: '$order' },
        { $match: { 'order.paymentReference': reference } },
      ])
    }

    if (tickets.length === 0) {
      console.error('Resend: no tickets found', { eventId, reference })
      return NextResponse.json(
        {
          error: `No tickets found for reference "${reference}" in this event`,
        },
        { status: 404 }
      )
    }

    const sample: any = tickets[0]

    // ── 4. Resolve buyer email + name with multiple fallbacks ──
    //
    // Priority:
    //   1. populated User document (from userId)
    //   2. ticket.customerEmail
    //   3. ticket.metadata.emailAddress
    //   4. ticket.metadata.userEmail / metadata.email
    const populatedUser = sample.userId || null

    const buyerEmail: string =
      populatedUser?.email ||
      sample.customerEmail ||
      sample.metadata?.emailAddress ||
      sample.metadata?.userEmail ||
      sample.metadata?.email ||
      ''

    const buyerName: string =
      populatedUser?.firstName ||
      populatedUser?.username ||
      sample.customerName ||
      sample.metadata?.userName ||
      (buyerEmail ? buyerEmail.split('@')[0] : '') ||
      'Guest'

    console.log('📧 Resolved buyer info:', {
      buyerEmail,
      buyerName,
      source: populatedUser?.email
        ? 'user-document'
        : sample.customerEmail
        ? 'ticket-customerEmail'
        : sample.metadata?.emailAddress
        ? 'ticket-metadata'
        : 'none',
    })

    if (!buyerEmail) {
      console.error('Resend: no buyer email resolved for tickets', {
        reference,
        ticketNumbers: tickets.map((t: any) => t.ticketNumber),
        populatedUserId: sample.userId?._id,
      })
      return NextResponse.json(
        {
          error:
            'No email on record for this buyer. The ticket has no customerEmail and the user has no email either.',
        },
        { status: 400 }
      )
    }

    // ── 5. Load event + ticket type for the email ──
    const event = await Event.findById(eventId).lean()
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const ticketType = sample.ticketTypeId
      ? await TicketType.findById(sample.ticketTypeId).lean()
      : null

    // ── 6. All tickets in the same order ──
    const orderId = sample.orderId
    const orderTickets = orderId
      ? await MyTicket.find({ orderId }).lean()
      : tickets

    const totalAmount =
      orderTickets.reduce(
        (sum: number, t: any) => sum + (t.totalPrice || 0),
        0
      ) || (event as any).price || 0

    // ── 7. Call the existing email endpoint ──
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_APP_URL not configured on server' },
        { status: 500 }
      )
    }

    const referenceForEmail =
      sample.ticketNumber && sample.ticketNumber.includes('-')
        ? sample.ticketNumber.replace(/-\d+$/, '') // strip trailing "-1"
        : reference

    const emailRes = await fetch(
      `${appUrl}/api/email/ticket-confirmation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: buyerEmail,
          name: buyerName,
          eventTitle: (event as any).title,
          eventDate: (event as any).startDate,
          venue: (event as any).venue || 'Online Event',
          ticketCount: orderTickets.length,
          ticketType: (ticketType as any)?.name || 'General Admission',
          amount: totalAmount,
          reference: referenceForEmail,
        }),
      }
    )

    const emailContentType = emailRes.headers.get('content-type') || ''
    if (!emailContentType.includes('application/json')) {
      const errText = await emailRes.text()
      console.error('Resend: email API returned non-JSON', {
        status: emailRes.status,
        body: errText.slice(0, 200),
      })
      return NextResponse.json(
        {
          error: `Email API returned non-JSON (status ${emailRes.status})`,
        },
        { status: 500 }
      )
    }

    const emailData = await emailRes.json()

    if (!emailRes.ok || !emailData.success) {
      console.error('Resend: email API failed', emailData)
      return NextResponse.json(
        { error: emailData.error || 'Email API failed' },
        { status: 500 }
      )
    }

    // ── 8. Mark the tickets as emailed ──
    await MyTicket.updateMany(
      { _id: { $in: orderTickets.map((t: any) => t._id) } },
      {
        $set: {
          'metadata.emailSent': true,
          'metadata.sentAt': new Date(),
          'metadata.emailResent': true,
          'metadata.emailResentAt': new Date(),
        },
      }
    )

    return NextResponse.json({
      success: true,
      to: buyerEmail,
      ticketCount: orderTickets.length,
      resentAt: new Date().toISOString(),
      messageId: emailData.messageId || null,
    })
  } catch (error: any) {
    console.error('Resend email error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to resend email',
        details:
          process.env.NODE_ENV === 'development'
            ? error.stack
            : undefined,
      },
      { status: 500 }
    )
  }
}