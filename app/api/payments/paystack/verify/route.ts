import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { Payment, Order, MyTicket, TicketType, Event } from '@/lib/database/models';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

// Email sending function (extracted from your email endpoint)
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
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    throw new Error('Missing Gmail credentials');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  // Format date
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

  // Generate QR code
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
    console.error('❌ QR code generation failed:', qrError);
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Your Ticket - CACK-pass</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding: 30px 20px;
          background: linear-gradient(135deg, #D95427 0%, #B8431F 100%);
          border-radius: 12px 12px 0 0;
          color: white;
          margin: -20px -20px 0 -20px;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .content {
          padding: 30px 20px;
        }
        .ticket-card {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #D95427;
        }
        .ticket-detail {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #dee2e6;
        }
        .ticket-detail:last-child {
          border-bottom: none;
        }
        .label {
          font-weight: 600;
          color: #495057;
        }
        .value {
          color: #212529;
        }
        .qr-code {
          text-align: center;
          margin: 20px 0;
          padding: 20px;
          background: white;
          border-radius: 12px;
        }
        .qr-code img {
          max-width: 200px;
          height: auto;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #D95427 0%, #B8431F 100%);
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 8px;
          margin-top: 20px;
          font-weight: 600;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #6c757d;
          border-top: 1px solid #dee2e6;
          margin-top: 20px;
        }
        .info-box {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 8px;
        }
        .info-box h4 {
          margin: 0 0 10px 0;
          color: #856404;
        }
        .info-box ul {
          margin: 0;
          padding-left: 20px;
          color: #856404;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎫 Your Ticket is Ready!</h1>
          <p>Thank you for your purchase</p>
        </div>
        
        <div class="content">
          <h2>Hello ${params.name}! 👋</h2>
          <p>Your ticket${params.ticketCount > 1 ? 's have' : ' has'} been successfully booked. Here are your event details:</p>
          
          <div class="ticket-card">
            <div class="ticket-detail">
              <span class="label">🎪 Event:</span>
              <span class="value"><strong>${params.eventTitle}</strong></span>
            </div>
            <div class="ticket-detail">
              <span class="label">📅 Date:</span>
              <span class="value">${formattedDate}</span>
            </div>
            <div class="ticket-detail">
              <span class="label">⏰ Time:</span>
              <span class="value">${formattedTime}</span>
            </div>
            <div class="ticket-detail">
              <span class="label">📍 Venue:</span>
              <span class="value">${params.venue || 'Online Event'}</span>
            </div>
            <div class="ticket-detail">
              <span class="label">🎟️ Ticket Type:</span>
              <span class="value">${params.ticketType}</span>
            </div>
            <div class="ticket-detail">
              <span class="label">🔢 Quantity:</span>
              <span class="value">${params.ticketCount} ticket${params.ticketCount > 1 ? 's' : ''}</span>
            </div>
            <div class="ticket-detail">
              <span class="label">💰 Amount Paid:</span>
              <span class="value">₦${params.amount.toLocaleString()}</span>
            </div>
            <div class="ticket-detail">
              <span class="label">🆔 Reference:</span>
              <span class="value">${params.reference}</span>
            </div>
          </div>
          
          ${qrCodeDataUrl ? `
          <div class="qr-code">
            <h3 style="margin-bottom: 15px;">Your Digital Ticket</h3>
            <img src="${qrCodeDataUrl}" alt="Ticket QR Code" />
            <p style="margin-top: 15px; font-size: 12px; color: #6c757d;">
              Scan this QR code at the event entrance
            </p>
          </div>
          ` : ''}
          
          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tickets" class="button">
              View My Tickets
            </a>
          </div>
          
          <div class="info-box">
            <h4>⚠️ Important Information</h4>
            <ul>
              <li>Please arrive at least 30 minutes before the event starts</li>
              <li>Bring a valid ID matching the name on the ticket</li>
              <li>Show your QR code at the entrance (digital or printed)</li>
              <li>Tickets are non-transferable without prior authorization</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} CACK-pass. All rights reserved.</p>
          <p>Need help? Contact us at <a href="mailto:support@cackpass.com">support@cackpass.com</a></p>
          <p style="font-size: 11px;">This is an automated message, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"CACK-pass" <${gmailUser}>`,
    to: params.email,
    subject: `🎫 Your Ticket for ${params.eventTitle} - CACK-pass`,
    html: emailHtml,
  };

  console.log('📧 Sending email to:', params.email);
  const info = await transporter.sendMail(mailOptions);
  console.log('✅ Email sent successfully:', info.messageId);
  
  return info;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    console.log(`🔍 Verifying payment for reference: ${reference}`);

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

    console.log(`✅ Payment verified with Paystack for reference: ${reference}`);

    // 2. Connect to DB
    await connectDB();

    // 3. Find payment
    const payment = await Payment.findOne({ paymentReference: reference });
    if (!payment) {
      console.error(`❌ Payment record not found for reference: ${reference}`);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // 4. If already completed, return existing tickets (IDEMPOTENCY CHECK)
    if (payment.paymentStatus === 'completed') {
      console.log(`⚠️ Payment already processed for reference: ${reference}`);
      const tickets = await MyTicket.find({ orderId: payment.metadata?.orderId });
      const event = await Event.findById(payment.eventId);
      
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        tickets: tickets.map((t: any) => ({ ticketId: t.ticketNumber })),
        emailSent: payment.metadata?.emailSent || false,
        amount: payment.amount,
        event: {
          ticketsSold: event?.ticketsSold || 0,
          capacity: event?.capacity
        }
      });
    }

    // 5. START TRANSACTION - Update payment status FIRST to prevent race conditions
    payment.paymentStatus = 'completed';
    payment.transactionHash = verifyData.data.reference;
    await payment.save();
    console.log(`✅ Payment status updated to completed`);

    // 6. Get event with fresh data
    const event = await Event.findById(payment.eventId);
    if (!event) {
      console.error(`❌ Event not found for ID: ${payment.eventId}`);
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    console.log(`📋 Event: ${event.title}`);
    console.log(`   - ticketsSold BEFORE: ${event.ticketsSold || 0}`);
    console.log(`   - capacity: ${event.capacity || 'unlimited'}`);
    console.log(`   - unlimitedCapacity: ${event.unlimitedCapacity}`);

    // 7. Update order
    const order = await Order.findById(payment.metadata?.orderId);
    if (order) {
      order.paymentStatus = 'paid';
      await order.save();
      console.log(`✅ Order status updated to paid`);
    }

    // 8. Update ticket type supply (for non-virtual tickets)
    let ticketType = null;
    if (payment.ticketTypeId && !payment.metadata?.isVirtual) {
      ticketType = await TicketType.findById(payment.ticketTypeId);
      if (ticketType) {
        // Note: currentSupply was already updated in initialize endpoint
        console.log(`✅ Ticket type ${ticketType.name}: ${ticketType.currentSupply}/${ticketType.maxSupply}`);
      }
    }

    // 9. CRITICAL FIX: Update event ticketsSold using atomic increment
    // This prevents race conditions and ensures accurate counting
    if (!event.unlimitedCapacity) {
      const previousSold = event.ticketsSold || 0;
      
      // Use atomic $inc operation to prevent race conditions
      await Event.updateOne(
        { _id: payment.eventId },
        { $inc: { ticketsSold: payment.quantity } }
      );
      
      // Refresh event to get updated value
      await event.updateOne({ $inc: { ticketsSold: payment.quantity } });
      const updatedEvent = await Event.findById(payment.eventId);
      
      console.log(`✅ UPDATED Event ticketsSold: ${previousSold} + ${payment.quantity} = ${updatedEvent?.ticketsSold}/${event.capacity || 'N/A'}`);
    } else {
      console.log(`📝 Unlimited capacity event, no ticket count update needed`);
    }

    // 10. Create tickets if not already created
    let tickets = [];
    const existingTickets = await MyTicket.find({ orderId: order?._id });
    
    if (existingTickets.length === 0) {
      for (let i = 0; i < payment.quantity; i++) {
        const ticket = await MyTicket.create({
          orderId: order?._id,
          userId: payment.userId,
          eventId: payment.eventId,
          ticketTypeId: payment.ticketTypeId,
          ticketNumber: `${reference}-${i + 1}`,
          status: 'active',
          customerEmail: payment.customerEmail,
          customerName: payment.metadata?.userName
        });
        tickets.push(ticket);
      }
      console.log(`✅ Created ${payment.quantity} tickets for reference: ${reference}`);
    } else {
      tickets = existingTickets;
      console.log(`✅ Found existing ${tickets.length} tickets`);
    }

    // 11. Send email confirmation DIRECTLY (not via HTTP fetch)
    let emailSent = false;
    if (payment.customerEmail && event && !payment.metadata?.emailSent) {
      console.log(`📧 Sending ticket confirmation email to: ${payment.customerEmail}`);
      
      try {
        await sendTicketConfirmationEmail({
          email: payment.customerEmail,
          name: payment.metadata?.userName || payment.customerEmail.split('@')[0],
          eventTitle: event.title,
          eventDate: event.startDate,
          venue: event.venue,
          ticketCount: payment.quantity,
          ticketType: ticketType?.name || payment.metadata?.ticketName || 'General Admission',
          amount: payment.amount,
          reference: reference
        });
        
        console.log(`✅ Email sent to ${payment.customerEmail}`);
        emailSent = true;
        
        // Mark email as sent
        payment.metadata = payment.metadata || {};
        payment.metadata.emailSent = true;
        await payment.save();
        
      } catch (emailError) {
        console.error(`❌ Email sending failed:`, emailError);
        // Don't fail the entire request if email fails
      }
    }

    // Get final updated event data
    const finalEvent = await Event.findById(payment.eventId);

    console.log(`🎉 Payment processing completed for reference: ${reference}`);
    console.log(`📊 FINAL - Event ticketsSold: ${finalEvent?.ticketsSold || 0}/${finalEvent?.capacity || 'unlimited'}`);
    console.log(`📧 Email sent: ${emailSent}`);

    return NextResponse.json({
      success: true,
      tickets: tickets.map((t: any) => ({ ticketId: t.ticketNumber })),
      emailSent,
      amount: payment.amount,
      event: {
        ticketsSold: finalEvent?.ticketsSold || 0,
        capacity: finalEvent?.capacity
      }
    });

  } catch (error: any) {
    console.error('❌ Verify error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}