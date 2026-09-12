// app/api/payments/arc/initialize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { Payment, TicketType, Order, Event, User, DiscountCode } from '@/lib/database/models';
import mongoose from 'mongoose';
import {
  generatePaymentId,
  initializeOnChainPayment,
} from '@/lib/arc/client';

const NGN_PER_USDC = Number(process.env.NEXT_PUBLIC_NGN_PER_USDC) || 1350;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 Arc Payment Initialize Request:', body);

    const {
      eventId,
      ticketTypeId,
      quantity,
      amount,           // USDC amount
      originalAmount,   // NGN amount
      email,
      userName,
      discountCode,
      discountPercent,
      discountAmount,
      isGuest,
    } = body;

    // ============================================================
    // Validate required fields
    // ============================================================
    if (!eventId || !ticketTypeId || !quantity || !amount || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    await connectDB();

    // ============================================================
    // 1. Find or create user
    // ============================================================
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
    } else {
      console.log(`📝 Found existing user: ${user._id}`);
    }

    // ============================================================
    // 2. Get event
    // ============================================================
    const event = await Event.findById(eventId).lean();
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // ============================================================
    // 3. Process ticket type
    // ============================================================
    let realTicketTypeId: mongoose.Types.ObjectId | null = null;
    let ticketType: any = null;
    let isVirtual = false;
    const isVirtualTicket = ticketTypeId.toString().startsWith('virtual_');

    if (!isVirtualTicket && mongoose.Types.ObjectId.isValid(ticketTypeId)) {
      realTicketTypeId = new mongoose.Types.ObjectId(ticketTypeId);
      ticketType = await TicketType.findById(realTicketTypeId);
      if (!ticketType) {
        return NextResponse.json(
          { error: 'Ticket type not found' },
          { status: 404 }
        );
      }
      const available = ticketType.maxSupply - ticketType.currentSupply;
      if (available < quantity) {
        return NextResponse.json(
          { error: `Only ${available} tickets available` },
          { status: 400 }
        );
      }
    } else {
      isVirtual = true;
      realTicketTypeId = event._id as mongoose.Types.ObjectId;
    }

    // ============================================================
    // 4. Calculate final amount with discount
    // ============================================================
    let finalAmount = amount;
    let discountInfo: { codeId: any; code: string; percent: number; amount: number } | null = null;

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

    // ============================================================
    // 5. Generate payment ID and reference
    // ============================================================
    const paymentId = generatePaymentId();
    const shortRef = paymentId.replace('0x', '').slice(0, 16);
    const fullReference = `CACK-${shortRef}`;

    console.log('📝 Generated paymentId:', paymentId);
    console.log('📝 Generated reference:', fullReference);

    // ============================================================
    // 6. Initialize payment on Arc blockchain
    // ============================================================
    console.log('⛓️ Initializing payment on Arc blockchain...');
    const privateKey = process.env.GASLESS_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: 'Gasless private key not configured' },
        { status: 500 }
      );
    }

    const onChainResult = await initializeOnChainPayment(
      paymentId,
      finalAmount,
      fullReference,
      eventId,
      quantity,
      privateKey
    );

    if (!onChainResult.success) {
      return NextResponse.json(
        {
          error: 'Failed to initialize on-chain payment',
          details: onChainResult.error,
        },
        { status: 500 }
      );
    }

    console.log('✅ On-chain payment initialized:', onChainResult.transactionHash);

    // ============================================================
    // 7. Create Order
    // ============================================================
    const order = await Order.create({
      userId: user._id,
      eventId,
      ticketTypeId: realTicketTypeId,
      quantity,
      totalAmount: finalAmount,
      originalAmount: originalAmount || amount,
      paymentMethod: 'arc_usdc',
      paymentStatus: 'pending',
      paymentReference: fullReference,
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

    console.log('✅ Order created:', order._id.toString());

    // ============================================================
    // 8. Create Payment — COMPLETE, no placeholders
    // ============================================================
    const paymentDoc = await Payment.create({
      paymentMethod: 'arc_usdc',
      userId: user._id,
      eventId,
      amount: finalAmount,                          // USDC
      originalAmount: originalAmount || amount,     // NGN
      quantity,
      ticketTypeId: realTicketTypeId,

      // Fields required by verify route
      paymentStatus: 'pending',
      paymentReference: fullReference,
      customerEmail: email,
      customerName: userName || email.split('@')[0] || 'User',

      // Metadata required by verify + email
      metadata: {
        orderId: order._id,
        onChainPaymentId: paymentId,
        transactionHash: onChainResult.transactionHash,
        blockNumber: onChainResult.blockNumber,
        userName: userName || email.split('@')[0] || 'User',
        userEmail: email,
        email: email,
        isVirtual,
        ticketName: ticketType?.name || 'General Admission',
        eventTitle: event.title,
        eventVenue: event.venue || 'Online Event',
        eventStartDate: event.startDate,
        eventEndDate: event.endDate,
        discountCode: discountInfo?.code || null,
        discountPercent: discountInfo?.percent || null,
        discountAmount: discountInfo?.amount || null,
        isGuest: isGuest || false,
        usdcAmount: finalAmount,
        ngnAmount: originalAmount || amount,
        exchangeRate: NGN_PER_USDC,
      },
    });

    console.log('✅ Payment record created:', {
      _id: paymentDoc._id.toString(),
      reference: paymentDoc.paymentReference,
      customerEmail: paymentDoc.customerEmail,
      onChainPaymentId: paymentDoc.metadata?.onChainPaymentId,
      orderId: paymentDoc.metadata?.orderId?.toString(),
    });

    // ============================================================
    // 9. Sanity check — confirm the record is findable by reference
    // ============================================================
    const verify = await Payment.findOne({ paymentReference: fullReference }).lean();
    if (!verify) {
      console.error('❌ CRITICAL: Payment record not findable after create!');
    } else {
      console.log('✅ Sanity check passed - payment findable by reference');
    }

    console.log(
      `✅ Payment initialized. Reference: ${fullReference}, Amount: ${finalAmount}, Email: ${email}`
    );

    return NextResponse.json({
      success: true,
      paymentId: paymentId,
      reference: fullReference,
      amount: finalAmount,
      message: 'Payment initialized. Please approve the USDC transaction.',
      onChain: {
        transactionHash: onChainResult.transactionHash,
        blockNumber: onChainResult.blockNumber,
      },
    });
  } catch (error: any) {
    console.error('❌ Arc payment initialization error:', error);
    return NextResponse.json(
      {
        error: 'Payment initialization failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}