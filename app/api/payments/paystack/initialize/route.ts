//app/api/payments/paystack/initialize/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { Payment, TicketType, Order } from '@/lib/database/models';

export async function POST(request: NextRequest) {
  try {
    // 1. Get token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // 2. Verify token with Privy API (no SDK needed)
    const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const privyAppSecret = process.env.PRIVY_APP_SECRET;

    if (!privyAppId || !privyAppSecret) {
      console.error('Privy credentials missing');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Call Privy's auth endpoint directly
    const authResponse = await fetch('https://auth.privy.io/api/v1/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${privyAppId}:${privyAppSecret}`).toString('base64')}`
      },
      body: JSON.stringify({ token })
    });

    if (!authResponse.ok) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const authData = await authResponse.json();
    const userId = authData.userId;

    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // 3. Parse request
    const { eventId, ticketTypeId, quantity, amount, email } = await request.json();

    if (!eventId || !ticketTypeId || !quantity || !amount || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 4. Check ticket availability
    await connectDB();
    const ticketType = await TicketType.findById(ticketTypeId);
    
    if (!ticketType) {
      return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 });
    }

    const available = ticketType.maxSupply - ticketType.currentSupply;
    if (available < quantity) {
      return NextResponse.json({ error: `Only ${available} tickets available` }, { status: 400 });
    }

    // 5. Create payment reference
    const reference = `CACK-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    // 6. Initialize Paystack
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100),
        currency: 'USD',
        reference,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tickets?payment=success`,
        metadata: { eventId, ticketTypeId, quantity, userId }
      })
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      return NextResponse.json({ error: paystackData.message }, { status: 400 });
    }

    // 7. Create order
    const order = await Order.create({
      userId,
      eventId,
      ticketTypeId,
      quantity,
      totalAmount: amount,
      paymentMethod: 'paystack',
      paymentStatus: 'pending',
      paymentReference: reference
    });

    // 8. Create payment record
    await Payment.create({
      paymentMethod: 'paystack',
      userId,
      eventId,
      amount,
      quantity,
      ticketTypeId,
      paymentStatus: 'pending',
      paymentReference: reference,
      metadata: { orderId: order._id }
    });

    return NextResponse.json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      reference,
      access_code: paystackData.data.access_code
    });

  } catch (error: any) {
    console.error('Paystack error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}