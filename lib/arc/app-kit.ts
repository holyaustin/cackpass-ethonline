// lib/arc/app-kit.ts
"server only"

import { AppKit } from '@circle-fin/app-kit';
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2';

export const ARC_CONFIG = {
  rpcUrl: process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network',
  chainId: 5042002,
  usdcDecimals: 6,
  contractAddress: process.env.ARC_CONTRACT_ADDRESS || '0x084622e6970BBcBA510454C6145313c2993ED9E4',
  usdcAddress: process.env.NEXT_PUBLIC_ARC_USDC_ADDRESS || '0x3600000000000000000000000000000000000000',
};

const ARC_TESTNET_CHAIN = 'Arc_Testnet' as const;

export async function sendUSDCWithAppKit(
  provider: any,
  to: string,
  amount: string
) {
  // ✅ Correct: pass { provider } object
  const adapter = await createViemAdapterFromProvider({
    provider: provider,
  });
  
  const kit = new AppKit();
  
  const result = await kit.send({
    from: { 
      adapter, 
      chain: ARC_TESTNET_CHAIN
    },
    to: to,
    amount: amount,
    token: 'USDC',
  });
  
  return result;
}