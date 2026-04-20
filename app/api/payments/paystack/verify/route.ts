// app/api/payments/paystack/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { Payment, Order, MyTicket, TicketType, Event, User, DiscountCode } from '@/lib/database/models';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

// Create transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      throw new Error('Missing Gmail credentials');
    }

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }
  return transporter;
}

// Email sending function
async function sendTicketConfirmationEmail(params: {
  email: string;
  name: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  ticketCount: number;
  ticketType: string;
  amount: number;
  reference: string;
}) {
  const gmailUser = process.env.GMAIL_USER;

  if (!gmailUser) {
    throw new Error('Missing Gmail credentials');
  }

  const formattedDate = params.eventDate ? new Date(params.eventDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Date to be announced';

  const formattedTime = params.eventDate ? new Date(params.eventDate).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  }) : 'Time to be announced';

  let qrCodeDataUrl = '';
  try {
    const qrData = JSON.stringify({
      reference: params.reference,
      eventTitle: params.eventTitle,
      ticketCount: params.ticketCount,
      email: params.email,
      date: formattedDate,
      venue: params.venue
    });
    
    qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 2,
      color: {
        dark: '#D95427',
        light: '#ffffff'
      }
    });
  } catch (qrError) {
    console.error('QR code generation failed:', qrError);
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Your Ticket - CACK-pass</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #D95427 0%, #B8431F 100%); border-radius: 12px 12px 0 0; color: white; margin: -20px -20px 0 -20px; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px 20px; }
        .ticket-card { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #D95427; }
        .ticket-detail { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #dee2e6; }
        .ticket-detail:last-child { border-bottom: none; }
        .label { font-weight: 600; color: #495057; }
        .value { color: #212529; }
        .qr-code { text-align: center; margin: 20px 0; padding: 20px; background: white; border-radius: 12px; }
        .qr-code img { max-width: 200px; height: auto; }
        .button { display: inline-block; background: linear-gradient(135deg, #D95427 0%, #B8431F 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: 600; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #6c757d; border-top: 1px solid #dee2e6; margin-top: 20px; }
        .info-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 8px; }
        .info-box h4 { margin: 0 0 10px 0; color: #856404; }
        .info-box ul { margin: 0; padding-left: 20px; color: #856404; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>🎫 Your Ticket is Ready!</h1><p>Thank you for your purchase</p></div>
        <div class="content">
          <h2>Hello ${params.name}! 👋</h2>
          <p>Your ticket${params.ticketCount > 1 ? 's have' : ' has'} been successfully booked. Here are your event details:</p>
          <div class="ticket-card">
            <div class="ticket-detail"><span class="label">🎪 Event:</span><span class="value"><strong>${params.eventTitle}</strong></span></div>
            <div class="ticket-detail"><span class="label">📅 Date:</span><span class="value">${formattedDate}</span></div>
            <div class="ticket-detail"><span class="label">⏰ Time:</span><span class="value">${formattedTime}</span></div>
            <div class="ticket-detail"><span class="label">📍 Venue:</span><span class="value">${params.venue || 'Online Event'}</span></div>
            <div class="ticket-detail"><span class="label">🎟️ Ticket Type:</span><span class="value">${params.ticketType}</span></div>
            <div class="ticket-detail"><span class="label">🔢 Quantity:</span><span class="value">${params.ticketCount} ticket${params.ticketCount > 1 ? 's' : ''}</span></div>
            <div class="ticket-detail"><span class="label">💰 Amount Paid:</span><span class="value">₦${params.amount.toLocaleString()}</span></div>
            <div class="ticket-detail"><span class="label">🆔 Reference:</span><span class="value">${params.reference}</span></div>
          </div>
          ${qrCodeDataUrl ? `<div class="qr-code"><h3>Your Digital Ticket</h3><img src="${qrCodeDataUrl}" alt="Ticket QR Code" /><p>Scan this QR code at the event entrance</p></div>` : ''}
          <div style="text-align: center;"><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tickets" class="button">View My Tickets</a></div>
          <div class="info-box"><h4>⚠️ Important Information</h4><ul><li>Please arrive at least 30 minutes before the event starts</li><li>Bring a valid ID matching the name on the ticket</li><li>Show your QR code at the entrance</li></ul></div>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} CACK-pass. All rights reserved.</p><p>Need help? Contact us at <a href="mailto:support@cackpass.com">support@cackpass.com</a></p></div>
      </div>
    </body>
    </html>
  `;

  const transporter = getTransporter();
  const mailOptions = {
    from: `"CACK-pass" <${gmailUser}>`,
    to: params.email,
    subject: `🎫 Your Ticket for ${params.eventTitle} - CACK-pass`,
    html: emailHtml,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    console.log(`\n🔍 ========== VERIFYING PAYMENT: ${reference} ==========`);

    // 1. Verify with Paystack
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { 'Authorization': `Bearer ${paystackSecretKey}` } }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyData.status || verifyData.data.status !== 'success') {
      console.error(`❌ Payment not successful:`, verifyData.data?.status);
      return NextResponse.json({ 
        error: 'Payment not successful', 
        status: verifyData.data?.status 
      }, { status: 400 });
    }

    console.log(`✅ Paystack verification successful`);

    // 2. Connect to DB
    await connectDB();

    // 3. Find payment
    const payment = await Payment.findOne({ paymentReference: reference });
    if (!payment) {
      console.error(`❌ Payment record not found for reference: ${reference}`);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    console.log(`📝 Payment found:`, {
      status: payment.paymentStatus,
      userId: payment.userId,
      amount: payment.amount,
      quantity: payment.quantity,
      discountCode: payment.metadata?.discountCode,
    });

    // 4. Get user email from User collection
    let userEmail = '';
    let userName = '';
    if (payment.userId) {
      const user = await User.findById(payment.userId);
      if (user && user.email) {
        userEmail = user.email;
        userName = user.email.split('@')[0];
        console.log(`✅ Found user email: ${userEmail}`);
      }
    }

    // 5. Get event
    const event = await Event.findById(payment.eventId);
    if (!event) {
      console.error(`❌ Event not found for ID: ${payment.eventId}`);
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // 6. If already completed, return existing tickets with correct email status
    if (payment.paymentStatus === 'completed') {
      console.log(`⚠️ Payment already processed - returning existing data`);
      const tickets = await MyTicket.find({ orderId: payment.metadata?.orderId });
      const wasEmailSent = payment.metadata?.emailSent === true;
      
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        tickets: tickets.map((t: any) => ({ ticketId: t.ticketNumber })),
        emailSent: wasEmailSent,
        amount: payment.amount,
        userEmail: userEmail,
        event: {
          ticketsSold: event.ticketsSold || 0,
          capacity: event.capacity
        }
      });
    }

    // 7. Update payment status
    payment.paymentStatus = 'completed';
    payment.transactionHash = verifyData.data.reference;
    await payment.save();
    console.log(`✅ Payment marked as completed`);

    // 8. Update order
    const order = await Order.findById(payment.metadata?.orderId);
    if (order) {
      order.paymentStatus = 'paid';
      await order.save();
      console.log(`✅ Order marked as paid`);
    }

    // 9. Increment discount code usage if applicable
    if (payment.metadata?.discountCode) {
      const discount = await DiscountCode.findOne({
        code: payment.metadata.discountCode.toUpperCase(),
        eventId: payment.eventId,
      });
      if (discount) {
        discount.usedCount += payment.quantity;
        await discount.save();
        console.log(`✅ Discount code ${discount.code} used count increased to ${discount.usedCount}/${discount.maxUses}`);
      } else {
        console.warn(`⚠️ Discount code ${payment.metadata.discountCode} not found in database, cannot increment.`);
      }
    }

    // 10. Get ticket type info
    let ticketType = null;
    if (payment.ticketTypeId && !payment.metadata?.isVirtual) {
      ticketType = await TicketType.findById(payment.ticketTypeId);
    }

    // 11. Update ticketsSold
    console.log(`\n📊 Updating ticketsSold...`);
    await Event.updateOne(
      { _id: payment.eventId },
      { $inc: { ticketsSold: payment.quantity } }
    );
    
    const updatedEvent = await Event.findById(payment.eventId);
    console.log(`✅ ticketsSold updated to: ${updatedEvent?.ticketsSold}`);

    // 12. Create tickets
    let tickets = [];
    const existingTickets = await MyTicket.find({ orderId: order?._id });
    
    if (existingTickets.length === 0) {
      console.log(`🎫 Creating ${payment.quantity} tickets...`);
      for (let i = 0; i < payment.quantity; i++) {
        const ticket = await MyTicket.create({
          orderId: order?._id,
          userId: payment.userId,
          eventId: payment.eventId,
          ticketTypeId: payment.ticketTypeId,
          ticketNumber: `${reference}-${i + 1}`,
          status: 'active',
          customerEmail: userEmail,
          customerName: userName
        });
        tickets.push(ticket);
      }
      console.log(`✅ Created ${tickets.length} tickets`);
    } else {
      tickets = existingTickets;
      console.log(`✅ Using ${existingTickets.length} existing tickets`);
    }

    // 13. SEND EMAIL - NOW BEFORE RESPONSE, and wait for it
    let emailSent = false;
    
    if (userEmail && !payment.metadata?.emailSent) {
      console.log(`\n📧 ========== SENDING EMAIL ==========`);
      console.log(`📧 To: ${userEmail}`);
      console.log(`📧 Event: ${event.title}`);
      
      try {
        await sendTicketConfirmationEmail({
          email: userEmail,
          name: userName,
          eventTitle: event.title,
          eventDate: event.startDate,
          venue: event.venue || 'Online Event',
          ticketCount: payment.quantity,
          ticketType: ticketType?.name || payment.metadata?.ticketName || 'General Admission',
          amount: payment.amount,
          reference: reference
        });
        
        console.log(`✅ Email sent successfully to ${userEmail}`);
        emailSent = true;
        payment.metadata.emailSent = true;
        await payment.save();
        
      } catch (emailError: any) {
        console.error(`❌ EMAIL FAILED:`, emailError.message);
        emailSent = false;
      }
    } else if (payment.metadata?.emailSent) {
      console.log(`📧 Email already sent previously`);
      emailSent = true;
    }

    const finalEvent = await Event.findById(payment.eventId);
    const finalTicketsSold = finalEvent?.ticketsSold || 0;

    console.log(`\n🎉 ========== PAYMENT COMPLETE ==========`);
    console.log(`✅ Reference: ${reference}`);
    console.log(`✅ Tickets: ${tickets.length}`);
    console.log(`✅ Email: ${emailSent ? 'SENT' : 'FAILED'}`);
    console.log(`📊 ticketsSold: ${finalTicketsSold}/${finalEvent?.capacity}`);
    console.log(`========================================\n`);

    // Return response AFTER email is sent
    return NextResponse.json({
      success: true,
      tickets: tickets.map((t: any) => ({ ticketId: t.ticketNumber })),
      emailSent: emailSent,
      amount: payment.amount,
      userEmail: userEmail,
      event: {
        ticketsSold: finalTicketsSold,
        capacity: finalEvent?.capacity
      }
    });

  } catch (error: any) {
    console.error('❌ VERIFY ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}