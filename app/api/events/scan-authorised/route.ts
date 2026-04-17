import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { Event } from '@/lib/database/models';

export async function GET(req: NextRequest) {
  try {
    const walletAddress = req.headers.get('x-wallet-address');
    const userEmail = req.headers.get('x-user-email');

    if (!walletAddress && !userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Find events where user is organizer OR user email is in scannerEmails
    const events = await Event.find({
      $or: [
        { organizerWallet: walletAddress },
        { scannerEmails: userEmail },
      ],
    }).select('_id title startDate venue organizerWallet scannerEmails');

    // Add isOrganizer flag to each event
    const eventsWithRole = events.map(event => ({
      ...event.toObject(),
      isOrganizer: event.organizerWallet === walletAddress,
    }));

    return NextResponse.json({ events: eventsWithRole });
  } catch (error) {
    console.error('GET /api/events/scan-authorised error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}