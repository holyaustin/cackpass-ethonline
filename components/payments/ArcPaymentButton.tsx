// components/payments/ArcPaymentButton.tsx
'use client'

import { useState, useEffect } from 'react';
import { Loader2, Wallet, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { sendUSDCWithAppKit } from '@/lib/arc/app-kit';

// ✅ NGN ↔ USDC conversion rate
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
  const router = useRouter();

  const { user, authenticated, ready, login } = usePrivy();
  const { wallets } = useWallets();

  // ✅ Track Privy readiness — prevents "useWallets outside PrivyProvider" error
  useEffect(() => {
    if (ready) {
      setIsPrivyReady(true);
    }
  }, [ready]);

  // ✅ Convert NGN to USDC (6 decimals)
  const usdcAmount = Number((amount / NGN_PER_USDC).toFixed(6))

  // ✅ Find the embedded wallet from useWallets()
  const embeddedWallet = wallets.find(
    (w) => w.walletClientType === 'privy'
  ) || wallets[0];

  // ✅ Fallback: check user object
  const userWalletAddress: string | null =
    (user as any)?.wallet?.address ||
    (user as any)?.linkedAccounts?.find(
      (acc: any) => acc?.type === 'wallet' && typeof acc?.address === 'string'
    )?.address ||
    null;

  const hasWallet = !!embeddedWallet || !!userWalletAddress;

  const handlePayment = async () => {
    if (disabled || isProcessing) return;

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

      // ============================================================
      // STEP 2: Get provider from the Privy embedded wallet
      // ============================================================
      toast.loading('Preparing USDC payment...');

      let provider: any;

      // ✅ Method 1: Use the wallet from useWallets() — has getEthereumProvider
      if (embeddedWallet?.getEthereumProvider) {
        console.log('🔑 Getting provider from embeddedWallet (useWallets)');
        provider = await embeddedWallet.getEthereumProvider();
      }
      // ✅ Method 2: Fallback — try user object (some Privy versions)
      else if ((user as any)?.wallet?.getEthereumProvider) {
        console.log('🔑 Getting provider from user.wallet');
        provider = await (user as any).wallet.getEthereumProvider();
      }
      // ✅ Method 3: Fallback — try window.ethereum (MetaMask-free browsers)
      else if (typeof window !== 'undefined' && (window as any).ethereum) {
        console.log('🔑 Using window.ethereum provider');
        provider = (window as any).ethereum;
      }
      else {
        throw new Error(
          'Wallet provider not available. Please refresh the page and try again.'
        );
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

      console.log('✅ USDC sent:', result);
      toast.dismiss();

      // ============================================================
      // STEP 3: Redirect to success page
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
  // BUTTON LABELS
  // ============================================================

  // ✅ Don't render anything until Privy is ready — prevents useWallets error
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