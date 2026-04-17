import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { Event } from '@/lib/database/models';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const walletAddress = req.headers.get('x-wallet-address');
    const userEmail = req.headers.get('x-user-email');

    if (!walletAddress && !userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if user is organizer (by wallet address)
    const isOrganizer = event.organizerWallet === walletAddress;
    if (isOrganizer) {
      return NextResponse.json({ allowed: true, role: 'organizer' });
    }

    // Check if user's email is in scanner list
    const scannerEmails = event.scannerEmails || [];
    if (userEmail && scannerEmails.includes(userEmail)) {
      return NextResponse.json({ allowed: true, role: 'scanner' });
    }

    return NextResponse.json({ allowed: false }, { status: 403 });
  } catch (error) {
    console.error('Scanner authorization error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}