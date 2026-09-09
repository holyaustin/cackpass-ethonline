// app/api/payments/arc/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { Payment, Order, MyTicket, TicketType, Event, User, DiscountCode } from '@/lib/database/models';
import { getOnChainPayment, confirmOnChainPayment } from '@/lib/arc/client';
import { sendTicketConfirmationEmail } from '@/lib/email/ticket-confirmation';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

// Email sending function (same as Flutterwave)
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
  tickets: Array<{ ticketNumber: string; qrCode?: string }>;
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

  // Generate QR codes
  const qrCodes: string[] = [];
  for (const ticket of params.tickets) {
    try {
      const qrData = JSON.stringify({
        ticketNumber: ticket.ticketNumber,
        eventTitle: params.eventTitle,
        ticketCount: params.ticketCount,
        email: params.email,
        date: formattedDate,
        venue: params.venue,
        reference: params.reference
      });
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: { dark: '#D95427', light: '#ffffff' }
      });
      qrCodes.push(qrCodeDataUrl);
    } catch (qrError) {
      console.error('QR code generation failed:', qrError);
      qrCodes.push('');
    }
  }

  const ticketsHtml = params.tickets.map((ticket, index) => `
    <div class="ticket-item" style="margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px;">
      <h3 style="color: #D95427; margin-bottom: 10px;">Ticket #${index + 1}</h3>
      <div class="ticket-detail" style="margin-bottom: 10px;">
        <span class="label" style="font-weight: 600;">Ticket ID:</span>
        <span class="value">${ticket.ticketNumber}</span>
      </div>
      <div class="qr-code" style="text-align: center; margin: 15px 0;">
        ${qrCodes[index] ? `<img src="${qrCodes[index]}" alt="Ticket QR Code" style="max-width: 180px; height: auto;" />` : ''}
        <p style="margin-top: 10px; font-size: 12px; color: #6c757d;">
          Scan this QR code at the event entrance
        </p>
      </div>
    </div>
  `).join('');

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Your Tickets - CACK-pass</title>
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
        .button { display: inline-block; background: linear-gradient(135deg, #D95427 0%, #B8431F 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: 600; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #6c757d; border-top: 1px solid #dee2e6; margin-top: 20px; }
        .info-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 8px; }
        .info-box h4 { margin: 0 0 10px 0; color: #856404; }
        .info-box ul { margin: 0; padding-left: 20px; color: #856404; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎫 Your Tickets are Ready!</h1>
          <p>Thank you for your purchase</p>
        </div>
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
          <h3 style="margin-top: 30px;">Your Digital Tickets</h3>
          <p>Each ticket has its own QR code. Please keep them safe.</p>
          ${ticketsHtml}
          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tickets" class="button">
              View My Tickets
            </a>
          </div>
          <div class="info-box">
            <h4>⚠️ Important Information</h4>
            <ul>
              <li>Please arrive at least 30 minutes before the event starts</li>
              <li>Show your QR code at the entrance (digital or printed)</li>
              <li>Each ticket must be scanned separately for entry</li>
            </ul>
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} CACK-pass. All rights reserved.</p>
          <p>Need help? Contact us at <a href="mailto:support@cackpass.com">support@cackpass.com</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  const transporter = getTransporter();
  const mailOptions = {
    from: `"CACK-pass" <${gmailUser}>`,
    to: params.email,
    subject: `🎫 Your Tickets for ${params.eventTitle} - CACK-pass`,
    html: emailHtml,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');
    const usdcTxHash = searchParams.get('transaction_id'); // USDC transfer hash from App Kits

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    console.log(`\n🔍 ========== VERIFYING ARC PAYMENT: ${reference} ==========`);

    await connectDB();

    // 1. Find payment record
    let payment = await Payment.findOne({ paymentReference: reference });
    if (!payment) {
      console.error(`❌ Payment record not found for reference: ${reference}`);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Skip if already completed
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
        userEmail: payment.customerEmail,
        event: {
          ticketsSold: 0,
          capacity: 0
        }
      });
    }

    // 2. Get on-chain payment status
    const paymentId = payment.metadata?.onChainPaymentId;
    if (!paymentId) {
      console.error(`❌ No on-chain payment ID found for reference: ${reference}`);
      return NextResponse.json({ error: 'Invalid payment data' }, { status: 400 });
    }

    const onChainPayment = await getOnChainPayment(paymentId);
    if (!onChainPayment.success) {
      console.error(`❌ Failed to get on-chain payment:`, onChainPayment.error);
      return NextResponse.json({ 
        error: 'Failed to verify payment on-chain',
        details: onChainPayment.error,
      }, { status: 500 });
    }

    console.log(`📊 On-chain payment status: ${onChainPayment.payment.status}`);

    // 3. If payment is still pending and we have the USDC tx hash, confirm it
    if (onChainPayment.payment.status === 'pending' && usdcTxHash) {
      console.log(`⏳ Payment is pending, confirming with USDC tx: ${usdcTxHash}`);
      
      const privateKey = process.env.GASLESS_PRIVATE_KEY;
      if (privateKey) {
        const confirmResult = await confirmOnChainPayment(
          paymentId, 
          usdcTxHash, 
          privateKey
        );
        if (confirmResult.success) {
          console.log(`✅ Payment confirmed on-chain: ${confirmResult.transactionHash}`);
          // Refresh payment data
          const updatedPayment = await getOnChainPayment(paymentId);
          if (updatedPayment.success) {
            onChainPayment.payment = updatedPayment.payment;
          }
        } else {
          console.error(`❌ Failed to confirm payment:`, confirmResult.error);
        }
      }
    }

    // 4. Check if payment is confirmed
    if (onChainPayment.payment.status !== 'confirmed') {
      console.error(`❌ Payment not confirmed. Status: ${onChainPayment.payment.status}`);
      return NextResponse.json({ 
        error: 'Payment not confirmed',
        status: onChainPayment.payment.status,
      }, { status: 400 });
    }

    console.log(`✅ Payment confirmed on-chain with proof: ${onChainPayment.payment.txHash}`);

    // 5. Get user and event
    let userEmail = payment.customerEmail || '';
    let userName = payment.metadata?.userName || userEmail.split('@')[0] || 'User';

    const event = await Event.findById(payment.eventId);
    if (!event) {
      console.error(`❌ Event not found: ${payment.eventId}`);
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // 6. Update payment status
    payment.paymentStatus = 'completed';
    payment.transactionHash = onChainPayment.payment.txHash || reference;
    await payment.save();
    console.log(`✅ Payment marked as completed`);

    // 7. Update order
    const order = await Order.findById(payment.metadata?.orderId);
    if (order) {
      order.paymentStatus = 'paid';
      await order.save();
      console.log(`✅ Order marked as paid`);
    }

    // 8. Increment discount code usage
    if (payment.metadata?.discountCode) {
      const discount = await DiscountCode.findOne({
        code: payment.metadata.discountCode.toUpperCase(),
        eventId: payment.eventId,
      });
      if (discount) {
        discount.usedCount += payment.quantity;
        await discount.save();
        console.log(`✅ Discount code ${discount.code} used count increased to ${discount.usedCount}/${discount.maxUses}`);
      }
    }

    // 9. Get ticket type
    let ticketType = null;
    if (payment.ticketTypeId && !payment.metadata?.isVirtual) {
      ticketType = await TicketType.findById(payment.ticketTypeId);
    }

    // 10. Update ticketsSold
    await Event.updateOne(
      { _id: payment.eventId },
      { $inc: { ticketsSold: payment.quantity } }
    );
    
    const updatedEvent = await Event.findById(payment.eventId);
    console.log(`✅ ticketsSold updated to: ${updatedEvent?.ticketsSold}`);

    // 11. Create tickets
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
          customerName: userName,
          metadata: {
            arcPayment: true,
            onChainPaymentId: paymentId,
            transactionHash: onChainPayment.payment.txHash,
          }
        });
        tickets.push(ticket);
      }
      console.log(`✅ Created ${tickets.length} tickets`);
    } else {
      tickets = existingTickets;
      console.log(`✅ Using ${existingTickets.length} existing tickets`);
    }

    // 12. Send email
    let emailSent = false;
    
    if (userEmail && !payment.metadata?.emailSent) {
      console.log(`\n📧 ========== SENDING EMAIL ==========`);
      console.log(`📧 To: ${userEmail}`);
      console.log(`📧 Event: ${event.title}`);
      
      try {
        const emailTickets = tickets.map((t: any) => ({
          ticketNumber: t.ticketNumber,
          qrCode: t.qrCode || '',
        }));

        await sendTicketConfirmationEmail({
          email: userEmail,
          name: userName || userEmail.split('@')[0] || 'User',
          eventTitle: event.title,
          eventDate: event.startDate?.toISOString(),
          venue: event.venue || 'Online Event',
          ticketCount: payment.quantity,
          ticketType: ticketType?.name || payment.metadata?.ticketName || 'General Admission',
          amount: payment.amount,
          reference: reference,
          tickets: emailTickets,
        });
        
        console.log(`✅ Email sent successfully to ${userEmail}`);
        emailSent = true;
        payment.metadata.emailSent = true;
        await payment.save();
        
      } catch (emailError: any) {
        console.error(`❌ EMAIL FAILED:`, emailError.message);
        emailSent = false;
      }
    }

    const finalEvent = await Event.findById(payment.eventId);
    const finalTicketsSold = finalEvent?.ticketsSold || 0;

    console.log(`\n🎉 ========== PAYMENT COMPLETE ==========`);
    console.log(`✅ Reference: ${reference}`);
    console.log(`✅ Tickets: ${tickets.length}`);
    console.log(`✅ Email: ${emailSent ? 'SENT ✅' : 'FAILED ❌'}`);
    console.log(`✅ On-chain proof: ${onChainPayment.payment.txHash}`);
    console.log(`📊 ticketsSold: ${finalTicketsSold}/${finalEvent?.capacity || 'unlimited'}`);
    console.log(`========================================\n`);

    return NextResponse.json({
      success: true,
      tickets: tickets.map((t: any) => ({ 
        ticketId: t.ticketNumber,
        ticketNumber: t.ticketNumber 
      })),
      emailSent: emailSent,
      amount: payment.amount,
      userEmail: userEmail,
      transactionHash: onChainPayment.payment.txHash,
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