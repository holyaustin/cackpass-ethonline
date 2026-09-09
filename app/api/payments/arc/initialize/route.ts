// app/api/payments/arc/initialize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { Payment, TicketType, Order, Event, User, DiscountCode } from '@/lib/database/models';
import mongoose from 'mongoose';
import { 
  generatePaymentId, 
  initializeOnChainPayment,
  ARC_CONFIG,
} from '@/lib/arc/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 Arc Payment Initialize Request:', body);

    const {
      eventId,
      ticketTypeId,
      quantity,
      amount,
      email,
      userName,
      discountCode,
      discountPercent,
      discountAmount,
      isGuest,
    } = body;

    // Validate required fields
    if (!eventId || !ticketTypeId || !quantity || !amount || !email) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    await connectDB();

    // 1. Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        loginMethod: 'email',
        privyId: `guest-${Date.now()}`,
        isOrganizer: false,
        isProfileComplete: true,
      });
      console.log(`📝 Created new user: ${user._id}`);
    }

    // 2. Get event
    const event = await Event.findById(eventId).lean();
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // 3. Process ticket type
    let realTicketTypeId = null;
    let ticketType = null;
    let isVirtual = false;
    const isVirtualTicket = ticketTypeId.toString().startsWith('virtual_');

    if (!isVirtualTicket && mongoose.Types.ObjectId.isValid(ticketTypeId)) {
      realTicketTypeId = new mongoose.Types.ObjectId(ticketTypeId);
      ticketType = await TicketType.findById(realTicketTypeId);
      if (!ticketType) {
        return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 });
      }
      const available = ticketType.maxSupply - ticketType.currentSupply;
      if (available < quantity) {
        return NextResponse.json({ 
          error: `Only ${available} tickets available` 
        }, { status: 400 });
      }
      // Reserve tickets
      ticketType.currentSupply += quantity;
      await ticketType.save();
    } else {
      isVirtual = true;
      realTicketTypeId = event._id;
    }

    // 4. Calculate final amount
    let finalAmount = amount;
    let discountInfo = null;

    if (discountCode) {
      const discount = await DiscountCode.findOne({
        code: discountCode.toUpperCase(),
        eventId,
        isActive: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      });
      if (discount) {
        const remainingUses = discount.maxUses - discount.usedCount;
        if (remainingUses >= quantity) {
          const discountPercentValue = discountPercent || discount.discountPercent;
          const discountAmountValue = (amount * discountPercentValue) / 100;
          finalAmount = amount - discountAmountValue;
          discountInfo = {
            codeId: discount._id,
            code: discount.code,
            percent: discountPercentValue,
            amount: discountAmountValue,
          };
        }
      }
    }

    // 5. Generate payment ID
    const paymentId = generatePaymentId();
    const reference = paymentId.replace('0x', '').slice(0, 16);

    // 6. Initialize payment on Arc blockchain
    console.log('⛓️ Initializing payment on Arc blockchain...');
    const privateKey = process.env.GASLESS_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ 
        error: 'Gasless private key not configured' 
      }, { status: 500 });
    }

    const onChainResult = await initializeOnChainPayment(
      paymentId,
      finalAmount,
      `CACK-${reference}`,
      eventId,
      quantity,
      privateKey
    );

    if (!onChainResult.success) {
      // Rollback ticket supply
      if (!isVirtual && ticketType) {
        ticketType.currentSupply -= quantity;
        await ticketType.save();
      }
      return NextResponse.json({ 
        error: 'Failed to initialize on-chain payment',
        details: onChainResult.error,
      }, { status: 500 });
    }

    console.log('✅ On-chain payment initialized:', onChainResult.transactionHash);

    // 7. Create database records
    const order = await Order.create({
      userId: user._id,
      eventId,
      ticketTypeId: realTicketTypeId,
      quantity,
      totalAmount: finalAmount,
      originalAmount: amount,
      paymentMethod: 'arc_usdc',
      paymentStatus: 'pending',
      paymentReference: `CACK-${reference}`,
      customerEmail: email,
      customerName: userName || email.split('@')[0] || 'User',
      metadata: {
        isVirtual,
        ticketName: ticketType?.name || 'General Admission',
        eventTitle: event.title,
        onChainPaymentId: paymentId,
        transactionHash: onChainResult.transactionHash,
        blockNumber: onChainResult.blockNumber,
        discountCode: discountInfo?.code || null,
        discountPercent: discountInfo?.percent || null,
        discountAmount: discountInfo?.amount || null,
        isGuest: isGuest || false,
      },
    });

    await Payment.create({
      paymentMethod: 'arc_usdc',
      userId: user._id,
      eventId,
      amount: finalAmount,
      originalAmount: amount,
      quantity,
      ticketTypeId: realTicketTypeId,
      paymentStatus: 'pending',
      paymentReference: `CACK-${reference}`,
      customerEmail: email,
      metadata: {
        orderId: order._id,
        userName: userName || email.split('@')[0] || 'User',
        isVirtual,
        eventTitle: event.title,
        ticketName: ticketType?.name || 'General Admission',
        eventVenue: event.venue || 'Online Event',
        eventStartDate: event.startDate,
        eventEndDate: event.endDate,
        onChainPaymentId: paymentId,
        transactionHash: onChainResult.transactionHash,
        blockNumber: onChainResult.blockNumber,
        discountCode: discountInfo?.code || null,
        discountPercent: discountInfo?.percent || null,
        discountAmount: discountInfo?.amount || null,
        isGuest: isGuest || false,
      },
    });

    console.log(`✅ Payment initialized. Reference: CACK-${reference}, Amount: ${finalAmount}`);

    // 8. Return response with payment details
    return NextResponse.json({
      success: true,
      paymentId: paymentId,
      reference: `CACK-${reference}`,
      amount: finalAmount,
      message: 'Payment initialized. Please approve the USDC transaction.',
      onChain: {
        transactionHash: onChainResult.transactionHash,
        blockNumber: onChainResult.blockNumber,
      },
    });

  } catch (error: any) {
    console.error('❌ Arc payment initialization error:', error);
    return NextResponse.json({ 
      error: 'Payment initialization failed',
      details: error.message,
    }, { status: 500 });
  }
}