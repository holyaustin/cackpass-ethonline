// components/providers/AppProviders.tsx
'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { sepolia, mainnet } from 'viem/chains'
import { useEffect, useState } from 'react'
import { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

// Create QueryClient instance outside component to avoid recreating on re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

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

// Hydration fix component to prevent SSR for Privy
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return null
  }

  return <>{children}</>
}

// Auth redirect component (must be inside PrivyProvider)
function AuthRedirect() {
  const router = useRouter();
  const { authenticated, ready, user } = usePrivy(); // Destructure `user` as well

  useEffect(() => {
    if (!ready) return; // Wait for Privy to be ready

    if (authenticated) {
      console.log("✅ User authenticated, redirecting to dashboard...");
      console.log("User logged in:", user); // You can log the user object here
      router.push("/dashboard");
    } else {
      console.log("✅ User not authenticated, staying on the current page or handling accordingly...");
      // Note: The code you provided redirects to "/" if not authenticated.
      // If you want that behavior, uncomment the next line.
      // router.push("/");
    }
  }, [authenticated, ready, user, router]); // Added `user` to the dependency array

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ClientOnly>
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
        config={{
          // Configure login methods
          loginMethods: ['email', 'google', 'twitter'],
          
          // Embedded wallets configuration
          embeddedWallets: {
            ethereum: {
              createOnLogin: "users-without-wallets" as const,
            },
          },
          
          // Appearance - Use dark theme to match your app
          appearance: {
            theme: 'dark',
            accentColor: '#D95427',
            logo: '/logoosm.png',
            showWalletLoginFirst: false, // Disable to prevent extra UI complexity
          },
          
          // Privacy and behavior settings
          legal: {
            termsAndConditionsUrl: '/terms',
            privacyPolicyUrl: '/privacy',
          },
          
          // Default chain
          defaultChain: liskSepolia,
          supportedChains: [liskSepolia, sepolia, mainnet],
          
          // Additional performance optimizations
          mfa: {
            noPromptOnMfaRequired: false,
          },
        }}
      >
        <QueryClientProvider client={queryClient}>
        <AuthRedirect />
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#1e293b",
                color: "#f1f5f9",
                border: "1px solid #334155",
                fontSize: "14px",
                borderRadius: "8px",
              },
              success: {
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#fff",
                },
              },
              error: {
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#fff",
                },
              },
              loading: {
                iconTheme: {
                  primary: "#0ea5e9",
                  secondary: "#fff",
                },
              },
            }}
          />
          {children}
        </QueryClientProvider>
      </PrivyProvider>
    </ClientOnly>
  )
}

