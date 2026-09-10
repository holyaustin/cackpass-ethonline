// lib/arc/client.ts
"server only"

import { ethers } from 'ethers';
import { ARC_CONFIG } from './app-kit';

// Contract ABI for payment proof
export const CackPassArcPaymentABI = [
  // Events
  "event PaymentInitiated(bytes32 indexed paymentId, address indexed payer, uint256 amount, string reference, uint256 timestamp)",
  "event PaymentConfirmed(bytes32 indexed paymentId, address indexed payer, uint256 amount, string reference, uint256 timestamp, string txHash)",
  "event PaymentFailed(bytes32 indexed paymentId, address indexed payer, string reason, uint256 timestamp)",
  
  // Functions
  "function initializePayment(bytes32 paymentId, uint256 amount, string memory reference, bytes32 eventId, uint256 ticketQuantity) external",
  "function confirmPayment(bytes32 paymentId, string memory txHash) external",
  "function failPayment(bytes32 paymentId, string memory reason) external",
  "function getPayment(bytes32 paymentId) external view returns (tuple(bytes32 paymentId, address payer, uint256 amount, uint256 fee, string reference, string status, uint256 createdAt, uint256 confirmedAt, bytes32 eventId, uint256 ticketQuantity, string txHash))",
  "function getPaymentStatus(bytes32 paymentId) external view returns (string memory)",
  "function platformOwner() external view returns (address)",
  "function platformFeeBps() external view returns (uint256)",
];

export interface OnChainPaymentData {
  paymentId: string;
  payer: string;
  amount: string;
  fee: string;
  reference: string;
  status: string;
  createdAt: number;
  confirmedAt: number;
  eventId: string;
  ticketQuantity: number;
  txHash: string;
}

export interface OnChainPaymentResult {
  success: boolean;
  payment?: OnChainPaymentData;
  error?: string;
}

// Get provider (no API key needed!)
export function getArcProvider() {
  return new ethers.JsonRpcProvider(ARC_CONFIG.rpcUrl);
}

// Get contract with signer (for write operations)
export function getArcContractWithSigner(privateKey: string) {
  const provider = getArcProvider();
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(
    ARC_CONFIG.contractAddress,
    CackPassArcPaymentABI,
    wallet
  );
}

// Get contract instance (read-only)
export function getArcContract() {
  const provider = getArcProvider();
  return new ethers.Contract(
    ARC_CONFIG.contractAddress,
    CackPassArcPaymentABI,
    provider
  );
}

// Generate unique payment ID
export function generatePaymentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return ethers.id(`CACK-${timestamp}-${random}`);
}

// Convert payment ID to bytes32
export function paymentIdToBytes32(paymentId: string): string {
  return ethers.id(paymentId);
}

// Initialize payment on-chain (called by backend)
export async function initializeOnChainPayment(
  paymentId: string,
  amount: number,
  reference: string,
  eventId: string,
  ticketQuantity: number,
  privateKey: string
) {
  try {
    const contract = getArcContractWithSigner(privateKey);
    const paymentIdBytes = paymentIdToBytes32(paymentId);
    const eventIdBytes = ethers.id(eventId);
    
    // Convert amount to wei (USDC has 18 decimals on Arc)
    const amountWei = ethers.parseUnits(amount.toString(), ARC_CONFIG.usdcDecimals);
    
    const tx = await contract.initializePayment(
      paymentIdBytes,
      amountWei,
      reference,
      eventIdBytes,
      ticketQuantity,
      {
        gasLimit: 300000,
      }
    );
    
    console.log('📝 Payment initialization tx sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('✅ Payment initialized on-chain:', receipt.blockNumber);
    
    return {
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      paymentId: paymentId,
    };
  } catch (error: any) {
    console.error('❌ On-chain payment initialization failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ✅ NEW: Confirm payment on-chain with transaction proof
export async function confirmOnChainPayment(
  paymentId: string,
  usdcTransferTxHash: string,
  privateKey: string
) {
  try {
    const contract = getArcContractWithSigner(privateKey);
    const paymentIdBytes = paymentIdToBytes32(paymentId);
    
    const tx = await contract.confirmPayment(paymentIdBytes, usdcTransferTxHash, {
      gasLimit: 200000,
    });
    
    console.log('📝 Payment confirmation tx sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('✅ Payment confirmed on-chain:', receipt.blockNumber);
    
    return {
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (error: any) {
    console.error('❌ On-chain payment confirmation failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Get payment details from blockchain
export async function getOnChainPayment(paymentId: string): Promise<OnChainPaymentResult> {
  try {
    const contract = getArcContract();
    const paymentIdBytes = paymentIdToBytes32(paymentId);
    
    const payment = await contract.getPayment(paymentIdBytes);
    
    return {
      success: true,
      payment: {
        paymentId: payment.paymentId,
        payer: payment.payer,
        amount: ethers.formatUnits(payment.amount, ARC_CONFIG.usdcDecimals),
        fee: ethers.formatUnits(payment.fee, ARC_CONFIG.usdcDecimals),
        reference: payment.reference,
        status: payment.status,
        createdAt: Number(payment.createdAt),
        confirmedAt: Number(payment.confirmedAt),
        eventId: payment.eventId,
        ticketQuantity: Number(payment.ticketQuantity),
        txHash: payment.txHash || '',
      },
    };
  } catch (error: any) {
    console.error('❌ Failed to get payment details:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}