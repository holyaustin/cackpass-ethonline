// components/payments/ArcPaymentButton.tsx
'use client'

import { useState, useEffect, useRef } from 'react';
import { Loader2, Wallet, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { sendUSDCWithAppKit } from '@/lib/arc/app-kit';

const NGN_PER_USDC = Number(process.env.NEXT_PUBLIC_NGN_PER_USDC) || 1350

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
  const [isPrivyReady, setIsPrivyReady] = useState(false);
  // ✅ ADD THIS: Prevent double-invocation
  const isProcessingRef = useRef(false);
  const router = useRouter();

  const { user, authenticated, ready, login } = usePrivy();
  const { wallets } = useWallets();

  // ✅ Ensure Privy is fully ready before rendering the actual button
  useEffect(() => {
    if (ready) {
      setIsPrivyReady(true);
    }
  }, [ready]);

  const usdcAmount = Number((amount / NGN_PER_USDC).toFixed(6))

  // ✅ Get the embedded wallet with a fallback
  const embeddedWallet = wallets.find(
    (w) => w.walletClientType === 'privy'
  ) || wallets[0];

  const handlePayment = async () => {
    // ✅ FIX: Use both ref and state to prevent double-clicks
    if (disabled || isProcessing || isProcessingRef.current) {
      console.log('🚫 [ArcPayment] Blocked duplicate click');
      return;
    }

    if (!authenticated) {
      toast.info('Please sign in to continue with USDC payment');
      try {
        await login();
      } catch (error) {
        console.error('Login failed:', error);
        toast.error('Sign in failed. Please try again.');
      }
      return;
    }

    if (!ready) {
      toast.info('Please wait while we set up your wallet...');
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (usdcAmount <= 0) {
      toast.error('Invalid payment amount');
      return;
    }

    if (!embeddedWallet) {
      toast.error('Wallet not ready. Please wait a moment and try again.');
      return;
    }

    // ✅ FIX: Lock immediately BEFORE any async work
    isProcessingRef.current = true;
    setIsProcessing(true);
    const loadingToast = toast.loading('Initializing USDC payment...');

    try {
      // STEP 1: Initialize payment on backend
      const response = await fetch('/api/payments/arc/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ticketTypeId,
          quantity,
          amount: usdcAmount,
          originalAmount: amount,
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
      // ✅ FIX: Log the EXACT reference we'll use for verification
      const verifyReference = data.reference;
      console.log('📝 Reference to verify with:', verifyReference);

      // STEP 2: Get the provider from the embedded wallet
      toast.loading('Preparing USDC payment...');

      const provider = await embeddedWallet.getEthereumProvider();

      if (!provider) {
        throw new Error('Failed to get wallet provider. Please try again.');
      }

      console.log('✅ Provider obtained from embedded wallet');

      toast.loading(`Sending ${usdcAmount} USDC...`);

      const contractAddress =
        process.env.NEXT_PUBLIC_ARC_CONTRACT_ADDRESS ||
        '0x084622e6970BBcBA510454C6145313c2993ED9E4';

      const result = await sendUSDCWithAppKit(
        provider,
        contractAddress,
        usdcAmount.toFixed(6)
      );

      console.log('✅ USDC sent:', result);
      toast.dismiss();

      // STEP 3: Extract transaction hash
      const txHash =
        (result as any)?.transactionHash ||
        (result as any)?.txHash ||
        (result as any)?.hash ||
        'completed';

      console.log('📝 Redirecting with:', {
        reference: verifyReference,
        txHash,
      });

      // STEP 4: Redirect to success page
      toast.success('Payment successful! Verifying...');

      setTimeout(() => {
        router.push(
          `/payment/success?reference=${verifyReference}&provider=arc&transaction_id=${txHash}`
        );
      }, 1500);

      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.dismiss();
      console.error('❌ Arc payment error:', error);

      // ✅ FIX: Release lock on failure so user can retry
      isProcessingRef.current = false;
      setIsProcessing(false);

      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        toast.error('Payment was cancelled');
      } else if (error.message?.includes('insufficient funds')) {
        toast.error(
          `Insufficient USDC balance. You need ${usdcAmount} USDC. Fund your wallet from the Circle faucet.`
        );
      } else {
        toast.error(error.message || 'Payment processing failed');
      }
      return;
    }
    // ✅ FIX: Do NOT release lock in `finally` on success
    // (we're navigating away, so the button will unmount)
    // Lock is only released above on error.
  };

  // Don't render until Privy is ready
  if (!isPrivyReady) {
    return (
      <button
        disabled
        className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 text-lg bg-gray-400 text-white cursor-not-allowed ${className}`}
      >
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading...
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button
        onClick={handlePayment}
        disabled={isProcessing || disabled}
        className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transition-all ${className}`}
      >
        <LogIn className="h-5 w-5" />
        Sign in to Pay {usdcAmount} USDC
      </button>
    );
  }

  return (
    <button
      onClick={handlePayment}
      disabled={isProcessing || disabled}
      className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white disabled:opacity-50 transition-all ${className}`}
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Wallet className="h-5 w-5" />
          Pay {usdcAmount} USDC
        </>
      )}
    </button>
  );
}