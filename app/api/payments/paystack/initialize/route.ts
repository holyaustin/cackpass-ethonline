// app/api/payments/paystack/initialize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { Payment, TicketType, Order, Event, User, DiscountCode } from '@/lib/database/models';
import mongoose from 'mongoose';

// Helper: fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const {
      eventId,
      ticketTypeId,
      quantity,
      amount,
      email,
      userName,
      discountCode,
    } = await request.json();

    console.log('📝 Initialize Payment Request:', {
      eventId,
      ticketTypeId,
      quantity,
      amount,
      email,
      userName,
      discountCode,
    });

    if (!eventId || !ticketTypeId || !quantity || !amount || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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
      });
      console.log(`📝 Created new user for email: ${email} with ID: ${user._id}`);
    } else {
      console.log(`📝 Found existing user: ${user._id}`);
    }

    // 2. Get event data
    const event = await Event.findById(eventId).lean();
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    console.log(`📋 Event: ${event.title}, isFree: ${event.isFree}, price: ${event.price}`);

    // 3. Determine ticket type (real or virtual)
    let ticketPrice = amount / quantity;
    let ticketName = 'Ticket';
    let isVirtual = false;
    let realTicketTypeId = null;
    let ticketType = null;

    const isVirtualTicket = ticketTypeId.toString().startsWith('virtual_');

    if (!isVirtualTicket && mongoose.Types.ObjectId.isValid(ticketTypeId)) {
      realTicketTypeId = new mongoose.Types.ObjectId(ticketTypeId);
      ticketType = await TicketType.findById(realTicketTypeId);
      if (!ticketType) {
        return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 });
      }
      const available = ticketType.maxSupply - ticketType.currentSupply;
      if (available < quantity) {
        return NextResponse.json({ error: `Only ${available} tickets available for ${ticketType.name}` }, { status: 400 });
      }
      ticketPrice = ticketType.price;
      ticketName = ticketType.name;
      // Reserve tickets (will be committed after payment)
      ticketType.currentSupply += quantity;
      await ticketType.save();
    } else {
      isVirtual = true;
      ticketPrice = event.isFree ? 0 : event.price;
      ticketName = event.isFree ? 'Free Admission' : 'General Admission';
      realTicketTypeId = event._id;
    }

    const originalAmount = ticketPrice * quantity;
    let finalAmount = originalAmount;
    let discountInfo = null;

    // 4. Apply discount BEFORE amount check
    if (discountCode) {
      const discount = await DiscountCode.findOne({
        code: discountCode.toUpperCase(),
        eventId,
        isActive: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      });
      if (!discount) {
        if (!isVirtual && ticketType) {
          ticketType.currentSupply -= quantity;
          await ticketType.save();
        }
        return NextResponse.json({ error: 'Invalid or expired discount code' }, { status: 400 });
      }

      const remainingUses = discount.maxUses - discount.usedCount;
      if (remainingUses < quantity) {
        if (!isVirtual && ticketType) {
          ticketType.currentSupply -= quantity;
          await ticketType.save();
        }
        return NextResponse.json({ error: `Discount code can only be used for ${remainingUses} more ticket(s)` }, { status: 400 });
      }

      const discountAmountValue = (originalAmount * discount.discountPercent) / 100;
      finalAmount = originalAmount - discountAmountValue;

      discountInfo = {
        codeId: discount._id,
        code: discount.code,
        percent: discount.discountPercent,
        amount: discountAmountValue,
      };
      console.log(`💰 Discount applied: ${discount.code} (${discount.discountPercent}%) – new amount: ${finalAmount}`);

      // Compare final discounted amount with what frontend sent
      if (Math.abs(finalAmount - amount) > 0.01) {
        if (!isVirtual && ticketType) {
          ticketType.currentSupply -= quantity;
          await ticketType.save();
        }
        return NextResponse.json({ error: `Discount amount mismatch. Expected: ${finalAmount.toFixed(2)}` }, { status: 400 });
      }
    } else {
      // No discount: original amount must match frontend amount
      if (Math.abs(originalAmount - amount) > 0.01) {
        if (!isVirtual && ticketType) {
          ticketType.currentSupply -= quantity;
          await ticketType.save();
        }
        return NextResponse.json({ error: `Amount mismatch. Expected: ${originalAmount.toFixed(2)}` }, { status: 400 });
      }
    }

    // 5. Create Paystack reference
    const reference = `CACK-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    // 6. Initialize Paystack with timeout
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      console.error('❌ PAYSTACK_SECRET_KEY is not set in environment');
      return NextResponse.json({ error: 'Payment service misconfigured' }, { status: 500 });
    }

    console.log(`⏳ Contacting Paystack API... (timeout: 30s)`);
    let paystackResponse;
    try {
      paystackResponse = await fetchWithTimeout(
        'https://api.paystack.co/transaction/initialize',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            amount: Math.round(finalAmount * 100),
            currency: 'NGN',
            reference,
            callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?reference=${reference}`,
            metadata: {
              eventId,
              ticketTypeId: realTicketTypeId?.toString(),
              quantity,
              userName,
              isVirtual,
              userEmail: email,
              userId: user._id.toString(),
              discountCode: discountInfo?.code || null,
              discountPercent: discountInfo?.percent || null,
              discountAmount: discountInfo?.amount || null,
              custom_fields: [
                { display_name: 'Event', variable_name: 'event', value: event.title },
                { display_name: 'Ticket Type', variable_name: 'ticket_type', value: ticketName },
                { display_name: 'Quantity', variable_name: 'quantity', value: quantity.toString() },
              ],
            },
          }),
        },
        30000 // 30 seconds timeout
      );
    } catch (fetchError: any) {
      console.error('❌ Paystack network error:', fetchError.message);
      // Rollback ticket supply
      if (!isVirtual && ticketType) {
        ticketType.currentSupply -= quantity;
        await ticketType.save();
      }
      return NextResponse.json(
        { error: 'Payment service is currently unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      if (!isVirtual && ticketType) {
        ticketType.currentSupply -= quantity;
        await ticketType.save();
      }
      console.error('❌ Paystack API error:', paystackData);
      return NextResponse.json({ error: paystackData.message || 'Payment initialization failed' }, { status: 400 });
    }

    // 7. Create Order and Payment records
    const order = await Order.create({
      userId: user._id,
      eventId,
      ticketTypeId: realTicketTypeId,
      quantity,
      totalAmount: finalAmount,
      originalAmount,
      paymentMethod: 'paystack',
      paymentStatus: 'pending',
      paymentReference: reference,
      customerEmail: email,
      customerName: userName || email.split('@')[0],
      metadata: {
        isVirtual,
        ticketName,
        eventTitle: event.title,
        discountCode: discountInfo?.code || null,
        discountPercent: discountInfo?.percent || null,
        discountAmount: discountInfo?.amount || null,
      },
    });

    await Payment.create({
      paymentMethod: 'paystack',
      userId: user._id,
      eventId,
      amount: finalAmount,
      originalAmount,
      quantity,
      ticketTypeId: realTicketTypeId,
      paymentStatus: 'pending',
      paymentReference: reference,
      customerEmail: email,
      metadata: {
        orderId: order._id,
        userName: userName || email.split('@')[0],
        isVirtual,
        eventTitle: event.title,
        ticketName,
        eventVenue: event.venue || 'Online Event',
        eventStartDate: event.startDate,
        eventEndDate: event.endDate,
        discountCode: discountInfo?.code || null,
        discountPercent: discountInfo?.percent || null,
        discountAmount: discountInfo?.amount || null,
      },
    });

    console.log(`✅ Payment initialized. Reference: ${reference}, Amount: ${finalAmount} (original: ${originalAmount})`);

    return NextResponse.json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      reference,
      access_code: paystackData.data.access_code,
    });
  } catch (error: any) {
    console.error('❌ Paystack initialization error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}