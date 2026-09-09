// components/payments/ArcPaymentButton.tsx
'use client'

import { useState } from 'react';
import { Loader2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';

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
  const { user } = usePrivy();

  const handlePayment = async () => {
    if (disabled || isProcessing) return;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading('Initializing USDC payment...');

    try {
      // 1. Initialize payment on backend
      const response = await fetch('/api/payments/arc/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      if (!response.ok) {
        throw new Error(data.error || 'Payment initialization failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Payment initialization failed');
      }

      console.log('✅ Payment initialized:', data);

      // 2. Get user's wallet address from Privy
      const walletAddress = user?.wallet?.address;
      if (!walletAddress) {
        throw new Error('No wallet connected. Please connect your wallet.');
      }

      // 3. Send USDC to the contract
      toast.loading('Waiting for USDC transfer approval...');

      // Get provider from user's wallet
      if (!window.ethereum) {
        throw new Error('No Ethereum provider found. Please install a wallet.');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // USDC contract on Arc Testnet
      const USDC_ADDRESS = '0xF56D154E8A75C81f7bAC1F83E1C634F6A53C9e8E';
      const CONTRACT_ADDRESS = '0x084622e6970BBcBA510454C6145313c2993ED9E4';

      const usdcAbi = [
        'function transfer(address to, uint256 amount) external returns (bool)',
        'function approve(address spender, uint256 amount) external returns (bool)',
        'function allowance(address owner, address spender) external view returns (uint256)',
      ];

      const usdcContract = new ethers.Contract(USDC_ADDRESS, usdcAbi, signer);
      
      // Convert amount to USDC units (18 decimals on Arc)
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      
      // Check if user has enough USDC
      const balance = await usdcContract.balanceOf(walletAddress);
      if (balance < amountWei) {
        throw new Error(`Insufficient USDC balance. You have ${ethers.formatUnits(balance, 18)} USDC.`);
      }

      // Check allowance
      const allowance = await usdcContract.allowance(walletAddress, CONTRACT_ADDRESS);
      
      // If allowance is not enough, request approval
      if (allowance < amountWei) {
        toast.loading('Please approve USDC transfer...');
        
        const approveTx = await usdcContract.approve(CONTRACT_ADDRESS, amountWei);
        await approveTx.wait();
        console.log('✅ USDC approved:', approveTx.hash);
      }

      toast.loading('Sending USDC payment...');

      // Transfer USDC to contract
      const transferTx = await usdcContract.transfer(CONTRACT_ADDRESS, amountWei);
      await transferTx.wait();
      console.log('✅ USDC transferred:', transferTx.hash);

      toast.dismiss();

      // 4. Redirect to success page with reference
      toast.success('Payment successful! Redirecting...');
      
      // Small delay to let the success page load
      setTimeout(() => {
        router.push(`/payment/success?reference=${data.reference}&provider=arc`);
      }, 1500);

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
          Pay with USDC
        </>
      )}
    </button>
  );
}