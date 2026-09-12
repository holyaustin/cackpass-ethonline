// lib/arc/app-kit.ts
"server only"

import { AppKit } from '@circle-fin/app-kit';
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2';
import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';

// ✅ Define Arc Testnet chain for viem
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
    },
    public: {
      http: ['https://arc-testnet.drpc.org'],  // ✅ dRPC fallback for browser
    },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
  testnet: true,
});

export const ARC_CONFIG = {
  rpcUrl: process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.network',
  rpcUrlFallback: process.env.NEXT_PUBLIC_ARC_RPC_URL_FALLBACK || 'https://arc-testnet.drpc.org',
  chainId: 5042002,
  chainIdHex: '0x4cef52',
  usdcDecimals: 6,
  contractAddress: process.env.NEXT_PUBLIC_ARC_CONTRACT_ADDRESS || '0x084622e6970BBcBA510454C6145313c2993ED9E4',
  usdcAddress: process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS || '0x3600000000000000000000000000000000000000',
  explorerUrl: 'https://testnet.arcscan.app',
};

const ARC_TESTNET_CHAIN = 'Arc_Testnet' as const;

/**
 * Get a working public client for Arc Testnet.
 * Tries primary RPC first; falls back to dRPC if primary fails.
 */
export function getArcPublicClient() {
  // ✅ Use dRPC for browser (works reliably)
  // Primary endpoint may not support CORS in all browsers
  const rpcUrl = typeof window !== 'undefined'
    ? ARC_CONFIG.rpcUrlFallback    // Browser: use dRPC
    : ARC_CONFIG.rpcUrl;            // Server: use primary

  return createPublicClient({
    chain: arcTestnet,
    transport: http(rpcUrl, {
      timeout: 30000,
      retryCount: 3,
      retryDelay: 1000,
    }),
  });
}

/**
 * Send USDC via App Kits with a working RPC
 */
export async function sendUSDCWithAppKit(
  provider: any,
  to: string,
  amount: string
) {
  if (!provider) {
    throw new Error('Provider is required');
  }

  // ✅ Determine which RPC to use based on environment
  const rpcUrl = typeof window !== 'undefined'
    ? ARC_CONFIG.rpcUrlFallback    // Browser: dRPC (CORS-friendly)
    : ARC_CONFIG.rpcUrl;            // Server: primary

  console.log('🔗 Using RPC for App Kit:', rpcUrl);

  // ✅ Create adapter with custom public client (uses working RPC)
  const adapter = await createViemAdapterFromProvider({
    provider,
    getPublicClient: () => createPublicClient({
      chain: arcTestnet,
      transport: http(rpcUrl, {
        timeout: 30000,
        retryCount: 3,
        retryDelay: 1000,
      }),
    }),
  });

  const kit = new AppKit();

  const result = await kit.send({
    from: {
      adapter,
      chain: ARC_TESTNET_CHAIN,
    },
    to,
    amount,
    token: 'USDC',
  });

  return result;
}