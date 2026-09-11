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

// ✅ Arc Testnet Configuration
const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { 
    name: 'USD Coin', 
    symbol: 'USDC',  // ✅ USDC is the gas token on Arc
    decimals: 18       // ✅ Arc USDC uses 18 decimals
  },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.io'] },
    public: { http: ['https://rpc.testnet.arc.io'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
  testnet: true,
}

// ✅ Arc Mainnet Configuration (placeholder — update when launched)
const arcMainnet = {
  id: 5042001,  // Will be updated when Mainnet launches
  name: 'Arc',
  nativeCurrency: { 
    name: 'USD Coin', 
    symbol: 'USDC',
    decimals: 18
  },
  rpcUrls: {
    default: { http: ['https://rpc.arc.io'] },  // Placeholder
    public: { http: ['https://rpc.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://arcscan.app' },
  },
  testnet: false,
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
        // ✅ DEFAULT TO ARC TESTNET
        defaultChain: arcTestnet,
        // ✅ SUPPORT BOTH ARC TESTNET AND MAINNET + LEGACY
        supportedChains: [arcTestnet, arcMainnet, mainnet],
        mfa: { noPromptOnMfaRequired: false },
      }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </PrivyProvider>
  )
}