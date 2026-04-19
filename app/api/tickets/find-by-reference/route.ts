import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { MyTicket } from '@/lib/database/models';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get('reference');
  const eventId = searchParams.get('eventId');

  if (!reference || !eventId) {
    return NextResponse.json({ error: 'Missing reference or eventId' }, { status: 400 });
  }

  await connectDB();
  const ticket = await MyTicket.findOne({
    ticketNumber: { $regex: `^${reference}-` },
    eventId,
  }).select('ticketNumber');

  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  return NextResponse.json({ ticketNumber: ticket.ticketNumber });
}