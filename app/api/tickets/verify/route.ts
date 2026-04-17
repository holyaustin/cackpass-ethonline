import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { MyTicket, Event } from '@/lib/database/models';
import { verifyTicketHMAC } from '@/lib/qr-security';

export async function POST(request: NextRequest) {
  try {
    const { ticketNumber, eventId, signature, scannerUserId } = await request.json();
    
    if (!ticketNumber || !eventId) {
      return NextResponse.json({ error: 'Missing ticketNumber or eventId' }, { status: 400 });
    }

    await connectDB();

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Verify HMAC signature if provided
    if (signature && !verifyTicketHMAC(ticketNumber, eventId, signature)) {
      return NextResponse.json({ error: 'Invalid ticket signature' }, { status: 401 });
    }

    // Find the ticket
    const ticket = await MyTicket.findOne({ ticketNumber, eventId });
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check if already used
    if (ticket.status === 'used') {
      return NextResponse.json({ 
        error: 'Ticket already used', 
        usedAt: ticket.usedAt,
        checkedInBy: ticket.checkedInBy 
      }, { status: 400 });
    }

    // Update ticket
    ticket.status = 'used';
    ticket.usedAt = new Date();
    if (scannerUserId) ticket.checkedInBy = scannerUserId;
    await ticket.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Ticket checked in successfully',
      ticket: {
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        usedAt: ticket.usedAt
      }
    });
  } catch (error) {
    console.error('Ticket verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}