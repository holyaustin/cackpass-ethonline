import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { Event } from '@/lib/database/models';
import mongoose from 'mongoose';

// GET - Fetch all scanners for an event
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    await connectDB();
    const event = await Event.findById(id).select('scannerEmails');
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ scanners: event.scannerEmails || [] });
  } catch (error) {
    console.error('GET /api/events/[id]/scanners error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add a scanner email to an event
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { email } = await req.json();

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    await connectDB();
    const event = await Event.findById(id);
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Add email to scannerEmails array if not already present
    if (!event.scannerEmails.includes(email)) {
      event.scannerEmails.push(email);
      await event.save();
    }

    return NextResponse.json({ success: true, scanners: event.scannerEmails });
  } catch (error) {
    console.error('POST /api/events/[id]/scanners error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a scanner email from an event
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { email } = await req.json();

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await connectDB();
    const event = await Event.findById(id);
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    event.scannerEmails = event.scannerEmails.filter((e: string) => e !== email);
    await event.save();

    return NextResponse.json({ success: true, scanners: event.scannerEmails });
  } catch (error) {
    console.error('DELETE /api/events/[id]/scanners error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}