// components/providers/AppProviders.tsx

'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { sepolia, mainnet } from 'viem/chains'

const queryClient = new QueryClient()

// Custom chain configuration for Lisk Sepolia
const liskSepolia = {
  id: 4202,
  name: 'Lisk Sepolia',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.sepolia-api.lisk.com'],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.sepolia-api.lisk.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://sepolia-blockscout.lisk.com',
    },
  },
  testnet: true,
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        // Configure login methods
        loginMethods: ['email', 'google', 'twitter'],
        
        // FIXED: Embedded wallets configuration
         embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets" as const,
           
          },
        },
        
        // Appearance
        appearance: {
          theme: 'light',
          accentColor: '#D95427',
          logo: '/logoosm.png',
        },
        
        // Default chain
        defaultChain: liskSepolia,
        supportedChains: [liskSepolia, sepolia, mainnet],
      }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </PrivyProvider>
  )
}