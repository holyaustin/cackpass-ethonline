// app/api/payments/arc/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/database/connection';
import { Payment, Order, MyTicket, TicketType, Event, User, DiscountCode } from '@/lib/database/models';
import { getOnChainPayment, confirmOnChainPayment } from '@/lib/arc/client';
import { sendTicketConfirmationEmail } from '@/lib/email/ticket-confirmation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');
    const usdcTxHash = searchParams.get('transaction_id'); // USDC transfer hash from App Kits

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    console.log(`\n🔍 ========== VERIFYING ARC PAYMENT: ${reference} ==========`);
    console.log(`📝 USDC tx hash: ${usdcTxHash || 'none'}`);

    await connectDB();

    // ============================================================
    // 1. Multi-tier payment lookup
    // ============================================================
    let payment = await Payment.findOne({ paymentReference: reference });

    // ✅ FALLBACK 1: Look up by transaction hash in metadata
    if (!payment && usdcTxHash) {
      console.log(`🔎 Not found by reference, trying transaction hash lookup...`);
      payment = await Payment.findOne({
        $or: [
          { 'metadata.transactionHash': usdcTxHash },
          { 'metadata.usdcTxHash': usdcTxHash },
          { transactionHash: usdcTxHash },
        ],
      });

      if (payment) {
        console.log(
          `✅ Found payment via tx hash: reference=${payment.paymentReference}`
        );
      }
    }

    // ✅ FALLBACK 2: Look up any recent pending arc_usdc payment
    if (!payment) {
      console.log(`🔎 Still not found, checking recent pending payments...`);
      const recentPayments = await Payment.find({
        paymentStatus: 'pending',
        paymentMethod: 'arc_usdc',
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      console.log(
        `📊 Recent pending arc_usdc payments:`,
        recentPayments.map((p: any) => ({
          ref: p.paymentReference,
          createdAt: p.createdAt,
          txHash: p.metadata?.transactionHash,
          status: p.paymentStatus,
        }))
      );

      // ✅ FALLBACK 3: If exactly ONE recent pending payment exists, use it
      if (recentPayments.length === 1) {
        payment = await Payment.findById(recentPayments[0]._id);
        console.log(
          `✅ Using the single recent pending payment: ${payment?.paymentReference}`
        );
      }
    }

    if (!payment) {
      console.error(`❌ Payment record not found for reference: ${reference}`);
      console.error(`❌ Also not found by tx hash: ${usdcTxHash}`);
      return NextResponse.json(
        {
          error: 'Payment not found',
          reference,
          transactionHash: usdcTxHash,
        },
        { status: 404 }
      );
    }

    // ✅ If we found a different payment than requested, log it
    if (payment.paymentReference !== reference) {
      console.log(
        `⚠️ Found payment with different reference: DB=${payment.paymentReference}, URL=${reference}`
      );
      console.log(
        `   Proceeding with the DB reference: ${payment.paymentReference}`
      );
    }

    // ✅ Use the DB's actual reference for consistency
    const effectiveReference = payment.paymentReference;

    // ============================================================
    // 2. Skip if already completed
    // ============================================================
    if (payment.paymentStatus === 'completed') {
      console.log(
        `⚠️ Payment already processed (ref=${effectiveReference}) - returning existing data`
      );
      const tickets = await MyTicket.find({ orderId: payment.metadata?.orderId });
      const wasEmailSent = payment.metadata?.emailSent === true;

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        tickets: tickets.map((t: any) => ({ ticketId: t.ticketNumber })),
        emailSent: wasEmailSent,
        amount: payment.amount,
        userEmail: payment.customerEmail,
        reference: effectiveReference,
        event: {
          ticketsSold: 0,
          capacity: 0,
        },
      });
    }

    // ============================================================
    // 3. Get on-chain payment status
    // ============================================================
    const paymentId = payment.metadata?.onChainPaymentId;
    if (!paymentId) {
      console.error(
        `❌ No on-chain payment ID found for reference: ${effectiveReference}`
      );
      return NextResponse.json(
        { error: 'Invalid payment data - missing on-chain payment ID' },
        { status: 400 }
      );
    }

    const onChainPayment = await getOnChainPayment(paymentId);
    if (!onChainPayment.success || !onChainPayment.payment) {
      console.error(`❌ Failed to get on-chain payment:`, onChainPayment.error);
      return NextResponse.json(
        {
          error: 'Failed to verify payment on-chain',
          details: onChainPayment.error,
        },
        { status: 500 }
      );
    }

    console.log(`📊 On-chain payment status: ${onChainPayment.payment.status}`);

    // ============================================================
    // 4. If payment is still pending and we have the USDC tx hash, confirm it
    // ============================================================
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
          console.log(
            `✅ Payment confirmed on-chain: ${confirmResult.transactionHash}`
          );
          // Refresh payment data
          const updatedPayment = await getOnChainPayment(paymentId);
          if (updatedPayment.success && updatedPayment.payment) {
            onChainPayment.payment = updatedPayment.payment;
          }
        } else {
          console.error(`❌ Failed to confirm payment:`, confirmResult.error);
        }
      }
    }

    // ============================================================
    // 5. Check if payment is confirmed
    // ============================================================
    if (
      !onChainPayment.payment ||
      onChainPayment.payment.status !== 'confirmed'
    ) {
      console.error(
        `❌ Payment not confirmed. Status: ${
          onChainPayment.payment?.status || 'unknown'
        }`
      );
      return NextResponse.json(
        {
          error: 'Payment not confirmed',
          status: onChainPayment.payment?.status || 'unknown',
        },
        { status: 400 }
      );
    }

    console.log(
      `✅ Payment confirmed on-chain with proof: ${onChainPayment.payment.txHash}`
    );

    // ============================================================
    // 6. Get user and event
    // ============================================================
    let userEmail = payment.customerEmail || '';
    let userName =
      payment.metadata?.userName || userEmail.split('@')[0] || 'User';

    const event = await Event.findById(payment.eventId);
    if (!event) {
      console.error(`❌ Event not found: ${payment.eventId}`);
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // ============================================================
    // 7. Update payment status
    // ============================================================
    payment.paymentStatus = 'completed';
    payment.transactionHash = onChainPayment.payment.txHash || effectiveReference;
    await payment.save();
    console.log(`✅ Payment marked as completed`);

    // ============================================================
    // 8. Update order
    // ============================================================
    const order = await Order.findById(payment.metadata?.orderId);
    if (order) {
      order.paymentStatus = 'paid';
      await order.save();
      console.log(`✅ Order marked as paid`);
    }

    // ============================================================
    // 9. Increment discount code usage
    // ============================================================
    if (payment.metadata?.discountCode) {
      const discount = await DiscountCode.findOne({
        code: payment.metadata.discountCode.toUpperCase(),
        eventId: payment.eventId,
      });
      if (discount) {
        discount.usedCount += payment.quantity;
        await discount.save();
        console.log(
          `✅ Discount code ${discount.code} used count increased to ${discount.usedCount}/${discount.maxUses}`
        );
      }
    }

    // ============================================================
    // 10. Get ticket type
    // ============================================================
    let ticketType = null;
    if (payment.ticketTypeId && !payment.metadata?.isVirtual) {
      ticketType = await TicketType.findById(payment.ticketTypeId);
    }

    // ============================================================
    // 11. Update ticketsSold
    // ============================================================
    await Event.updateOne(
      { _id: payment.eventId },
      { $inc: { ticketsSold: payment.quantity } }
    );

    const updatedEvent = await Event.findById(payment.eventId);
    console.log(`✅ ticketsSold updated to: ${updatedEvent?.ticketsSold}`);

    // ============================================================
    // 12. Create tickets
    // ============================================================
    let tickets: any[] = [];
    const existingTickets = await MyTicket.find({ orderId: order?._id });

    if (existingTickets.length === 0) {
      console.log(`🎫 Creating ${payment.quantity} tickets...`);
      for (let i = 0; i < payment.quantity; i++) {
        const ticket = await MyTicket.create({
          orderId: order?._id,
          userId: payment.userId,
          eventId: payment.eventId,
          ticketTypeId: payment.ticketTypeId,
          ticketNumber: `${effectiveReference}-${i + 1}`,
          status: 'active',
          customerEmail: userEmail,
          customerName: userName,
          metadata: {
            arcPayment: true,
            onChainPaymentId: paymentId,
            transactionHash: onChainPayment.payment.txHash,
          },
        });
        tickets.push(ticket);
      }
      console.log(`✅ Created ${tickets.length} tickets`);
    } else {
      tickets = existingTickets;
      console.log(`✅ Using ${existingTickets.length} existing tickets`);
    }

    // ============================================================
    // 13. Send email
    // ============================================================
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
          ticketType:
            ticketType?.name ||
            payment.metadata?.ticketName ||
            'General Admission',
          amount: payment.amount,
          reference: effectiveReference,
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

    // ============================================================
    // 14. Final response
    // ============================================================
    const finalEvent = await Event.findById(payment.eventId);
    const finalTicketsSold = finalEvent?.ticketsSold || 0;

    console.log(`\n🎉 ========== PAYMENT COMPLETE ==========`);
    console.log(`✅ Reference: ${effectiveReference}`);
    console.log(`✅ Tickets: ${tickets.length}`);
    console.log(`✅ Email: ${emailSent ? 'SENT ✅' : 'FAILED ❌'}`);
    console.log(`✅ On-chain proof: ${onChainPayment.payment.txHash}`);
    console.log(
      `📊 ticketsSold: ${finalTicketsSold}/${finalEvent?.capacity || 'unlimited'}`
    );
    console.log(`========================================\n`);

    return NextResponse.json({
      success: true,
      tickets: tickets.map((t: any) => ({
        ticketId: t.ticketNumber,
        ticketNumber: t.ticketNumber,
      })),
      emailSent: emailSent,
      amount: payment.amount,
      userEmail: userEmail,
      transactionHash: onChainPayment.payment.txHash,
      reference: effectiveReference,
      event: {
        ticketsSold: finalTicketsSold,
        capacity: finalEvent?.capacity,
      },
    });
  } catch (error: any) {
    console.error('❌ VERIFY ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}