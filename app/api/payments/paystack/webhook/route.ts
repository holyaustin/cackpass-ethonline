import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { Payment, Order, MyTicket, TicketType } from '@/lib/database/models';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('x-paystack-signature');
    const rawBody = await request.text();
    const secret = process.env.PAYSTACK_SECRET_KEY;

    const hash = crypto.createHmac('sha512', secret!).update(rawBody).digest('hex');
    if (signature !== hash) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    
    // Only process successful charges
    if (event.event !== 'charge.success') {
      return NextResponse.json({ received: true });
    }

    const { data } = event;
    const reference = data.reference;

    // Connect to DB
    await connectDB();

    // Find payment
    const payment = await Payment.findOne({ paymentReference: reference });
    if (!payment || payment.paymentStatus === 'completed') {
      return NextResponse.json({ received: true });
    }

    // Update payment
    payment.paymentStatus = 'completed';
    payment.transactionHash = data.reference;
    await payment.save();

    // Update order
    const order = await Order.findById(payment.metadata?.orderId);
    if (order) {
      order.paymentStatus = 'paid';
      await order.save();
    }

    // Update ticket supply
    const ticketType = await TicketType.findById(payment.ticketTypeId);
    if (ticketType) {
      ticketType.currentSupply += payment.quantity;
      await ticketType.save();
    }

    // Create tickets if not already created
    const existingTickets = await MyTicket.findOne({ orderId: order?._id });
    if (!existingTickets) {
      for (let i = 0; i < payment.quantity; i++) {
        await MyTicket.create({
          orderId: order?._id,
          userId: payment.userId,
          eventId: payment.eventId,
          ticketTypeId: payment.ticketTypeId,
          ticketNumber: `${reference}-${i + 1}`,
          status: 'active'
        });
      }
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    // Always return 200 to prevent Paystack retries
    return NextResponse.json({ received: true });
  }
}