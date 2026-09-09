// lib/arc/app-kit.ts
"server only"

import { AppKit } from '@circle-fin/app-kit';
import { createPrivyAdapter } from '@circle-fin/adapter-privy';

// Arc Testnet Configuration
export const ARC_CONFIG = {
  rpcUrl: process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.io',
  chainId: 5042002,
  usdcDecimals: 18,
  contractAddress: process.env.ARC_CONTRACT_ADDRESS || '0x084622e6970BBcBA510454C6145313c2993ED9E4',
  usdcAddress: '0xF56D154E8A75C81f7bAC1F83E1C634F6A53C9e8E',
};

// Create App Kit instance with Privy wallet
export async function createAppKit(wallet: any) {
  const adapter = createPrivyAdapter(wallet);
  return new AppKit({ adapter });
}

// Send USDC using App Kits
export async function sendUSDCWithAppKit(
  wallet: any,
  to: string,
  amount: string,
  chain: string = 'Arc_Testnet'
) {
  const kit = await createAppKit(wallet);
  
  const result = await kit.send({
    from: { adapter: kit.adapter, chain },
    to: to,
    amount: amount,
    token: 'USDC',
  });
  
  return result;
}

// Get balance using App Kits
export async function getUSDCBalance(wallet: any, chain: string = 'Arc_Testnet') {
  const kit = await createAppKit(wallet);
  
  const balance = await kit.getBalance({
    wallet: { adapter: kit.adapter, chain },
    token: 'USDC',
  });
  
  return balance;
}