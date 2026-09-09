// components/payments/ArcPaymentButton.tsx
'use client'

import { useState } from 'react';
import { Loader2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useWallets } from '@privy-io/react-auth';
import { sendUSDCWithAppKit } from '@/lib/arc/app-kit';

interface ArcPaymentButtonProps {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  amount: number;
  email: string;
  userName: string;
  onSuccess?: () => void;
  className?: string;
  disabled?: boolean;
}

export function ArcPaymentButton({
  eventId,
  ticketTypeId,
  quantity,
  amount,
  email,
  userName,
  onSuccess,
  className = '',
  disabled = false,
}: ArcPaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const { wallets } = useWallets();

  const handlePayment = async () => {
    if (disabled || isProcessing) return;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Get the embedded wallet
    const embeddedWallet = wallets.find(w => w.walletClientType === 'privy');
    if (!embeddedWallet) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading('Initializing USDC payment...');

    try {
      // ============================================================
      // STEP 1: Initialize payment on backend (creates on-chain record)
      // ============================================================
      const response = await fetch('/api/payments/arc/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ticketTypeId,
          quantity,
          amount,
          email,
          userName,
        }),
      });

      const data = await response.json();
      toast.dismiss(loadingToast);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Payment initialization failed');
      }

      console.log('✅ Payment initialized:', data);
      console.log('📝 On-chain payment ID:', data.paymentId);

      // ============================================================
      // STEP 2: Send USDC using App Kits
      // ============================================================
      toast.loading('Sending USDC payment...');

      const contractAddress = process.env.NEXT_PUBLIC_ARC_CONTRACT_ADDRESS || '0x084622e6970BBcBA510454C6145313c2993ED9E4';

      const result = await sendUSDCWithAppKit(
        embeddedWallet,
        contractAddress,
        amount.toString()
      );

      console.log('✅ USDC sent:', result);
      toast.dismiss();

      // ============================================================
      // STEP 3: Redirect to success page for verification
      // ============================================================
      toast.success('Payment successful! Verifying...');

      // The verify endpoint will:
      // 1. Check the contract for the payment status
      // 2. Call confirmPayment() on the contract with the tx hash
      // 3. Create tickets and send email
      
      setTimeout(() => {
        router.push(`/payment/success?reference=${data.reference}&provider=arc&transaction_id=${result.txHash || result.hash}`);
      }, 1500);

      if (onSuccess) onSuccess();

    } catch (error: any) {
      toast.dismiss();
      console.error('❌ Arc payment error:', error);
      
      // Handle user rejection
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        toast.error('Payment was cancelled');
      } else {
        toast.error(error.message || 'Payment processing failed');
      }
      setIsProcessing(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={isProcessing || disabled || !wallets.length}
      className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white disabled:opacity-50 transition-all ${className}`}
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Processing...
        </>
      ) : !wallets.length ? (
        <>
          <Wallet className="h-5 w-5" />
          Connect Wallet to Pay
        </>
      ) : (
        <>
          <Wallet className="h-5 w-5" />
          Pay with USDC
        </>
      )}
    </button>
  );
}