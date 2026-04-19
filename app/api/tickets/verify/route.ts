// app/api/tickets/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { MyTicket, Event, CheckIn } from '@/lib/database/models';
import { verifyTicketHMAC } from '@/lib/qr-security'; // adjust import if needed
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { ticketNumber, eventId, signature, scannerUserId } = body;

    if (!ticketNumber || !eventId) {
      return NextResponse.json(
        { error: 'Missing ticketNumber or eventId' },
        { status: 400 }
      );
    }

    // 1. Validate event exists and is still active/not ended
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const eventEnd = new Date(event.endDate);
    if (eventEnd < now) {
      return NextResponse.json(
        { error: 'This event has already ended' },
        { status: 400 }
      );
    }

    // 2. Find the ticket
    const ticket = await MyTicket.findOne({ ticketNumber, eventId });
    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket not found for this event' },
        { status: 404 }
      );
    }

    // 3. Verify HMAC signature if provided (secure QR)
    if (signature) {
      const isValid = verifyTicketHMAC(ticketNumber, eventId, signature);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid signature – fake ticket' },
          { status: 401 }
        );
      }
    }

    // 4. Check ticket status
    if (ticket.status === 'used') {
      return NextResponse.json(
        {
          error: 'This ticket has already been used',
          usedAt: ticket.usedAt,
        },
        { status: 409 }
      );
    }
    if (ticket.status === 'cancelled' || ticket.status === 'refunded') {
      return NextResponse.json(
        { error: `Ticket is ${ticket.status} and cannot be used` },
        { status: 400 }
      );
    }
    if (ticket.status !== 'active') {
      return NextResponse.json(
        { error: `Ticket status is ${ticket.status}, cannot check in` },
        { status: 400 }
      );
    }

    // 5. Mark ticket as used
    ticket.status = 'used';
    ticket.usedAt = new Date();
    await ticket.save();

    // 6. Increment event ticketsSold counter (if you want to track total check‑ins)
    await Event.findByIdAndUpdate(eventId, { $inc: { ticketsSold: 1 } });

    // 7. Create check‑in log
    await CheckIn.create({
      eventId: new mongoose.Types.ObjectId(eventId),
      ticketId: ticket._id,          // or ticket.ticketId if you store a numeric ID
      userId: ticket.userId,
      scannerId: scannerUserId ? new mongoose.Types.ObjectId(scannerUserId) : null,
      checkedInAt: new Date(),
      isVerified: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Ticket verified and checked in successfully',
      ticketNumber,
    });
  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}