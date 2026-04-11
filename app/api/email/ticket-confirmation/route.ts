import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

// Create transporter outside the handler for reuse
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

export async function POST(request: NextRequest) {
  console.log('📧 Ticket confirmation email API called');
  
  try {
    // Parse request body
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

    // Validate required fields
    if (!email) {
      console.error('❌ Missing recipient email');
      return NextResponse.json(
        { error: 'Recipient email is required' },
        { status: 400 }
      );
    }

    if (!eventTitle) {
      console.error('❌ Missing eventTitle');
      return NextResponse.json(
        { error: 'Event title is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Invalid email format:', email);
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check Gmail credentials
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    
    if (!gmailUser || !gmailPass) {
      console.error('❌ Missing Gmail credentials in environment');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Format date
    const formattedDate = eventDate ? new Date(eventDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 'Date to be announced';

    const formattedTime = eventDate ? new Date(eventDate).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Time to be announced';

    // Generate QR code for the ticket
    let qrCodeDataUrl = '';
    try {
      const qrData = JSON.stringify({
        reference,
        eventTitle,
        ticketCount,
        email,
        date: formattedDate,
        venue
      });
      
      qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#D95427',
          light: '#ffffff'
        }
      });
      console.log('✅ QR code generated successfully');
    } catch (qrError) {
      console.error('❌ QR code generation failed:', qrError);
      // Continue without QR code
    }

    console.log('📧 Sending ticket confirmation email to:', email);
    console.log('📧 Using Gmail account:', gmailUser);

    // Email HTML template for ticket confirmation
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
          .badge {
            display: inline-block;
            background: #28a745;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 10px;
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
            <h2>Hello ${name || 'there'}! 👋</h2>
            <p>Your ticket${ticketCount > 1 ? 's have' : ' has'} been successfully booked. Here are your event details:</p>
            
            <div class="ticket-card">
              <div class="ticket-detail">
                <span class="label">🎪 Event:</span>
                <span class="value"><strong>${eventTitle}</strong></span>
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
                <span class="value">${venue || 'Online Event'}</span>
              </div>
              <div class="ticket-detail">
                <span class="label">🎟️ Ticket Type:</span>
                <span class="value">${ticketType || 'General Admission'}</span>
              </div>
              <div class="ticket-detail">
                <span class="label">🔢 Quantity:</span>
                <span class="value">${ticketCount} ticket${ticketCount > 1 ? 's' : ''}</span>
              </div>
              <div class="ticket-detail">
                <span class="label">💰 Amount Paid:</span>
                <span class="value">₦${(amount || 0).toLocaleString()}</span>
              </div>
              <div class="ticket-detail">
                <span class="label">🆔 Reference:</span>
                <span class="value">${reference}</span>
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

    // Create transporter and send email
    const transporter = getTransporter();
    
    const mailOptions = {
      from: `"CACK-pass" <${gmailUser}>`,
      to: email,
      subject: `🎫 Your Ticket for ${eventTitle} - CACK-pass`,
      html: emailHtml,
      attachments: qrCodeDataUrl ? [] : undefined, // QR code is embedded as data URL
    };

    console.log('📧 Sending ticket confirmation mail with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Ticket confirmation email sent successfully:', {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
    });

    return NextResponse.json({
      success: true,
      message: 'Ticket confirmation email sent successfully',
      messageId: info.messageId,
      to: email,
    });

  } catch (error: any) {
    console.error('❌ Ticket confirmation email error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack,
    });

    // Handle specific error types
    if (error.code === 'EAUTH') {
      return NextResponse.json(
        { 
          error: 'Email authentication failed. Please check your Gmail credentials.',
          details: 'Invalid app password or 2FA not configured'
        },
        { status: 401 }
      );
    }

    if (error.code === 'ESOCKET') {
      return NextResponse.json(
        { 
          error: 'Network error. Please check your internet connection.',
          details: error.message
        },
        { status: 503 }
      );
    }

    if (error.code === 'ECONNECTION') {
      return NextResponse.json(
        { 
          error: 'Connection failed. Gmail SMTP might be blocked.',
          details: error.message
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to send ticket confirmation email',
        details: error.message,
        code: error.code
      },
      { status: 500 }
    );
  }
}

// Test endpoint
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const testEmail = searchParams.get('test');

  if (testEmail) {
    try {
      const gmailUser = process.env.GMAIL_USER;
      const gmailPass = process.env.GMAIL_APP_PASSWORD;
      
      if (!gmailUser || !gmailPass) {
        return NextResponse.json(
          { error: 'Missing Gmail credentials' },
          { status: 500 }
        );
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
      });

      const info = await transporter.sendMail({
        from: `"CACK-pass Tickets" <${gmailUser}>`,
        to: testEmail,
        subject: 'Test Email from CACK-pass - Ticket Confirmation',
        html: '<h1>Test Successful!</h1><p>Your ticket confirmation email configuration is working.</p>',
      });

      return NextResponse.json({
        success: true,
        message: 'Test email sent',
        messageId: info.messageId,
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    message: 'CACK-pass Ticket Purchase Confirmation Email',
    endpoints: {
      'POST /': 'Send ticket confirmation email to customer',
      'GET /?test=holyaustin@yahoo.com': 'Send test email to verify configuration',
    },
  });
}