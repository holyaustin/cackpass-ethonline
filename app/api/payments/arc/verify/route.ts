// app/api/payments/arc/verify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import {
  connectDB,
} from '@/lib/database/connection';

import {
  Payment,
  Order,
  MyTicket,
  TicketType,
  Event,
  User,
  DiscountCode,
} from '@/lib/database/models';

import {
  getOnChainPayment,
  confirmOnChainPayment,
} from '@/lib/arc/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const reference = searchParams.get('reference');
    const usdcTxHash = searchParams.get('transaction_id');

    if (!reference) {
      return NextResponse.json(
        { error: 'Missing reference' },
        { status: 400 }
      );
    }

    console.log(
      `\n🔍 ========== VERIFYING ARC PAYMENT: ${reference} ==========`
    );

    console.log(
      `📝 USDC tx hash: ${usdcTxHash || 'none'}`
    );

    await connectDB();

    // ============================================================
    // 1. MULTI-TIER PAYMENT LOOKUP
    // ============================================================

    let payment = await Payment.findOne({
      paymentReference: reference,
    });

    // ------------------------------------------------------------
    // FALLBACK 1:
    // Look up payment by USDC transaction hash
    // ------------------------------------------------------------

    if (!payment && usdcTxHash) {
      console.log(
        `🔎 Not found by reference, trying transaction hash lookup...`
      );

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

    // ------------------------------------------------------------
    // FALLBACK 2:
    // Look for a single recent pending Arc USDC payment
    // ------------------------------------------------------------

    if (!payment) {
      console.log(
        `🔎 Still not found, checking recent pending payments...`
      );

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

      // Only use this fallback when there is exactly one candidate.
      if (recentPayments.length === 1) {
        payment = await Payment.findById(
          recentPayments[0]._id
        );

        console.log(
          `✅ Using the single recent pending payment: ${
            payment?.paymentReference
          }`
        );
      }
    }

    // ------------------------------------------------------------
    // No payment found
    // ------------------------------------------------------------

    if (!payment) {
      console.error(
        `❌ Payment record not found for reference: ${reference}`
      );

      console.error(
        `❌ Also not found by tx hash: ${usdcTxHash}`
      );

      return NextResponse.json(
        {
          error: 'Payment not found',
          reference,
          transactionHash: usdcTxHash,
        },
        { status: 404 }
      );
    }

    // ------------------------------------------------------------
    // Use the DB reference from this point forward
    // ------------------------------------------------------------

    if (payment.paymentReference !== reference) {
      console.log(
        `⚠️ Found payment with different reference: ` +
        `DB=${payment.paymentReference}, URL=${reference}`
      );

      console.log(
        `   Proceeding with the DB reference: ${
          payment.paymentReference
        }`
      );
    }

    const effectiveReference =
      payment.paymentReference;

    // ============================================================
    // 2. SKIP IF ALREADY COMPLETED
    // ============================================================

    if (payment.paymentStatus === 'completed') {
      console.log(
        `⚠️ Payment already processed ` +
        `(ref=${effectiveReference}) - returning existing data`
      );

      const tickets = await MyTicket.find({
        orderId: payment.metadata?.orderId,
      });

      const wasEmailSent =
        payment.metadata?.emailSent === true;

      // ----------------------------------------------------------
      // Resolve processed order
      // ----------------------------------------------------------

      const processedOrder =
        payment.metadata?.orderId
          ? await Order.findById(
              payment.metadata.orderId
            ).lean()
          : null;

      // ----------------------------------------------------------
      // Resolve customer email
      // ----------------------------------------------------------

      let processedUserEmail =
        processedOrder?.customerEmail ||
        payment.customerEmail ||
        payment.metadata?.userEmail ||
        payment.metadata?.email ||
        '';

      // ----------------------------------------------------------
      // Additional User fallback
      // ----------------------------------------------------------

      if (
        !processedUserEmail &&
        payment.userId
      ) {
        const processedUser =
          await User.findById(
            payment.userId
          ).lean();

        processedUserEmail =
          processedUser?.email || '';
      }

      console.log(
        `📧 Already-processed email: ${processedUserEmail}`
      );

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,

        tickets: tickets.map((t: any) => ({
          ticketId: t.ticketNumber,
          ticketNumber: t.ticketNumber,
        })),

        emailSent: wasEmailSent,

        amount: payment.amount,

        currency:
          payment.metadata?.currency ||
          'USDC',

        userEmail:
          processedUserEmail,

        reference:
          effectiveReference,

        event: {
          ticketsSold: 0,
          capacity: 0,
        },
      });
    }

    // ============================================================
    // 3. GET ON-CHAIN PAYMENT
    // ============================================================

    const paymentId =
      payment.metadata?.onChainPaymentId;

    if (!paymentId) {
      console.error(
        `❌ No on-chain payment ID found for reference: ${
          effectiveReference
        }`
      );

      return NextResponse.json(
        {
          error:
            'Invalid payment data - missing on-chain payment ID',
        },
        { status: 400 }
      );
    }

    console.log(
      `🔗 On-chain payment ID: ${paymentId}`
    );

    // ============================================================
    // 3A. SAVE USDC TRANSACTION HASH
    // ============================================================

    if (
      usdcTxHash &&
      !payment.metadata?.usdcTxHash
    ) {
      payment.metadata = {
        ...(payment.metadata || {}),
        usdcTxHash,
      };

      payment.transactionHash =
        usdcTxHash;

      await payment.save();

      console.log(
        `✅ Stored USDC tx hash on payment record: ${usdcTxHash}`
      );
    }

    // ============================================================
    // 3B. FETCH ON-CHAIN PAYMENT
    // ============================================================

    const onChainPayment =
      await getOnChainPayment(paymentId);

    // IMPORTANT:
    // Keep a separate variable so TypeScript can narrow it.
    let onChainPaymentDetails =
      onChainPayment.payment;

    console.log(
      `📊 Initial Arc payment response:`,
      {
        success:
          onChainPayment.success,

        status:
          onChainPaymentDetails?.status ||
          'unknown',
      }
    );

    // ============================================================
    // 4. IF PENDING + TX HASH EXISTS, TRY TO CONFIRM ON-CHAIN
    // ============================================================

    if (
      onChainPaymentDetails?.status ===
        'pending' &&
      usdcTxHash
    ) {
      console.log(
        `⏳ Payment is pending, confirming with USDC tx: ${usdcTxHash}`
      );

      const privateKey =
        process.env.GASLESS_PRIVATE_KEY;

      if (!privateKey) {
        console.error(
          `❌ GASLESS_PRIVATE_KEY is not configured`
        );
      } else {
        try {
          const confirmResult =
            await confirmOnChainPayment(
              paymentId,
              usdcTxHash,
              privateKey
            );

          if (confirmResult.success) {
            console.log(
              `✅ Payment confirmation transaction submitted: ${
                confirmResult.transactionHash ||
                'unknown'
              }`
            );

            // ------------------------------------------------------
            // Wait for the Arc contract/payment state to update.
            // ------------------------------------------------------

            let retries = 0;

            const maxRetries = 5;
            const retryDelay = 2000;

            while (
              retries < maxRetries
            ) {
              await new Promise(
                (resolve) =>
                  setTimeout(
                    resolve,
                    retryDelay
                  )
              );

              const updatedPayment =
                await getOnChainPayment(
                  paymentId
                );

              if (
                updatedPayment.success &&
                updatedPayment.payment
              ) {
                onChainPaymentDetails =
                  updatedPayment.payment;

                console.log(
                  `🔄 Arc payment status after retry ${
                    retries + 1
                  }: ${
                    onChainPaymentDetails.status
                  }`
                );

                if (
                  onChainPaymentDetails.status ===
                  'confirmed'
                ) {
                  console.log(
                    `✅ Payment confirmed after ${
                      retries + 1
                    } retries`
                  );

                  break;
                }
              }

              retries++;

              console.log(
                `⏳ Retry ${retries}/${maxRetries} - payment still not confirmed...`
              );
            }

            if (
              onChainPaymentDetails?.status !==
              'confirmed'
            ) {
              console.error(
                `❌ Payment confirmation timed out`
              );
            }
          } else {
            console.error(
              `❌ Failed to confirm payment:`,
              confirmResult.error
            );
          }
        } catch (confirmError: any) {
          console.error(
            `❌ Error confirming on-chain payment:`,
            confirmError?.message ||
              confirmError
          );
        }
      }
    }

    // ============================================================
    // 5. FINAL ON-CHAIN CONFIRMATION CHECK
    // ============================================================

    // IMPORTANT:
    // This explicit guard fixes the TS18048 error and ensures
    // that payment details are definitely available before use.

    if (!onChainPaymentDetails) {
      console.error(
        `❌ Arc payment details were not returned`
      );

      return NextResponse.json(
        {
          error:
            'Payment verification failed - Arc payment details were not returned',
          status: 'unknown',
        },
        { status: 400 }
      );
    }

    if (
      onChainPaymentDetails.status !==
      'confirmed'
    ) {
      console.error(
        `❌ Payment not confirmed. Status: ${
          onChainPaymentDetails.status
        }`
      );

      return NextResponse.json(
        {
          error: 'Payment not confirmed',
          status:
            onChainPaymentDetails.status,
        },
        { status: 400 }
      );
    }

    console.log(
      `✅ Arc payment confirmed: ${
        onChainPaymentDetails.status
      }`
    );

    // ============================================================
    // 6. PAYMENT PROOF
    // ============================================================

    // The Arc payment contract does not return the USDC
    // transaction hash, so use the transaction hash supplied
    // by Circle/App Kit when available.

    const onChainProof =
      usdcTxHash ||
      payment.transactionHash ||
      effectiveReference;

    console.log(
      `✅ Payment confirmed on-chain with proof: ${onChainProof}`
    );

    // ============================================================
    // 7. GET ORDER, USER AND EVENT
    // ============================================================

    // The initialize API stores the customer's email on Order.
    // Order.customerEmail is therefore the primary source.

    const order =
      await Order.findById(
        payment.metadata?.orderId
      );

    // ------------------------------------------------------------
    // Resolve email
    // ------------------------------------------------------------

    let userEmail =
      order?.customerEmail || '';

    // ------------------------------------------------------------
    // Resolve customer name
    // ------------------------------------------------------------

    let userName =
      order?.customerName ||
      payment.metadata?.userName ||
      userEmail.split('@')[0] ||
      'User';

    // ------------------------------------------------------------
    // Fallback through User
    // ------------------------------------------------------------

    if (
      !userEmail &&
      payment.userId
    ) {
      const paymentUser =
        await User.findById(
          payment.userId
        ).lean();

      if (paymentUser?.email) {
        userEmail =
          paymentUser.email;
      }
    }

    // ------------------------------------------------------------
    // Final fallback to Payment fields
    // ------------------------------------------------------------

    if (!userEmail) {
      userEmail =
        payment.customerEmail ||
        payment.metadata?.userEmail ||
        payment.metadata?.email ||
        '';
    }

    console.log(
      `📧 EMAIL RESOLUTION:`,
      {
        orderId:
          payment.metadata?.orderId?.toString(),

        orderCustomerEmail:
          order?.customerEmail,

        orderCustomerName:
          order?.customerName,

        paymentUserId:
          payment.userId?.toString(),

        paymentCustomerEmail:
          payment.customerEmail,

        metadataUserEmail:
          payment.metadata?.userEmail,

        metadataEmail:
          payment.metadata?.email,

        resolvedUserEmail:
          userEmail,

        resolvedUserName:
          userName,
      }
    );

    // ============================================================
    // 8. GET EVENT
    // ============================================================

    const event =
      await Event.findById(
        payment.eventId
      );

    if (!event) {
      console.error(
        `❌ Event not found: ${payment.eventId}`
      );

      return NextResponse.json(
        {
          error: 'Event not found',
        },
        { status: 404 }
      );
    }

    // ============================================================
    // 9. UPDATE PAYMENT STATUS
    // ============================================================

    payment.paymentStatus =
      'completed';

    payment.transactionHash =
      usdcTxHash ||
      payment.transactionHash ||
      effectiveReference;

    payment.metadata = {
      ...(payment.metadata || {}),
      verifiedAt: new Date(),
      onChainStatus:
        onChainPaymentDetails.status,
    };

    await payment.save();

    console.log(
      `✅ Payment marked as completed`
    );

    // ============================================================
    // 10. UPDATE ORDER
    // ============================================================

    if (order) {
      order.paymentStatus =
        'paid';

      await order.save();

      console.log(
        `✅ Order marked as paid`
      );
    }

    // ============================================================
    // 11. INCREMENT DISCOUNT CODE USAGE
    // ============================================================

    if (
      payment.metadata?.discountCode
    ) {
      const discount =
        await DiscountCode.findOne({
          code:
            payment.metadata.discountCode.toUpperCase(),

          eventId:
            payment.eventId,
        });

      if (discount) {
        discount.usedCount +=
          payment.quantity;

        await discount.save();

        console.log(
          `✅ Discount code ${discount.code} used count increased to ${discount.usedCount}/${discount.maxUses}`
        );
      }
    }

    // ============================================================
    // 12. GET TICKET TYPE
    // ============================================================

    let ticketType = null;

    if (
      payment.ticketTypeId &&
      !payment.metadata?.isVirtual
    ) {
      ticketType =
        await TicketType.findById(
          payment.ticketTypeId
        );
    }

    // ============================================================
    // 13. UPDATE EVENT TICKETS SOLD
    // ============================================================

    await Event.updateOne(
      {
        _id: payment.eventId,
      },
      {
        $inc: {
          ticketsSold:
            payment.quantity,
        },
      }
    );

    const updatedEvent =
      await Event.findById(
        payment.eventId
      );

    console.log(
      `✅ ticketsSold updated to: ${
        updatedEvent?.ticketsSold
      }`
    );

    // ============================================================
    // 14. CREATE TICKETS
    // ============================================================

    let tickets: any[] = [];

    const existingTickets =
      await MyTicket.find({
        orderId: order?._id,
      });

    if (
      existingTickets.length === 0
    ) {
      console.log(
        `🎫 Creating ${payment.quantity} tickets...`
      );

      for (
        let i = 0;
        i < payment.quantity;
        i++
      ) {
        const ticket =
          await MyTicket.create({
            orderId:
              order?._id,

            userId:
              payment.userId,

            eventId:
              payment.eventId,

            ticketTypeId:
              payment.ticketTypeId,

            ticketNumber:
              `${effectiveReference}-${i + 1}`,

            status:
              'active',

            customerEmail:
              userEmail,

            customerName:
              userName,

            metadata: {
              arcPayment: true,

              onChainPaymentId:
                paymentId,

              transactionHash:
                usdcTxHash ||
                payment.transactionHash ||
                effectiveReference,
            },
          });

        tickets.push(ticket);
      }

      console.log(
        `✅ Created ${tickets.length} tickets`
      );
    } else {
      tickets =
        existingTickets;

      console.log(
        `✅ Using ${existingTickets.length} existing tickets`
      );
    }

    // ============================================================
    // 15. SEND TICKET CONFIRMATION EMAIL
    // ============================================================

    let emailSent = false;

    console.log(
      `🔍 EMAIL DEBUG:`
    );

    console.log(
      `   payment.customerEmail = "${payment.customerEmail}"`
    );

    console.log(
      `   order.customerEmail = "${order?.customerEmail}"`
    );

    console.log(
      `   payment.metadata.userEmail = "${payment.metadata?.userEmail}"`
    );

    console.log(
      `   payment.metadata.email = "${payment.metadata?.email}"`
    );

    console.log(
      `   payment.metadata.userName = "${payment.metadata?.userName}"`
    );

    console.log(
      `   payment.metadata.emailSent = ${payment.metadata?.emailSent}`
    );

    console.log(
      `   FINAL resolved userEmail = "${userEmail}"`
    );

    // ------------------------------------------------------------
    // No email
    // ------------------------------------------------------------

    if (!userEmail) {
      console.error(
        `❌ SKIPPING EMAIL: no userEmail resolved`
      );
    }

    // ------------------------------------------------------------
    // Already sent
    // ------------------------------------------------------------

    else if (
      payment.metadata?.emailSent === true
    ) {
      console.log(
        `⏭️ SKIPPING EMAIL: already sent previously`
      );

      emailSent = true;
    }

    // ------------------------------------------------------------
    // Send email
    // ------------------------------------------------------------

    else {
      console.log(
        `📧 Sending email to: ${userEmail}`
      );

      console.log(
        `📧 Event: ${event.title}`
      );

      try {
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL;

        if (!appUrl) {
          throw new Error(
            'NEXT_PUBLIC_APP_URL is not configured'
          );
        }

        const emailResponse =
          await fetch(
            `${appUrl}/api/email/ticket-confirmation`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  email:
                    userEmail,

                  name:
                    userName ||
                    userEmail.split(
                      '@'
                    )[0] ||
                    'User',

                  eventTitle:
                    event.title,

                  eventDate:
                    event.startDate?.toISOString(),

                  venue:
                    event.venue ||
                    'Online Event',

                  ticketCount:
                    payment.quantity,

                  ticketType:
                    ticketType?.name ||
                    payment.metadata
                      ?.ticketName ||
                    'General Admission',

                  amount:
                    payment.amount,

                  reference:
                    effectiveReference,
                }),
            }
          );

        if (
          !emailResponse.ok
        ) {
          const errorText =
            await emailResponse.text();

          throw new Error(
            `Email API returned ${emailResponse.status}: ${errorText}`
          );
        }

        const emailResult =
          await emailResponse.json();

        console.log(
          `✅ Email sent successfully to ${userEmail}`,
          emailResult
        );

        emailSent = true;

        payment.metadata = {
          ...(payment.metadata || {}),
          emailSent: true,
        };

        await payment.save();

      } catch (
        emailError: any
      ) {
        console.error(
          `❌ EMAIL FAILED:`,
          emailError?.message ||
            emailError
        );

        emailSent = false;
      }
    }

    // ============================================================
    // 16. FINAL RESPONSE
    // ============================================================

    const finalEvent =
      await Event.findById(
        payment.eventId
      );

    const finalTicketsSold =
      finalEvent?.ticketsSold || 0;

    const finalTxHash =
      usdcTxHash ||
      payment.transactionHash ||
      effectiveReference;

    console.log(
      `\n🎉 ========== PAYMENT COMPLETE ==========`
    );

    console.log(
      `✅ Reference: ${effectiveReference}`
    );

    console.log(
      `✅ Tickets: ${tickets.length}`
    );

    console.log(
      `✅ Email: ${
        emailSent
          ? 'SENT ✅'
          : 'FAILED ❌'
      }`
    );

    console.log(
      `✅ On-chain proof: ${finalTxHash}`
    );

    console.log(
      `📊 ticketsSold: ${finalTicketsSold}/${finalEvent?.capacity || 'unlimited'}`
    );

    console.log(
      `========================================\n`
    );

    return NextResponse.json({
      success: true,

      tickets:
        tickets.map(
          (t: any) => ({
            ticketId:
              t.ticketNumber,

            ticketNumber:
              t.ticketNumber,
          })
        ),

      emailSent:
        emailSent,

      amount:
        payment.amount,

      currency:
        'USDC',

      userEmail:
        userEmail,

      transactionHash:
        finalTxHash,

      reference:
        effectiveReference,

      event: {
        ticketsSold:
          finalTicketsSold,

        capacity:
          finalEvent?.capacity,
      },
    });

  } catch (error: any) {
    console.error(
      '❌ VERIFY ERROR:',
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Payment verification failed',
      },
      { status: 500 }
    );
  }
}

