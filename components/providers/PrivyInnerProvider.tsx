// components/providers/PrivyInnerProvider.tsx
'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { sepolia, mainnet } from 'viem/chains'

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

// ✅ Arc Mainnet Configuration
const arcMainnet = {
  id: 5042,
  name: 'Arc Mainnet',
  nativeCurrency: { 
    name: 'USD Coin', 
    symbol: 'USDC',  // ✅ USDC is the gas token on Arc
    decimals: 18       // ✅ Arc USDC uses 18 decimals
  },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_ARC_MAINNET_RPC_URL] },
    public: { http: [process.env.NEXT_PUBLIC_ARC_MAINNET_RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://arcscan.app' },
  },
  mainnet: true,
}

export default function PrivyInnerProvider({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ['email', 'google', 'twitter'],
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" as const },
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
        // ✅ DEFAULT TO ARC Mainnet
        defaultChain: arcMainnet,
        // ✅ SUPPORT BOTH ARC Mainnet AND MAINNET + LEGACY
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