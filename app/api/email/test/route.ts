import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET() {
  const results = {
    hasGmailUser: !!process.env.GMAIL_USER,
    hasGmailPass: !!process.env.GMAIL_APP_PASSWORD,
    gmailUser: process.env.GMAIL_USER,
    errors: [] as string[],
  };

  if (!results.hasGmailUser) {
    results.errors.push('GMAIL_USER not set in environment');
  }
  if (!results.hasGmailPass) {
    results.errors.push('GMAIL_APP_PASSWORD not set in environment');
  }

  if (results.hasGmailUser && results.hasGmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      // Verify connection
      await transporter.verify();
      results.errors.push('✅ SMTP connection successful');
    } catch (error: any) {
      results.errors.push(`❌ SMTP error: ${error.message}`);
    }
  }

  return NextResponse.json(results);
}