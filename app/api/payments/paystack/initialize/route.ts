import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { Payment, TicketType, Order, Event, User } from '@/lib/database/models';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    // Parse request
    const { eventId, ticketTypeId, quantity, amount, email, userName } = await request.json();

    console.log('📝 Initialize Payment Request:', { eventId, ticketTypeId, quantity, amount, email, userName });

    if (!eventId || !ticketTypeId || !quantity || !amount || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    await connectDB();
    
    // Find or create user by email
    let user = await User.findOne({ email: email });
    
    if (!user) {
      user = await User.create({
        email: email,
        loginMethod: 'email',
        privyId: `guest-${Date.now()}`,
        isOrganizer: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`📝 Created new user for email: ${email} with ID: ${user._id}`);
    } else {
      console.log(`📝 Found existing user for email: ${email} with ID: ${user._id}`);
    }
    
    // CRITICAL: Get fresh event data - use lean() to get plain object
    const event = await Event.findById(eventId).lean();
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    console.log(`📋 Event: ${event.title}`);
    console.log(`   - isFree: ${event.isFree}`);
    console.log(`   - price: ${event.price}`);
    console.log(`   - capacity: ${event.capacity}`);
    console.log(`   - unlimitedCapacity: ${event.unlimitedCapacity}`);
    console.log(`   - ticketsSold: ${event.ticketsSold || 0}`);
    
    let ticketPrice = amount / quantity;
    let ticketName = 'Ticket';
    let isVirtual = false;
    let realTicketTypeId = null;
    let ticketType = null;
    
    // Check if this is a virtual ticket (starts with "virtual_")
    const isVirtualTicket = ticketTypeId.toString().startsWith('virtual_');
    
    if (!isVirtualTicket && mongoose.Types.ObjectId.isValid(ticketTypeId)) {
      // Real ticket type from database
      realTicketTypeId = new mongoose.Types.ObjectId(ticketTypeId);
      ticketType = await TicketType.findById(realTicketTypeId);
      
      if (!ticketType) {
        return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 });
      }
      
      console.log(`🎫 Ticket Type: ${ticketType.name}`);
      console.log(`   - maxSupply: ${ticketType.maxSupply}`);
      console.log(`   - currentSupply: ${ticketType.currentSupply}`);
      console.log(`   - price: ${ticketType.price}`);
      
      // Check availability for real ticket type
      const available = ticketType.maxSupply - ticketType.currentSupply;
      if (available < quantity) {
        return NextResponse.json({ error: `Only ${available} tickets available for ${ticketType.name}` }, { status: 400 });
      }
      
      ticketPrice = ticketType.price;
      ticketName = ticketType.name;
      
      // Update ticket type supply
      ticketType.currentSupply += quantity;
      await ticketType.save();
      console.log(`✅ UPDATED: Ticket type ${ticketType.name} currentSupply: ${ticketType.currentSupply}/${ticketType.maxSupply}`);
      
    } else {
      // Virtual ticket - use event data
      isVirtual = true;
      ticketPrice = event.isFree ? 0 : event.price;
      ticketName = event.isFree ? 'Free Admission' : 'General Admission';
      realTicketTypeId = event._id;
      console.log(`🎫 Virtual ticket for event: ${event.title}, price: ${ticketPrice}`);
    }
    
    // DO NOT update ticketsSold here - only in verify endpoint
    // This prevents double counting and ensures consistency
    
    // Verify amount matches ticket price
    const expectedAmount = ticketPrice * quantity;
    if (Math.abs(amount - expectedAmount) > 0.01) {
      // Rollback if amount mismatch
      if (!isVirtual && ticketType) {
        ticketType.currentSupply -= quantity;
        await ticketType.save();
      }
      return NextResponse.json({ 
        error: `Amount mismatch. Expected: ${expectedAmount.toFixed(2)}` 
      }, { status: 400 });
    }

    // Create payment reference
    const reference = `CACK-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    // Initialize Paystack
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
          custom_fields: [
            { display_name: "Event", variable_name: "event", value: event.title },
            { display_name: "Ticket Type", variable_name: "ticket_type", value: ticketName },
            { display_name: "Quantity", variable_name: "quantity", value: quantity.toString() }
          ]
        }
      })
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      // Rollback on Paystack error
      if (!isVirtual && ticketType) {
        ticketType.currentSupply -= quantity;
        await ticketType.save();
      }
      return NextResponse.json({ error: paystackData.message }, { status: 400 });
    }

    // Create order
    const order = await Order.create({
      userId: user._id,
      eventId,
      ticketTypeId: realTicketTypeId,
      quantity,
      totalAmount: amount,
      paymentMethod: 'paystack',
      paymentStatus: 'pending',
      paymentReference: reference,
      customerEmail: email,
      customerName: userName || email.split('@')[0],
      metadata: {
        isVirtual,
        ticketName,
        eventTitle: event.title
      }
    });

    // Create payment record with complete metadata
// When creating payment record, ensure customerEmail is set
    await Payment.create({
      paymentMethod: 'paystack',
      userId: user._id,
      eventId,
      amount,
      quantity,
      ticketTypeId: realTicketTypeId,
      paymentStatus: 'pending',
      paymentReference: reference,
      customerEmail: email,  // CRITICAL: This must be set
      metadata: { 
        orderId: order._id, 
        userName: userName || email.split('@')[0],
        isVirtual,
        eventTitle: event.title,
        ticketName,
        eventVenue: event.venue || 'Online Event',
        eventStartDate: event.startDate,
        eventEndDate: event.endDate
      }
    });

    console.log(`✅ Payment initialized successfully. Reference: ${reference}`);
    console.log(`📧 Email will be sent to: ${email}`);

    return NextResponse.json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      reference,
      access_code: paystackData.data.access_code
    });

  } catch (error: any) {
    console.error('❌ Paystack error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}