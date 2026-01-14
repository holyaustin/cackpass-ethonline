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
        // Configure only the six allowed login methods
        loginMethods: [
          'email',
          'google',
          'twitter',
          // Note: Privy doesn't natively support TikTok and Instagram OAuth
          // You'll need to use custom OAuth for these or use email-based login
          // For now, we'll use email as fallback for TikTok/Instagram
        ],
        
        // Embedded wallets configuration - create automatically for all users
        embeddedWallets: {
          createOnLogin: 'all-users' as const, // Create embedded wallet for all users
          // Removed noPromptOnSignature to keep things simple
        },
        
        // Appearance configuration
        appearance: {
          theme: 'light',
          accentColor: '#D95427', // Using your primary color
          logo: '/logoosm.png',
          showWalletLoginFirst: false, // Show social login first
          loginMessage: 'Welcome to TicketPass',
        },
        
        // Chain configuration
        defaultChain: liskSepolia,
        supportedChains: [liskSepolia, sepolia, mainnet],
        
        // OAuth configuration - only allowed methods
        oauth: {
          providers: ['google', 'twitter', 'apple'],
          // Note: Privy doesn't support TikTok or Instagram natively
        },
        
        // Remove MFA configuration completely
        // No MFA prompts - keep things simple
        
        // Remove phone/SMS configuration
        // smsLogin: { enabled: false }, // Remove this line
        
        // Remove other login methods not in our six
        // telegramLogin: undefined,
        // whatsAppLogin: undefined,
        
        // Additional configuration
        defaultCountryCode: 'NG', // Default country code for phone numbers (only for email verification)
      }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </PrivyProvider>
  )
}