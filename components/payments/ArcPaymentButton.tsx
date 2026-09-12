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
  onRequireLogin?: () => void;   // ✅ NEW: caller can decide what to do when login is needed
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
  onRequireLogin,
}: ArcPaymentButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);
  const router = useRouter();

  // ✅ FIX: Detect whether Privy context is available.
  // If the button renders before PrivyProvider is mounted, usePrivy/useWallets throw.
  // Wrap in a try/catch so we can render a safe fallback button.
  let privyContext: { user: any; authenticated: boolean; ready: boolean; login: () => Promise<any> } | null = null;
  let walletsContext: { wallets: any[] } | null = null;

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    privyContext = usePrivy() as any;
  } catch {
    privyContext = null;
  }

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    walletsContext = useWallets() as any;
  } catch {
    walletsContext = null;
  }

  const privyReady = privyContext?.ready === true;
  const authenticated = privyContext?.authenticated === true;
  const user = privyContext?.user;
  const login = privyContext?.login;
  const wallets = walletsContext?.wallets || [];

  const embeddedWallet =
    wallets.find((w) => w.walletClientType === 'privy') || wallets[0];

  const usdcAmount = Number((amount / NGN_PER_USDC).toFixed(6));

  const handlePayment = async () => {
    if (disabled || isProcessing || isProcessingRef.current) {
      return;
    }

    // ✅ If Privy isn't even loaded, tell the user to trigger login first
    if (!privyContext) {
      toast.info('Please sign in to continue with USDC payment');
      if (onRequireLogin) {
        onRequireLogin();
      } else if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('load-auth'));
      }
      return;
    }

    if (!authenticated) {
      toast.info('Please sign in to continue with USDC payment');
      try {
        if (onRequireLogin) {
          onRequireLogin();
        } else if (login) {
          await login();
        } else {
          window.dispatchEvent(new CustomEvent('load-auth'));
        }
      } catch (error) {
        console.error('Login failed:', error);
        toast.error('Sign in failed. Please try again.');
      }
      return;
    }

    if (!privyReady) {
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

    isProcessingRef.current = true;
    setIsProcessing(true);
    const loadingToast = toast.loading('Initializing USDC payment...');

    try {
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
      const verifyReference = data.reference;

      toast.loading('Preparing USDC payment...');
      const provider = await embeddedWallet.getEthereumProvider();
      if (!provider) {
        throw new Error('Failed to get wallet provider. Please try again.');
      }

      toast.loading(`Sending ${usdcAmount} USDC...`);

      const contractAddress =
        process.env.NEXT_PUBLIC_ARC_CONTRACT_ADDRESS ||
        '0x084622e6970BBcBA510454C6145313c2993ED9E4';

      const result = await sendUSDCWithAppKit(
        provider,
        contractAddress,
        usdcAmount.toFixed(6)
      );

      toast.dismiss();

      const txHash =
        (result as any)?.transactionHash ||
        (result as any)?.txHash ||
        (result as any)?.hash ||
        'completed';

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
  };

  // ✅ FIX: If Privy isn't loaded, show a normal "Sign in to pay" button.
  // It will trigger the app to load Privy on click, then the user can click again.
  if (!privyContext || !authenticated) {
    return (
      <button
        onClick={handlePayment}
        disabled={isProcessing || disabled}
        className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transition-all disabled:opacity-50 ${className}`}
      >
        <LogIn className="h-5 w-5" />
        Sign in to Pay {usdcAmount} USDC
      </button>
    );
  }

  // ✅ Between click and Privy fully ready, show a brief "Loading..." state
  if (!privyReady) {
    return (
      <button
        disabled
        className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 text-lg bg-gray-400 text-white cursor-not-allowed ${className}`}
      >
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading wallet...
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