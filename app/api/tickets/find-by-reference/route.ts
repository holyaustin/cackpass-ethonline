import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { MyTicket } from '@/lib/database/models';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get('reference');
  const eventId   = searchParams.get('eventId');

  console.log('[FIND-BY-REF] Query params received', { reference, eventId });

  if (!reference) {
    console.error('[FIND-BY-REF] ❌ Missing reference param');
    return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
  }

  await connectDB();

  // ── Strategy 1: match ticketNumber prefix only (most permissive) ────────────
  // Old tickets may not have an eventId field at all, so we avoid filtering on it.
  // The reference is unique enough per-order to be safe.
  const regexPattern = `^${reference.trim()}-`;
  console.log('[FIND-BY-REF] Searching with regex', regexPattern);

  let ticket = await MyTicket.findOne({
    ticketNumber: { $regex: regexPattern },
  })
    .select('ticketNumber eventId')
    .lean();

  console.log('[FIND-BY-REF] Strategy 1 result (prefix only)', ticket);

  // ── Strategy 2: if Strategy 1 fails, try exact ticketNumber = reference ────
  if (!ticket) {
    console.log('[FIND-BY-REF] Strategy 1 returned nothing — trying exact match on ticketNumber');
    ticket = await MyTicket.findOne({ ticketNumber: reference.trim() })
      .select('ticketNumber eventId')
      .lean();
    console.log('[FIND-BY-REF] Strategy 2 result (exact match)', ticket);
  }

  // ── Strategy 3: try the reference field directly ───────────────────────────
  if (!ticket) {
    console.log('[FIND-BY-REF] Strategy 2 returned nothing — trying reference field');
    ticket = await MyTicket.findOne({
      $or: [
        { reference: reference.trim() },
        { paymentReference: reference.trim() },
      ],
    })
      .select('ticketNumber eventId')
      .lean();
    console.log('[FIND-BY-REF] Strategy 3 result (reference field)', ticket);
  }

  if (!ticket) {
    console.error('[FIND-BY-REF] ❌ All strategies failed for reference', reference);

    // Return a diagnostic hint about what IS in the collection
    const sample = await MyTicket.find({}).select('ticketNumber eventId').limit(3).lean();
    console.log('[FIND-BY-REF] Sample tickets in collection (for debugging)', sample);

    return NextResponse.json(
      { error: 'Ticket not found', reference, hint: 'Check server logs for sample tickets' },
      { status: 404 }
    );
  }

  // Optional: if eventId was supplied, warn if it doesn't match (but still return the ticket)
  if (eventId && ticket.eventId) {
    const storedId  = String(ticket.eventId).trim();
    const queriedId = String(eventId).trim();
    if (storedId !== queriedId) {
      console.warn('[FIND-BY-REF] ⚠️ eventId mismatch', {
        stored:   storedId,
        queried:  queriedId,
        ticket:   ticket.ticketNumber,
      });
      // We still return the ticket — the scan page does the authoritative event-ID check
    }
  }

  console.log('[FIND-BY-REF] ✅ Returning ticket', ticket.ticketNumber);
  return NextResponse.json({ ticketNumber: ticket.ticketNumber });
}