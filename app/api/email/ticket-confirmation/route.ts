// app/api/email/ticket-confirmation/route.ts

import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// Lazy-loaded dependencies
// ============================================================

let nodemailer: any = null;
let QRCode: any = null;

async function getNodemailer() {
  if (!nodemailer) {
    nodemailer = await import('nodemailer');
  }

  return nodemailer;
}

async function getQRCode() {
  if (!QRCode) {
    QRCode = await import('qrcode');
  }

  return QRCode;
}

// ============================================================
// Reusable transporter
// ============================================================

let transporter: any = null;

async function getTransporter() {
  if (!transporter) {
    const { createTransport } = await getNodemailer();

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      throw new Error('Missing Gmail credentials');
    }

    transporter = createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }

  return transporter;
}

// ============================================================
// POST - Send ticket confirmation email
// ============================================================

export async function POST(request: NextRequest) {
  console.log('📧 Ticket confirmation email API called');

  try {
    // ========================================================
    // 1. Read request body
    // ========================================================

    const body = await request.json();

    console.log('📧 Request body:', body);

    const {
      email,
      name,
      eventTitle,
      eventDate,
      venue,
      ticketCount,
      ticketType,
      amount,
      reference,
    } = body;

    // ========================================================
    // 2. Validate request
    // ========================================================

    if (!email) {
      return NextResponse.json(
        {
          error: 'Recipient email is required',
        },
        {
          status: 400,
        }
      );
    }

    if (!eventTitle) {
      return NextResponse.json(
        {
          error: 'Event title is required',
        },
        {
          status: 400,
        }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          error: 'Invalid email format',
        },
        {
          status: 400,
        }
      );
    }

    // ========================================================
    // 3. Validate Gmail configuration
    // ========================================================

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPass) {
      return NextResponse.json(
        {
          error: 'Email service not configured',
        },
        {
          status: 500,
        }
      );
    }

    // ========================================================
    // 4. Dynamic imports
    // ========================================================

    const { connectDB } = await import('@/lib/database/connection');

    const { MyTicket, Event } = await import(
      '@/lib/database/models'
    );

    const { generateTicketHMAC } = await import(
      '@/lib/qr-security'
    );

    await connectDB();

    // ========================================================
    // 5. Find event
    // ========================================================

    const event = await Event.findOne({
      title: eventTitle,
    });

    if (!event) {
      console.error(
        `⚠️ Event not found by title: ${eventTitle}`
      );

      // We continue because the QR can still be generated.
    } else {
      console.log(
        `✅ Event found: ${event._id} - ${event.title}`
      );
    }

    // ========================================================
    // 6. Format event date/time
    // ========================================================

    const formattedDate = eventDate
      ? new Date(eventDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Date to be announced';

    const formattedTime = eventDate
      ? new Date(eventDate).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Time to be announced';

    // ========================================================
    // 7. Find tickets belonging to this payment/order
    // ========================================================

    const tickets = await MyTicket.find({
      ticketNumber: {
        $regex: `^${reference}-`,
      },
    }).sort({
      createdAt: 1,
      _id: 1,
    });

    console.log(
      `🎟️ Found ${tickets.length} ticket(s) for reference ${reference}`
    );

    if (tickets.length === 0) {
      console.error(
        `❌ No tickets found for reference: ${reference}`
      );

      return NextResponse.json(
        {
          error: 'No tickets found for this payment reference',
          reference,
        },
        {
          status: 404,
        }
      );
    }

    // ========================================================
    // 8. Generate QR codes
    //
    // IMPORTANT:
    // We generate:
    //
    // 1. qrDataUrl -> saved to database
    // 2. qrBuffer  -> attached to email using CID
    //
    // Gmail is much more reliable with CID attachments than
    // base64 data URLs inside <img src="...">
    // ========================================================

    const QRCodeLib = await getQRCode();

    type QRResult = {
      ticketNumber: string;
      qrDataUrl: string;
      qrBuffer: Buffer;
      cid: string;
      emailTicketNumber: number;
    };

    const qrResults = await Promise.all(
      tickets.map(
        async (
          ticket: any,
          index: number
        ): Promise<QRResult | null> => {
          try {
            // ==================================================
            // Create HMAC signature
            // ==================================================

            const hmac = event
              ? generateTicketHMAC(
                  ticket.ticketNumber,
                  event._id.toString()
                )
              : '';

            // ==================================================
            // QR payload
            // ==================================================

            const qrPayload = JSON.stringify({
              ticketNumber: ticket.ticketNumber,
              eventId: event
                ? event._id.toString()
                : '',
              sig: hmac,
            });

            console.log(
              `🔐 Generating QR for ticket: ${ticket.ticketNumber}`
            );

            // ==================================================
            // Generate QR as DATA URL
            //
            // This is retained for your database/application.
            // ==================================================

            const qrDataUrl =
              await QRCodeLib.toDataURL(qrPayload, {
                width: 300,
                margin: 4,
                errorCorrectionLevel: 'H',
                color: {
                  dark: '#000000',
                  light: '#ffffff',
                },
              });

            // ==================================================
            // Generate QR as PNG BUFFER
            //
            // This is what Gmail will receive as an inline
            // attachment.
            // ==================================================

            const qrBuffer =
              await QRCodeLib.toBuffer(qrPayload, {
                type: 'png',
                width: 300,
                margin: 4,
                errorCorrectionLevel: 'H',
                color: {
                  dark: '#000000',
                  light: '#ffffff',
                },
              });

            // ==================================================
            // Unique CID
            //
            // Example:
            // ticket-qr-0
            // ticket-qr-1
            // ticket-qr-2
            // ==================================================

            const cid = `ticket-qr-${index}`;

            // ==================================================
            // Save QR data URL to ticket
            // ==================================================

            await MyTicket.updateOne(
              {
                _id: ticket._id,
              },
              {
                $set: {
                  qrCode: qrDataUrl,
                },
              }
            );

            console.log(
              `✅ QR generated for ${ticket.ticketNumber}`
            );

            return {
              ticketNumber: ticket.ticketNumber,
              qrDataUrl,
              qrBuffer,
              cid,

              // Sequential number for THIS email.
              //
              // If 3 tickets were purchased:
              // Ticket #1
              // Ticket #2
              // Ticket #3
              emailTicketNumber: index + 1,
            };
          } catch (qrError) {
            console.error(
              `❌ QR code generation failed for ticket ${ticket.ticketNumber}:`,
              qrError
            );

            return null;
          }
        }
      )
    );

    // ========================================================
    // 9. Remove failed QR generations
    // ========================================================

    const qrCodes = qrResults.filter(
      (
        result
      ): result is QRResult => result !== null
    );

    console.log(
      `✅ Generated ${qrCodes.length} QR code(s) for ${tickets.length} ticket(s)`
    );

    if (qrCodes.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to generate ticket QR codes',
          reference,
        },
        {
          status: 500,
        }
      );
    }

    // ========================================================
    // 10. Build ticket HTML
    // ========================================================
    //
    // IMPORTANT CHANGE:
    //
    // Old:
    // Ticket #${index + 1}
    //
    // This was technically correct for one email but did not
    // represent the actual ticket identity.
    //
    // Now:
    //
    // Ticket #1
    // Ticket ID: ABC-123-001
    //
    // Ticket #2
    // Ticket ID: ABC-123-002
    //
    // etc.
    //
    // The QR itself corresponds to the real Ticket ID.
    // ========================================================

    const ticketsHtml = qrCodes
      .map(
        (qr) => `
          <div
            class="ticket-item"
            style="
              margin-bottom: 30px;
              border-bottom: 1px solid #eee;
              padding-bottom: 20px;
            "
          >

            <h3
              style="
                color: #D95427;
                margin-bottom: 10px;
              "
            >
              Ticket #${qr.emailTicketNumber}
            </h3>

            <div
              class="ticket-detail"
              style="margin-bottom: 10px;"
            >
              <span
                class="label"
                style="font-weight: 600;"
              >
                Ticket ID:
              </span>

              <span class="value">
                ${qr.ticketNumber}
              </span>
            </div>

            <div
              class="qr-code"
              style="
                text-align: center;
                margin: 15px 0;
              "
            >

              <!--
                IMPORTANT:
                Use CID instead of base64 data URL.
                Gmail supports this much more reliably.
              -->

              <img
                src="cid:${qr.cid}"
                alt="Ticket QR Code"
                width="180"
                height="180"
                style="
                  display: block;
                  width: 180px;
                  height: 180px;
                  max-width: 180px;
                  margin: 0 auto;
                  border: 0;
                "
              />

              <p
                style="
                  margin-top: 10px;
                  font-size: 12px;
                  color: #6c757d;
                "
              >
                Scan this QR code at the event entrance
              </p>

            </div>

          </div>
        `
      )
      .join('');

    // ========================================================
    // 11. Full email HTML
    // ========================================================

    const emailHtml = `
      <!DOCTYPE html>

      <html>

      <head>

        <meta charset="UTF-8">

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >

        <title>
          Your Tickets - CACK-pass
        </title>

        <style>

          body {
            font-family:
              -apple-system,
              BlinkMacSystemFont,
              'Segoe UI',
              Roboto,
              'Helvetica Neue',
              Arial,
              sans-serif;

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

            box-shadow:
              0 4px 6px
              rgba(0, 0, 0, 0.1);
          }

          .header {
            text-align: center;

            padding: 30px 20px;

            background:
              linear-gradient(
                135deg,
                #D95427 0%,
                #B8431F 100%
              );

            border-radius:
              12px 12px 0 0;

            color: white;

            margin:
              -20px -20px 0 -20px;
          }

          .header h1 {
            margin: 0;

            font-size: 28px;
          }

          .content {
            padding: 30px 20px;
          }

          .ticket-card {
            background:
              linear-gradient(
                135deg,
                #f8f9fa 0%,
                #e9ecef 100%
              );

            border-radius: 12px;

            padding: 20px;

            margin: 20px 0;

            border-left:
              4px solid #D95427;
          }

          .ticket-detail {
            display: flex;

            justify-content: space-between;

            padding: 8px 0;

            border-bottom:
              1px solid #dee2e6;
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

            text-align: right;
          }

          .button {
            display: inline-block;

            background:
              linear-gradient(
                135deg,
                #D95427 0%,
                #B8431F 100%
              );

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

            border-top:
              1px solid #dee2e6;

            margin-top: 20px;
          }

          .info-box {
            background: #fff3cd;

            border-left:
              4px solid #ffc107;

            padding: 15px;

            margin: 20px 0;

            border-radius: 8px;
          }

          .info-box h4 {
            margin:
              0 0 10px 0;

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

          <!-- HEADER -->

          <div class="header">

            <h1>
              🎫 Your Tickets are Ready!
            </h1>

            <p>
              Thank you for your purchase
            </p>

          </div>

          <!-- CONTENT -->

          <div class="content">

            <h2>
              Hello ${name || 'there'}! 👋
            </h2>

            <p>
              Your ticket${
                ticketCount > 1
                  ? 's have'
                  : ' has'
              }
              been successfully booked.
              Here are your event details:
            </p>

            <!-- EVENT INFORMATION -->

            <div class="ticket-card">

              <div class="ticket-detail">

                <span class="label">
                  🎪 Event:
                </span>

                <span class="value">
                  <strong>
                    ${eventTitle}
                  </strong>
                </span>

              </div>

              <div class="ticket-detail">

                <span class="label">
                  📅 Date:
                </span>

                <span class="value">
                  ${formattedDate}
                </span>

              </div>

              <div class="ticket-detail">

                <span class="label">
                  ⏰ Time:
                </span>

                <span class="value">
                  ${formattedTime}
                </span>

              </div>

              <div class="ticket-detail">

                <span class="label">
                  📍 Venue:
                </span>

                <span class="value">
                  ${venue || 'Online Event'}
                </span>

              </div>

              <div class="ticket-detail">

                <span class="label">
                  🎟️ Ticket Type:
                </span>

                <span class="value">
                  ${ticketType || 'General Admission'}
                </span>

              </div>

              <div class="ticket-detail">

                <span class="label">
                  🔢 Quantity:
                </span>

                <span class="value">
                  ${ticketCount}
                  ticket${
                    ticketCount > 1
                      ? 's'
                      : ''
                  }
                </span>

              </div>

              <div class="ticket-detail">

                <span class="label">
                  💰 Amount Paid:
                </span>

                <span class="value">
                  ₦${(
                    amount || 0
                  ).toLocaleString()}
                </span>

              </div>

              <div class="ticket-detail">

                <span class="label">
                  🆔 Reference:
                </span>

                <span class="value">
                  ${reference}
                </span>

              </div>

            </div>

            <!-- DIGITAL TICKETS -->

            <h3
              style="margin-top: 30px;"
            >
              Your Digital Tickets
            </h3>

            <p>
              Each ticket has its own unique QR code.
              Please keep them safe.
            </p>

            ${ticketsHtml}

            <!-- DASHBOARD BUTTON -->

            <div style="text-align: center;">

              <a
                href="${
                  process.env.NEXT_PUBLIC_APP_URL
                }/dashboard/tickets"
                class="button"
              >
                View My Tickets
              </a>

            </div>

            <!-- IMPORTANT INFORMATION -->

            <div class="info-box">

              <h4>
                ⚠️ Important Information
              </h4>

              <ul>

                <li>
                  Please arrive at least
                  30 minutes before the event starts
                </li>

                <li>
                  Show your QR code at the entrance
                  (digital or printed)
                </li>

                <li>
                  Each ticket must be scanned
                  separately for entry
                </li>

                <li>
                  Tickets are non-transferable
                  without prior authorization
                </li>

              </ul>

            </div>

          </div>

          <!-- FOOTER -->

          <div class="footer">

            <p>
              © ${new Date().getFullYear()}
              CACK-pass. All rights reserved.
            </p>

            <p>
              Need help?
              Contact us at
              <a href="mailto:support@cackpass.com">
                support@cackpass.com
              </a>
            </p>

          </div>

        </div>

      </body>

      </html>
    `;

    // ========================================================
    // 12. Create Gmail transporter
    // ========================================================

    const mailTransporter =
      await getTransporter();

    // ========================================================
    // 13. Create inline QR attachments
    // ========================================================
    //
    // Each QR gets a unique CID.
    //
    // HTML:
    //
    // <img src="cid:ticket-qr-0">
    //
    // Attachment:
    //
    // {
    //   cid: "ticket-qr-0"
    // }
    //
    // Gmail can resolve this relationship.
    // ========================================================

    const qrAttachments = qrCodes.map(
      (qr) => ({
        filename: `${qr.ticketNumber}.png`,

        content: qr.qrBuffer,

        contentType: 'image/png',

        cid: qr.cid,

        disposition: 'inline',
      })
    );

    console.log(
      `📎 Preparing ${qrAttachments.length} inline QR attachment(s)`
    );

    // ========================================================
    // 14. Send email
    // ========================================================

    const mailOptions = {
      from: `"CACK-pass" <${gmailUser}>`,

      to: email,

      subject:
        `🎫 Your Tickets for ${eventTitle} - CACK-pass`,

      html: emailHtml,

      attachments: qrAttachments,
    };

    const info =
      await mailTransporter.sendMail(
        mailOptions
      );

    // ========================================================
    // 15. Success
    // ========================================================

    console.log(
      '✅ Ticket confirmation email sent successfully:',
      {
        messageId: info.messageId,

        to: email,

        ticketCount: qrCodes.length,

        qrAttachments:
          qrAttachments.length,
      }
    );

    return NextResponse.json({
      success: true,

      message:
        'Ticket confirmation email sent successfully',

      messageId:
        info.messageId,

      to: email,

      ticketCount:
        qrCodes.length,

      qrCodesIncluded: true,
    });

  } catch (error: any) {
    // ========================================================
    // ERROR
    // ========================================================

    console.error(
      '❌ Ticket confirmation email error:',
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          'Failed to send ticket confirmation email',
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// GET - Test endpoint
// ============================================================

export async function GET(
  request: NextRequest
) {
  const searchParams =
    request.nextUrl.searchParams;

  const testEmail =
    searchParams.get('test');

  // ==========================================================
  // Test email
  // ==========================================================

  if (testEmail) {
    try {
      const gmailUser =
        process.env.GMAIL_USER;

      const gmailPass =
        process.env.GMAIL_APP_PASSWORD;

      if (!gmailUser || !gmailPass) {
        return NextResponse.json(
          {
            error:
              'Missing Gmail credentials',
          },
          {
            status: 500,
          }
        );
      }

      const { createTransport } =
        await import('nodemailer');

      const testTransporter =
        createTransport({
          service: 'gmail',

          auth: {
            user: gmailUser,
            pass: gmailPass,
          },
        });

      const info =
        await testTransporter.sendMail({
          from:
            `"CACK-pass Tickets" <${gmailUser}>`,

          to: testEmail,

          subject:
            'Test Email from CACK-pass - Ticket Confirmation',

          html: `
            <!DOCTYPE html>

            <html>

              <body
                style="
                  font-family: Arial, sans-serif;
                  padding: 30px;
                "
              >

                <h1>
                  Test Successful! ✅
                </h1>

                <p>
                  Your ticket confirmation
                  email configuration is working.
                </p>

                <p>
                  Gmail SMTP is connected successfully.
                </p>

              </body>

            </html>
          `,
        });

      return NextResponse.json({
        success: true,

        message:
          'Test email sent',

        messageId:
          info.messageId,
      });

    } catch (error: any) {
      return NextResponse.json(
        {
          error:
            error?.message,

          code:
            error?.code,
        },
        {
          status: 500,
        }
      );
    }
  }

  // ==========================================================
  // Default GET response
  // ==========================================================

  return NextResponse.json({
    message:
      'CACK-pass Ticket Purchase Confirmation Email',

    endpoints: {
      'POST /':
        'Send ticket confirmation email to customer',

      'GET /?test=email@example.com':
        'Send test email to verify configuration',
    },
  });
}