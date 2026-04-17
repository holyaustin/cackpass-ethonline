import crypto from 'crypto';

const HMAC_SECRET = process.env.QR_HMAC_SECRET!;

export function generateTicketHMAC(ticketNumber: string, eventId: string): string {
  return crypto.createHmac('sha256', HMAC_SECRET).update(`${ticketNumber}:${eventId}`).digest('hex');
}

export function verifyTicketHMAC(ticketNumber: string, eventId: string, signature: string): boolean {
  const expected = generateTicketHMAC(ticketNumber, eventId);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}