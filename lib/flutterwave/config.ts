// /lib/flutterwave/config.ts
"server only"

import Flutterwave from 'flutterwave-node-v3';

if (!process.env.FLW_PUBLIC_KEY || !process.env.FLW_SECRET_KEY) {
  throw new Error('Missing Flutterwave API Keys in environment variables.');
}

export const flw = new Flutterwave(
  process.env.FLW_PUBLIC_KEY,
  process.env.FLW_SECRET_KEY
);

export const FLW_CONFIG = {
  publicKey: process.env.FLW_PUBLIC_KEY,
  secretKey: process.env.FLW_SECRET_KEY,
  secretHash: process.env.FLW_SECRET_HASH,
  encryptionKey: process.env.FLW_ENCRYPTION_KEY,
  baseUrl: 'https://api.flutterwave.com/v3',
  currency: 'NGN',
} as const;

export interface FlutterwavePaymentPayload {
  tx_ref: string;
  amount: number;
  currency: 'NGN' | 'USD' | 'GHS' | 'KES' | 'ZAR' | 'EUR' | 'GBP';
  redirect_url: string;
  customer: {
    email: string;
    phone_number?: string;
    name: string;
  };
  customizations?: {
    title: string;
    description?: string;
    logo?: string;
  };
  payment_options?: string;
  payment_plan?: string;
  subaccounts?: Array<{
    id: string;
    transaction_split_ratio?: number;
    transaction_charge_type?: 'flat' | 'percentage';
    transaction_charge?: number;
  }>;
  meta?: Record<string, any>;
}

export interface FlutterwaveVerificationResponse {
  status: string;
  message: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    device_fingerprint: string;
    amount: number;
    currency: string;
    charged_amount: number;
    app_fee: number;
    merchant_fee: number;
    processor_response: string;
    auth_model: string;
    ip: string;
    narration: string;
    status: string;
    payment_type: string;
    created_at: string;
    account_id: number;
    customer: {
      id: number;
      name: string;
      phone_number: string;
      email: string;
      created_at: string;
    };
    card: {
      first_6digits: string;
      last_4digits: string;
      issuer: string;
      country: string;
      type: string;
      expiry: string;
    };
  };
}