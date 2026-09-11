// components/payments/ArcPaymentButton.tsx
'use client'

import { useState } from 'react';
import { Loader2, Wallet, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { sendUSDCWithAppKit } from '@/lib/arc/app-kit';

// ✅ USDC ↔ NGN conversion rate
// Update this value as the market rate changes, or fetch it from an API
const NGN_PER_USDC = Number(process.env.NEXT_PUBLIC_NGN_PER_USDC) || 1350

interface ArcPaymentButtonProps {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  amount: number;           // Amount in NGN (as passed from event page)
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

  // ✅ ONLY usePrivy — no useWallets to avoid "outside PrivyProvider" error
  const { user, authenticated, ready, login } = usePrivy();

  // ✅ Convert NGN amount to USDC (rounded to nearest whole number)
  const usdcAmount = Number((amount / NGN_PER_USDC).toFixed(6))

// ✅ Safe wallet address extraction
const embeddedWalletAddress: string | null =
  user?.wallet?.address ||
  (user?.linkedAccounts?.find(
    (acc: any) => 
      acc?.type === 'wallet' && 
      typeof acc?.address === 'string'
  ) as any)?.address ||
  null

  const hasEmbeddedWallet = !!embeddedWalletAddress

  const handlePayment = async () => {
    if (disabled || isProcessing) return;

    // ✅ If not authenticated, trigger Privy login
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

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Validate amount
    if (usdcAmount <= 0) {
      toast.error('Invalid payment amount');
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading('Initializing USDC payment...');

    try {
      // ============================================================
      // STEP 1: Initialize payment on backend
      // ============================================================
      const response = await fetch('/api/payments/arc/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ticketTypeId,
          quantity,
          amount: usdcAmount,       // Send USDC amount
          originalAmount: amount,   // Keep original NGN amount for reference
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
      toast.loading('Preparing USDC payment...');

      // ✅ Get the EIP-1193 provider from the user's wallet
      let provider: any;

      if ((user as any)?.wallet?.getEthereumProvider) {
        provider = await (user as any).wallet.getEthereumProvider();
      } else {
        throw new Error('Embedded wallet not ready. Please refresh and try again.');
      }

      toast.loading(`Sending ${usdcAmount} USDC...`);

      const contractAddress =
        process.env.NEXT_PUBLIC_ARC_CONTRACT_ADDRESS ||
        '0x084622e6970BBcBA510454C6145313c2993ED9E4';

      // ✅ Convert whole USDC to string for App Kit
        const result = await sendUSDCWithAppKit(
          provider,
          contractAddress,
          usdcAmount.toFixed(6)
        );
      console.log('✅ USDC sent:', result);
      toast.dismiss();

      // ============================================================
      // STEP 3: Redirect to success page for verification
      // ============================================================
      toast.success('Payment successful! Verifying...');

      const txHash =
        (result as any)?.transactionHash ||
        (result as any)?.txHash ||
        (result as any)?.hash ||
        'completed';

      setTimeout(() => {
        router.push(
          `/payment/success?reference=${data.reference}&provider=arc&transaction_id=${txHash}`
        );
      }, 1500);

      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.dismiss();
      console.error('❌ Arc payment error:', error);

      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        toast.error('Payment was cancelled');
      } else if (error.message?.includes('insufficient funds')) {
        toast.error(
          `Insufficient USDC balance. You need ${usdcAmount} USDC. Fund your wallet from the Circle faucet.`
        );
      } else {
        toast.error(error.message || 'Payment processing failed');
      }
      setIsProcessing(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================================
  // BUTTON LABEL LOGIC
  // ============================================================

  if (!ready) {
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
        disabled={disabled}
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