import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { DiscountCode } from '@/lib/database/models';
import mongoose from 'mongoose';

// GET /api/events/[id]/discounts – list all discounts for an event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params; // ✅ await the params Promise

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const discounts = await DiscountCode.find({ eventId: id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ discounts });
  } catch (error) {
    console.error('Error fetching discounts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/events/[id]/discounts – create a new discount code
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params; // ✅ await the params Promise

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
    }

    const body = await request.json();
    const { code, discountPercent, maxUses, expiresAt } = body;

    if (!code || !discountPercent || !maxUses) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (discountPercent < 1 || discountPercent > 100) {
      return NextResponse.json({ error: 'Discount percent must be between 1 and 100' }, { status: 400 });
    }

    if (maxUses < 1) {
      return NextResponse.json({ error: 'Max uses must be at least 1' }, { status: 400 });
    }

    // Check if code already exists for this event
    const existing = await DiscountCode.findOne({ eventId: id, code: code.toUpperCase() });
    if (existing) {
      return NextResponse.json({ error: 'Discount code already exists for this event' }, { status: 400 });
    }

    const discount = await DiscountCode.create({
      code: code.toUpperCase(),
      discountPercent,
      maxUses,
      eventId: id,
      isActive: true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    return NextResponse.json({ success: true, discount }, { status: 201 });
  } catch (error) {
    console.error('Error creating discount:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}