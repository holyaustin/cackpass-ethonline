// components/providers/AppProviders.tsx
'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        // Supported login methods
        loginMethods: ['email', 'wallet', 'google', 'twitter', 'sms'],
        
        // Embedded wallets configuration (FIXED)
        embeddedWallets: {
          // CORRECT: 'createOnLogin' is nested under 'ethereum'
          ethereum: {
            createOnLogin: 'users-without-wallets',
            requireUserPasswordOnCreate: false,
          },
          solana: {
            createOnLogin: 'users-without-wallets',
            requireUserPasswordOnCreate: false,
          }
        },
        
        // Appearance configuration
        appearance: {
          theme: 'light',
          accentColor: '#FF6B35',
          logo: '/logo.png',
          walletList: ['detected_wallets', 'metamask', 'coinbase_wallet', 'rainbow', 'wallet_connect'],
        },
        
        // Additional configuration
        defaultChain: {
          id: 4202, // Lisk Sepolia
          name: 'Lisk Sepolia',
        },
        supportedChains: [
          {
            id: 4202,
            name: 'Lisk Sepolia',
            rpcUrl: process.env.NEXT_PUBLIC_RPC_URL!,
          }
        ],
      }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </PrivyProvider>
  )
}