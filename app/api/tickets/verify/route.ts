// app/api/tickets/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { MyTicket, Event, CheckIn, User } from '@/lib/database/models';
import { verifyTicketHMAC } from '@/lib/qr-security';
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

    // 1. Validate event
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const now = new Date();
    const eventEnd = new Date(event.endDate);
    if (eventEnd < now) {
      return NextResponse.json({ error: 'This event has already ended' }, { status: 400 });
    }

    // 2. Find the ticket
    const ticket = await MyTicket.findOne({ ticketNumber, eventId });
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found for this event' }, { status: 404 });
    }

    // 3. Verify HMAC (if provided)
    if (signature) {
      const isValid = verifyTicketHMAC(ticketNumber, eventId, signature);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature – fake ticket' }, { status: 401 });
      }
    }

    // 4. Check current status
    if (ticket.status === 'used') {
      return NextResponse.json(
        { error: 'Ticket already used', usedAt: ticket.usedAt },
        { status: 409 }
      );
    }
    if (ticket.status !== 'active') {
      return NextResponse.json(
        { error: `Ticket is ${ticket.status} and cannot be used` },
        { status: 400 }
      );
    }

    // 5. Atomic update (no transaction – simple and safe)
    const updatedTicket = await MyTicket.findOneAndUpdate(
      { _id: ticket._id, status: 'active' },
      { $set: { status: 'used', usedAt: new Date() } },
      { returnDocument: 'after' } // fixes deprecation warning
    );

    if (!updatedTicket) {
      // Race condition – another scan already used it
      return NextResponse.json(
        { error: 'Ticket was already used by another scan' },
        { status: 409 }
      );
    }

    // 6. Increment event ticketsSold
    await Event.findByIdAndUpdate(eventId, { $inc: { ticketsSold: 1 } });

    // 7. Create check‑in log – convert scannerUserId correctly
    let scannerObjectId = null;
    if (scannerUserId) {
      if (mongoose.Types.ObjectId.isValid(scannerUserId)) {
        scannerObjectId = new mongoose.Types.ObjectId(scannerUserId);
      } else {
        // Assume it's a Privy ID – find the corresponding User
        const scannerUser = await User.findOne({ privyId: scannerUserId });
        if (scannerUser) scannerObjectId = scannerUser._id;
      }
    }

    await CheckIn.create({
      eventId: new mongoose.Types.ObjectId(eventId),
      ticketId: updatedTicket._id,
      userId: updatedTicket.userId,
      scannerId: scannerObjectId,
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
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}