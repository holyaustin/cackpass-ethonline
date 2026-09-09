// lib/arc/client.ts
"server only"

import { ethers } from 'ethers';

// Arc Testnet Configuration
export const ARC_CONFIG = {
  rpcUrl: process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.io',
  chainId: 5042002, // Arc Testnet Chain ID
  usdcDecimals: 18, // USDC uses 18 decimals on Arc
  contractAddress: process.env.ARC_CONTRACT_ADDRESS || '0x084622e6970BBcBA510454C6145313c2993ED9E4',
  // USDC token address on Arc Testnet
  usdcAddress: '0xF56D154E8A75C81f7bAC1F83E1C634F6A53C9e8E',
};

// ABI for CackPassArcPayment contract
export const CackPassArcPaymentABI = [
  // Events
  "event PaymentInitiated(bytes32 indexed paymentId, address indexed payer, uint256 amount, string reference, uint256 timestamp)",
  "event PaymentConfirmed(bytes32 indexed paymentId, address indexed payer, uint256 amount, string reference, uint256 timestamp)",
  "event PaymentFailed(bytes32 indexed paymentId, address indexed payer, string reason, uint256 timestamp)",
  
  // Functions
  "function initializePayment(bytes32 paymentId, uint256 amount, string memory reference, bytes32 eventId, uint256 ticketQuantity) external",
  "function confirmPayment(bytes32 paymentId) external",
  "function failPayment(bytes32 paymentId, string memory reason) external",
  "function getPayment(bytes32 paymentId) external view returns (tuple(bytes32 paymentId, address payer, uint256 amount, uint256 fee, string reference, string status, uint256 createdAt, uint256 confirmedAt, bytes32 eventId, uint256 ticketQuantity))",
  "function getPaymentStatus(bytes32 paymentId) external view returns (string memory)",
  "function platformOwner() external view returns (address)",
  "function platformFeeBps() external view returns (uint256)",
];

// USDC Token ABI (minimal for transfer)
export const USDC_ABI = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

// Get Arc provider (no API key needed!)
export function getArcProvider() {
  return new ethers.JsonRpcProvider(ARC_CONFIG.rpcUrl);
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

// Get USDC contract with signer
export function getUsdcContractWithSigner(privateKey: string) {
  const provider = getArcProvider();
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(
    ARC_CONFIG.usdcAddress,
    USDC_ABI,
    wallet
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

// Initialize payment on-chain
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

// Confirm payment on-chain (platform owner only)
export async function confirmOnChainPayment(
  paymentId: string,
  privateKey: string
) {
  try {
    const contract = getArcContractWithSigner(privateKey);
    const paymentIdBytes = paymentIdToBytes32(paymentId);
    
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

// Get payment status from blockchain
export async function getOnChainPaymentStatus(paymentId: string) {
  try {
    const contract = getArcContract();
    const paymentIdBytes = paymentIdToBytes32(paymentId);
    
    const status = await contract.getPaymentStatus(paymentIdBytes);
    return {
      success: true,
      status: status,
    };
  } catch (error: any) {
    console.error('❌ Failed to get payment status:', error);
    return {
      success: false,
      error: error.message,
      status: 'error',
    };
  }
}

// Get full payment details
export async function getOnChainPayment(paymentId: string) {
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