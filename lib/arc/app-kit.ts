// lib/arc/app-kit.ts
"server only"

import { AppKit } from '@circle-fin/app-kit';
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2';

// Arc Testnet Configuration
export const ARC_CONFIG = {
  rpcUrl: process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.io',
  chainId: 5042002,
  usdcDecimals: 18,
  contractAddress: process.env.ARC_CONTRACT_ADDRESS || '0x084622e6970BBcBA510454C6145313c2993ED9E4',
    usdcAddress: process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS || '0x3600000000000000000000000000000000000000',
};

// ✅ FIXED: Define the chain as a const string literal
const ARC_TESTNET_CHAIN = 'Arc_Testnet' as const;

// Send USDC using App Kits
export async function sendUSDCWithAppKit(
  provider: any,
  to: string,
  amount: string
) {
  // Create adapter from provider
  const adapter = await createViemAdapterFromProvider(provider);
  
  // Initialize AppKit WITHOUT adapter (per App Kit SDK reference)
  const kit = new AppKit();
  
  // ✅ FIXED: Use the const chain literal and pass adapter in `from`
  const result = await kit.send({
    from: { 
      adapter, 
      chain: ARC_TESTNET_CHAIN  // Type-safe chain identifier
    },
    to: to,
    amount: amount,
    token: 'USDC',
  });
  
  return result;
}