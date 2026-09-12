// lib/arc/client.ts
"server only"

import { ethers } from 'ethers';
import { ARC_CONFIG } from './app-kit';

// ✅ CORRECTED ABI - matches deployed CackPassArcPayment contract exactly
export const CackPassArcPaymentABI = [
  // ──────────────────────────────────────────────
  // Events (5 params, no txHash)
  // ──────────────────────────────────────────────
  "event PaymentInitiated(bytes32 indexed paymentId, address indexed payer, uint256 amount, string paymentReference, uint256 timestamp)",
  "event PaymentConfirmed(bytes32 indexed paymentId, address indexed payer, uint256 amount, string paymentReference, uint256 timestamp)",
  "event PaymentFailed(bytes32 indexed paymentId, address indexed payer, string reason, uint256 timestamp)",
  
  // ──────────────────────────────────────────────
  // Write Functions
  // ──────────────────────────────────────────────
  "function initializePayment(bytes32 paymentId, uint256 amount, string calldata paymentReference, bytes32 eventId, uint256 ticketQuantity) external",
  "function confirmPayment(bytes32 paymentId) external",       // ✅ No txHash param
  "function failPayment(bytes32 paymentId, string calldata reason) external",
  
  // ──────────────────────────────────────────────
  // View Functions
  // ──────────────────────────────────────────────
  // ✅ PaymentStatus enum is uint8 on the wire (Pending=0, Confirmed=1, Failed=2, Refunded=3)
  // ✅ Field name is "paymentReference" not "reference"
  // ✅ No txHash field
  "function getPayment(bytes32 paymentId) external view returns (tuple(bytes32 paymentId, address payer, uint256 amount, uint256 fee, string paymentReference, uint8 status, uint256 createdAt, uint256 confirmedAt, bytes32 eventId, uint256 ticketQuantity))",
  
  "function getPaymentStatus(bytes32 paymentId) external view returns (string memory)",
  "function getUserPayments(address user) external view returns (bytes32[] memory)",
  "function paymentExists(bytes32 paymentId) external view returns (bool)",
  "function platformOwner() external view returns (address)",
  "function platformFeeBps() external view returns (uint256)",
  "function MAX_FEE_BPS() external view returns (uint256)",
];

// ✅ NEW: PaymentStatus enum mapping (matches Solidity enum)
export enum PaymentStatus {
  Pending = 0,
  Confirmed = 1,
  Failed = 2,
  Refunded = 3,
}

export const PAYMENT_STATUS_LABELS: Record<number, string> = {
  0: 'pending',
  1: 'confirmed',
  2: 'failed',
  3: 'refunded',
};

export interface OnChainPaymentData {
  paymentId: string;
  payer: string;
  amount: string;
  fee: string;
  reference: string;       // maps to paymentReference in contract
  status: string;          // human-readable string derived from enum
  statusCode: number;      // raw enum value
  createdAt: number;
  confirmedAt: number;
  eventId: string;
  ticketQuantity: number;
  // ✅ NO txHash - the contract doesn't store it
}

export interface OnChainPaymentResult {
  success: boolean;
  payment?: OnChainPaymentData;
  error?: string;
}

// Get provider
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
    
    const amountWei = ethers.parseUnits(amount.toString(), ARC_CONFIG.usdcDecimals);
    
    const tx = await contract.initializePayment(
      paymentIdBytes,
      amountWei,
      reference,
      eventIdBytes,
      ticketQuantity,
      { gasLimit: 300000 }
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

// ✅ FIXED: confirmOnChainPayment now takes ONLY paymentId (matches contract)
// The usdcTxHash is used for logging/DB storage but NOT sent to the contract
export async function confirmOnChainPayment(
  paymentId: string,
  usdcTransferTxHash: string,
  privateKey: string
) {
  try {
    const contract = getArcContractWithSigner(privateKey);
    const paymentIdBytes = paymentIdToBytes32(paymentId);
    
    console.log(`📝 Confirming payment on-chain: ${paymentId}`);
    console.log(`📝 USDC transfer hash (for logging only): ${usdcTransferTxHash}`);
    
    // ✅ Contract takes ONLY paymentId - no txHash param
    const tx = await contract.confirmPayment(paymentIdBytes, {
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

// ✅ FIXED: getOnChainPayment with correct decoding
export async function getOnChainPayment(paymentId: string): Promise<OnChainPaymentResult> {
  try {
    const contract = getArcContract();
    const paymentIdBytes = paymentIdToBytes32(paymentId);
    
    console.log(`🔍 Fetching on-chain payment: ${paymentId}`);
    console.log(`📝 Contract address: ${ARC_CONFIG.contractAddress}`);
    console.log(`📝 RPC URL: ${ARC_CONFIG.rpcUrl}`);
    
    const payment = await contract.getPayment(paymentIdBytes);
    
    // ✅ Safe decode - contract returns 10 fields with uint8 status
    const rawStatusCode = Number(payment.status);
    const statusLabel = PAYMENT_STATUS_LABELS[rawStatusCode] || 'unknown';
    
    const paymentData: OnChainPaymentData = {
      paymentId: payment.paymentId,
      payer: payment.payer,
      amount: ethers.formatUnits(payment.amount, ARC_CONFIG.usdcDecimals),
      fee: ethers.formatUnits(payment.fee, ARC_CONFIG.usdcDecimals),
      reference: payment.paymentReference,   // ✅ Correct field name
      status: statusLabel,                   // ✅ Converted from enum
      statusCode: rawStatusCode,
      createdAt: Number(payment.createdAt),
      confirmedAt: Number(payment.confirmedAt),
      eventId: payment.eventId,
      ticketQuantity: Number(payment.ticketQuantity),
    };
    
    console.log('✅ Decoded payment data:', paymentData);
    
    return {
      success: true,
      payment: paymentData,
    };
  } catch (error: any) {
    console.error('❌ Failed to get payment details:', error);
    
    let errorMessage = error.message;
    if (error.message?.includes('deferred error')) {
      errorMessage = 'Contract returned invalid data. Verify contract address and ABI match.';
    } else if (error.code === 'CALL_EXCEPTION') {
      errorMessage = `Contract call failed at ${ARC_CONFIG.contractAddress}. Payment may not exist.`;
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}