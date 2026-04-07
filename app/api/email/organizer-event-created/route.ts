import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

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
      // Add timeout and debug options
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }
  return transporter;
}

export async function POST(request: NextRequest) {
  console.log('📧 Email API called');
  
  try {
    // Parse request body
    const body = await request.json();
    console.log('📧 Request body:', body);

    const {
      organizerEmail,
      organizerName,
      eventTitle,
      eventId,
      eventUrl,
      eventDate,
      eventTime,
      venue,
      isFree,
      price,
      ticketType,
      capacity,
    } = body;

    // Validate required fields
    if (!organizerEmail) {
      console.error('❌ Missing organizerEmail');
      return NextResponse.json(
        { error: 'Organizer email is required' },
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
    if (!emailRegex.test(organizerEmail)) {
      console.error('❌ Invalid email format:', organizerEmail);
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

    console.log('📧 Sending email to:', organizerEmail);
    console.log('📧 Using Gmail account:', gmailUser);

    // Simple HTML email template (no complex styling for testing)
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Event Created - CACK-pass</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #D95427; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">🎉 Event Created!</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px;">
          <p>Hi <strong>${organizerName || organizerEmail.split('@')[0]}</strong>,</p>
          
          <p>Your event <strong>"${eventTitle}"</strong> has been successfully created on CACK-pass!</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #D95427;">Event Details</h3>
            <p><strong>📅 Date:</strong> ${eventDate || 'To be announced'}</p>
            <p><strong>⏰ Time:</strong> ${eventTime || 'To be announced'}</p>
            <p><strong>📍 Venue:</strong> ${venue || 'Online/Virtual'}</p>
            <p><strong>🎟️ Ticket Type:</strong> ${ticketType || 'General Admission'}</p>
            <p><strong>💰 Price:</strong> ${isFree ? 'FREE' : price}</p>
            <p><strong>👥 Capacity:</strong> ${capacity || 'Unlimited'}</p>
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${eventUrl}" style="background: #D95427; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
              View Your Event
            </a>
          </div>
          
          <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;">
              <strong>📢 Share this link with attendees:</strong><br>
              <a href="${eventUrl}" style="color: #D95427; word-break: break-all;">${eventUrl}</a>
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          
          <p style="font-size: 12px; color: #888; text-align: center;">
            Questions? Contact us at support@cackpass.com
          </p>
        </div>
      </body>
      </html>
    `;

    // Create transporter and send email
    const transporter = getTransporter();
    
    const mailOptions = {
      from: `"CACK-pass" <${gmailUser}>`,
      to: organizerEmail,
      subject: `🎉 Your event "${eventTitle}" has been created on CACK-pass!`,
      html: emailHtml,
    };

    console.log('📧 Sending mail with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully:', {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
    });

    return NextResponse.json({
      success: true,
      message: 'Event creation email sent successfully',
      messageId: info.messageId,
      to: organizerEmail,
    });

  } catch (error: any) {
    console.error('❌ Email sending error details:', {
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
        error: 'Failed to send email',
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
        from: `"CACK-pass Test" <${gmailUser}>`,
        to: testEmail,
        subject: 'Test Email from CACK-pass',
        html: '<h1>Test Successful!</h1><p>Your email configuration is working.</p>',
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
    message: 'Email API is running',
    endpoints: {
      'POST /': 'Send event creation email',
      'GET /?test=email@example.com': 'Send test email',
    },
  });
}