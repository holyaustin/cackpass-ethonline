// /lib/flutterwave/payment.service.ts
"server only"

import { flw, FlutterwavePaymentPayload, FLW_CONFIG } from './config';

export interface InitiatePaymentPayload {
  tx_ref: string;
  amount: number;
  currency: 'NGN' | 'USD' | 'GHS' | 'KES' | 'ZAR' | 'EUR' | 'GBP';
  redirect_url: string;
  customer: {
    email: string;
    phone_number?: string;
    name: string;
  };
  meta?: Record<string, any>;
  payment_options?: string;
  subaccounts?: Array<{
    id: string;
    transaction_split_ratio?: number;
  }>;
}

export interface PaymentVerificationResult {
  success: boolean;
  status: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    amount: number;
    currency: string;
    status: string;
    customer: {
      email: string;
      name: string;
      phone_number: string;
    };
    card?: {
      first_6digits: string;
      last_4digits: string;
      issuer: string;
      country: string;
      type: string;
    };
  };
  error?: string;
}

export async function initiatePayment(payload: InitiatePaymentPayload): Promise<{
  success: boolean;
  data?: {
    link: string;
    tx_ref: string;
  };
  error?: string;
}> {
  try {
    const response = await flw.Payment.create({
      ...payload,
      customizations: {
        title: process.env.NEXT_PUBLIC_APP_NAME || 'CACK-pass',
        description: 'Event Ticket Purchase',
        logo: `${process.env.NEXT_PUBLIC_APP_URL}/logoosm.png`,
      },
    });

    if (response.status === 'success') {
      return {
        success: true,
        data: {
          link: response.data.link,
          tx_ref: payload.tx_ref,
        },
      };
    } else {
      return {
        success: false,
        error: response.message || 'Payment initiation failed',
      };
    }
  } catch (error: any) {
    console.error('Flutterwave initiate payment error:', error);
    return {
      success: false,
      error: error.message || 'Failed to initiate payment',
    };
  }
}

export async function verifyPayment(transactionId: string): Promise<PaymentVerificationResult> {
  try {
    const response = await flw.Transaction.verify({ id: transactionId });

    if (response.status === 'success') {
      return {
        success: true,
        status: response.data.status,
        data: {
          id: response.data.id,
          tx_ref: response.data.tx_ref,
          flw_ref: response.data.flw_ref,
          amount: response.data.amount,
          currency: response.data.currency,
          status: response.data.status,
          customer: {
            email: response.data.customer?.email || '',
            name: response.data.customer?.name || '',
            phone_number: response.data.customer?.phone_number || '',
          },
          card: response.data.card ? {
            first_6digits: response.data.card.first_6digits,
            last_4digits: response.data.card.last_4digits,
            issuer: response.data.card.issuer,
            country: response.data.card.country,
            type: response.data.card.type,
          } : undefined,
        },
      };
    } else {
      return {
        success: false,
        status: response.status,
        data: {
          id: 0,
          tx_ref: '',
          flw_ref: '',
          amount: 0,
          currency: 'NGN',
          status: response.status,
          customer: {
            email: '',
            name: '',
            phone_number: '',
          },
        },
        error: response.message || 'Verification failed',
      };
    }
  } catch (error: any) {
    console.error('Flutterwave verify payment error:', error);
    return {
      success: false,
      status: 'error',
      data: {
        id: 0,
        tx_ref: '',
        flw_ref: '',
        amount: 0,
        currency: 'NGN',
        status: 'error',
        customer: {
          email: '',
          name: '',
          phone_number: '',
        },
      },
      error: error.message || 'Failed to verify payment',
    };
  }
}

export function generateTransactionReference(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `CACK-${timestamp}-${random}`.toUpperCase();
}