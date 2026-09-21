// lib/arc/app-kit.ts
'use client'

import { createWalletClient, createPublicClient, http, custom, parseUnits } from 'viem'
import { defineChain } from 'viem'

const RPC_URL =
  process.env.NEXT_PUBLIC_ARC_MAINNET_RPC_URL || 'https://rpc.drpc.testnet.arc.io'

// ✅ Define Arc Mainnet for Viem
export const arcMainnet = defineChain({
  id: 5042,
  name: 'Arc',
  nativeCurrency: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 18,  // ✅ Native USDC uses 18 decimals internally
  },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },

  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://arcscan.app' },
  },
  testnet: false,
})

/**
 * Send USDC from the user's Privy embedded wallet to the treasury.
 *
 * Uses a direct native transfer via Viem — no App Kit SDK required.
 * On Arc, USDC is the native gas token, so we just send `value` directly.
 *
 * @param provider - The EIP-1193 provider from the user's Privy embedded wallet
 * @param recipientAddress - The treasury wallet address (EOA)
 * @param amount - The amount of USDC to send (human-readable, e.g., "0.50")
 * @returns An object with txHash and explorerUrl
 */
export async function sendUSDCWithAppKit(
  provider: any,
  recipientAddress: string,
  amount: string
) {
  if (!provider) {
    throw new Error('Provider is required')
  }

  // 1. Create a wallet client from the user's wallet provider
  const walletClient = createWalletClient({
    chain: arcMainnet,
    transport: custom(provider),
  })

  // 2. Get the user's address from the wallet
  const [account] = await walletClient.getAddresses()

  // 3. Convert the amount to wei (18 decimals for native USDC on Arc)
  // This is critical — native USDC uses 18 decimals, not 6.
  const amountWei = parseUnits(amount, 18)

  console.log('💸 Sending native USDC:', {
    from: account,
    to: recipientAddress,
    amount,
    amountWei: amountWei.toString(),
  })

  // 4. Send the native transfer
  const txHash = await walletClient.sendTransaction({
    account,
    to: recipientAddress as `0x${string}`,
    value: amountWei,
  })

  console.log('✅ Transaction sent:', txHash)

  // 5. Return in the same shape App Kit would have returned
  return {
    name: 'transfer',
    state: 'success' as const,
    txHash,
    explorerUrl: `https://arcscan.app/tx/${txHash}`,
  }
}