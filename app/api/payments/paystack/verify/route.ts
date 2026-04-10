import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { Payment, Order, MyTicket, TicketType } from '@/lib/database/models';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    // 1. Verify with Paystack
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { 'Authorization': `Bearer ${paystackSecretKey}` } }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyData.status || verifyData.data.status !== 'success') {
      return NextResponse.json({ 
        error: 'Payment not successful', 
        status: verifyData.data?.status 
      }, { status: 400 });
    }

    // 2. Connect to DB
    await connectDB();

    // 3. Find payment
    const payment = await Payment.findOne({ paymentReference: reference });
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // 4. If already completed, return existing tickets
    if (payment.paymentStatus === 'completed') {
      const tickets = await MyTicket.find({ orderId: payment.metadata?.orderId });
      return NextResponse.json({
        success: true,
        tickets: tickets.map(t => ({ ticketId: t.ticketNumber }))
      });
    }

    // 5. Update payment
    payment.paymentStatus = 'completed';
    await payment.save();

    // 6. Update order
    const order = await Order.findById(payment.metadata?.orderId);
    if (order) {
      order.paymentStatus = 'paid';
      await order.save();
    }

    // 7. Update ticket supply
    const ticketType = await TicketType.findById(payment.ticketTypeId);
    if (ticketType) {
      ticketType.currentSupply += payment.quantity;
      await ticketType.save();
    }

    // 8. Create tickets
    const tickets = [];
    for (let i = 0; i < payment.quantity; i++) {
      const ticket = await MyTicket.create({
        orderId: order?._id,
        userId: payment.userId,
        eventId: payment.eventId,
        ticketTypeId: payment.ticketTypeId,
        ticketNumber: `${reference}-${i + 1}`,
        status: 'active'
      });
      tickets.push(ticket);
    }

    return NextResponse.json({
      success: true,
      tickets: tickets.map(t => ({ ticketId: t.ticketNumber }))
    });

  } catch (error: any) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}