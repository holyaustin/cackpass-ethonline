// app/api/discount/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { DiscountCode } from '@/lib/database/models';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { code, eventId, quantity } = await request.json();

    if (!code || !eventId || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const discount = await DiscountCode.findOne({
      code: code.toUpperCase(),
      eventId,
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    });

    if (!discount) {
      return NextResponse.json({ error: 'Invalid or expired discount code' }, { status: 404 });
    }

    const remainingUses = discount.maxUses - discount.usedCount;
    if (remainingUses <= 0) {
      return NextResponse.json({ error: 'Discount code has reached its usage limit' }, { status: 400 });
    }

    if (quantity > remainingUses) {
      return NextResponse.json({
        error: `Discount code can only be applied to ${remainingUses} ticket(s)`,
        remainingUses,
      }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      discountPercent: discount.discountPercent,
      remainingUses,
      codeId: discount._id,
    });
  } catch (error) {
    console.error('Discount validation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}