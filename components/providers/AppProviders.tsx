// components/providers/AppProviders.tsx
'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { sepolia, mainnet } from 'viem/chains'
import { useEffect, useState } from 'react'
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

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

function AuthRedirect() {
  const router = useRouter();
  const { authenticated, ready, user } = usePrivy();

  useEffect(() => {
    if (!ready) return;

    if (authenticated) {
      console.log("✅ User authenticated, redirecting to dashboard...");
      router.push("/dashboard");
    }
  }, [authenticated, ready, user, router]);

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a minimal skeleton during SSR
    return (
      <div className="min-h-screen bg-background dark:bg-dark-background">
        {children}
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ['email', 'google', 'twitter'],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets" as const,
          },
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
        defaultChain: liskSepolia,
        supportedChains: [liskSepolia, sepolia, mainnet],
        mfa: {
          noPromptOnMfaRequired: false,
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthRedirect />
        {children}
      </QueryClientProvider>
    </PrivyProvider>
  );
}