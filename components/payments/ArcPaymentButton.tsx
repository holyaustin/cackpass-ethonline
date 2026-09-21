// components/payments/ArcPaymentButton.tsx
'use client'

import { useState, useEffect, useRef } from 'react';
import { Loader2, Wallet, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { sendUSDCWithAppKit } from '@/lib/arc/app-kit';

const NGN_PER_USDC = Number(process.env.NEXT_PUBLIC_NGN_PER_USDC) || 1350
const PROCESSING_MARKUP_USDC = Number(process.env.NEXT_PUBLIC_PROCESSING_MARKUP_USDC) || 0.04

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
  onRequireLogin?: () => void;
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

  // ✅ Compute base + total on the client so the user sees the real amount
  //    BEFORE clicking. The backend still validates the same numbers.
  const baseUsdcAmount = Number((amount / NGN_PER_USDC).toFixed(6));
  const displayTotal = Number(
    (baseUsdcAmount + PROCESSING_MARKUP_USDC).toFixed(6)
  );

  const handlePayment = async () => {
    if (disabled || isProcessing || isProcessingRef.current) {
      return;
    }

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

    if (baseUsdcAmount <= 0) {
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
          amount: baseUsdcAmount,        // base amount
          originalAmount: amount,        // NGN
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

      // ✅ Use the authoritative total from the backend
      const totalUSDC = Number(data.amountUSDC);
      const verifyReference = data.reference;

      if (!totalUSDC || totalUSDC <= 0) {
        throw new Error('Invalid payment amount received from server');
      }

      console.log('💵 Amount breakdown:', {
        base: data.baseAmountUSDC,
        markup: data.processingMarkupUSDC,
        total: totalUSDC,
      });

      toast.loading('Preparing USDC payment...');
      const provider = await embeddedWallet.getEthereumProvider();
      if (!provider) {
        throw new Error('Failed to get wallet provider. Please try again.');
      }

      toast.loading(`Sending ${totalUSDC} USDC...`);

      const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_WALLET;
      if (!treasuryAddress) throw new Error('Treasury wallet not configured');

      console.log('💸 Sending USDC natively:', {
        to: treasuryAddress,
        amount: totalUSDC.toFixed(6),
        from: embeddedWallet.address,
      });

      const result = await sendUSDCWithAppKit(
        provider,
        treasuryAddress,
        totalUSDC.toFixed(6)
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
          `Insufficient USDC balance. You need ${displayTotal} USDC. Fund your wallet from the Circle faucet.`
        );
      } else {
        toast.error(error.message || 'Payment processing failed');
      }
      return;
    }
  };

  // Fallback button when Privy isn't loaded yet
  if (!privyContext || !authenticated) {
    return (
      <div className="space-y-2">
        <button
          onClick={handlePayment}
          disabled={isProcessing || disabled}
          className={`w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transition-all disabled:opacity-50 ${className}`}
        >
          <LogIn className="h-5 w-5" />
          Sign in to Pay {displayTotal} USDC
        </button>
        <AmountBreakdown base={baseUsdcAmount} markup={PROCESSING_MARKUP_USDC} total={displayTotal} />
      </div>
    );
  }

  // Brief loading state while Privy finishes initializing
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
    <div className="space-y-2">
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
            Pay {displayTotal} USDC
          </>
        )}
      </button>

      <AmountBreakdown base={baseUsdcAmount} markup={PROCESSING_MARKUP_USDC} total={displayTotal} />
    </div>
  );
}

/**
 * Small breakdown shown under the button:
 *
 *   Ticket:         0.370370 USDC
 *   Processing fee: 0.020000 USDC
 *   ─────────────────────────────
 *   Total to pay:   0.390370 USDC
 */
function AmountBreakdown({
  base,
  markup,
  total,
}: {
  base: number;
  markup: number;
  total: number;
}) {
  return (
    <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
      <div className="flex justify-between">
        <span>Ticket</span>
        <span className="font-mono">{base.toFixed(6)} USDC</span>
      </div>
      <div className="flex justify-between mt-1">
        <span>Processing fee</span>
        <span className="font-mono">{markup.toFixed(6)} USDC</span>
      </div>
      <div className="flex justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-gray-100">
        <span>Total to pay</span>
        <span className="font-mono">{total.toFixed(6)} USDC</span>
      </div>
    </div>
  );
}