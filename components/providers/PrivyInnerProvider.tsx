// components/providers/PrivyInnerProvider.tsx
'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { defineChain } from 'viem'
import { mainnet } from 'viem/chains'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      gcTime: 5 * 60 * 1000,
    },
  },
})

// ✅ Resolve the RPC URL as a plain string (not string | undefined)
const ARC_MAINNET_RPC_URL =
  process.env.NEXT_PUBLIC_ARC_MAINNET_RPC_URL ||
  'https://rpc.mainnet.arc.io'

// ✅ Arc Mainnet Chain definition
// Using defineChain keeps TypeScript happy and gives the exact Chain type
// Privy needs for `defaultChain` and `supportedChains`.
export const arcMainnet = defineChain({
  id: 5042,
  name: 'Arc Mainnet',
  nativeCurrency: {
    name: 'USD Coin',
    symbol: 'USDC', // ✅ USDC is the gas token on Arc
    decimals: 18,   // ✅ Arc native USDC uses 18 decimals
  },
  rpcUrls: {
    default: {
      http: [ARC_MAINNET_RPC_URL],
    },
    public: {
      http: [ARC_MAINNET_RPC_URL],
    },
    // ✅ Privy requires this key on the Chain type
    privyWalletOverride: {
      http: [ARC_MAINNET_RPC_URL],
    },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://arcscan.app' },
  },
  testnet: false, // ✅ viem's Chain type uses `testnet`, not `mainnet`
})

export default function PrivyInnerProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ['email', 'google', 'twitter'],
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' as const },
        },
        appearance: {
          theme: 'dark',
          accentColor: '#D95427',
          logo: '/logoosm.png',
          showWalletLoginFirst: false,
        },
        legal: {
          termsAndConditionsUrl: '/terms',
          privacyPolicyUrl: '/privacy',
        },
        // ✅ Arc Mainnet as the default chain
        defaultChain: arcMainnet,
        // ✅ Support Arc Mainnet only (add more here later if needed)
        supportedChains: [arcMainnet, mainnet],
        mfa: { noPromptOnMfaRequired: false },
      }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </PrivyProvider>
  )
}