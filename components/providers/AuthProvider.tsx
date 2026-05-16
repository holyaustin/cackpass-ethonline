// /components/providers/AuthProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';

const PUBLIC_PAGES = [
  '/',
  '/events',
  '/about',
  '/privacy',
  '/terms',
  '/payment/success',
  '/payment/failed',
  //'/complete-profile',
];

function needsAuth(pathname: string): boolean {
  if (PUBLIC_PAGES.includes(pathname)) return false;
  if (pathname.startsWith('/events/') && pathname !== '/events') return false;
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return true;
  if (pathname === '/profile') return true;
  if (pathname === '/complete-profile') return true;
  return false;
}

function isPublicPage(pathname: string): boolean {
  if (PUBLIC_PAGES.includes(pathname)) return true;
  if (pathname.startsWith('/events/') && pathname !== '/events') return true;
  return false;
}

// Function to check for OAuth params dynamically
function hasOAuthParams(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('privy_oauth_code') || params.has('privy_oauth_state');
}

const LazyPrivyProvider = dynamic(
  () => import('./PrivyInnerProvider'),
  { ssr: false, loading: () => <>{/* silent loading */}</> }
);

interface AuthContextType {
  isAuthReady: boolean;
  isAuthenticated: boolean;
  login: (options?: any) => Promise<any>;
  logout: () => Promise<void>;
  user: any;
  ready: boolean;
}

let pendingResolve: ((value: any) => void) | null = null;
let pendingReject: ((reason?: any) => void) | null = null;

const defaultContext: AuthContextType = {
  isAuthReady: false,
  isAuthenticated: false,
  login: async () => {
    console.log('⏳ [AuthProvider] Login called before auth ready, waiting...');
    window.dispatchEvent(new CustomEvent('load-auth'));
    return new Promise((resolve, reject) => {
      pendingResolve = resolve;
      pendingReject = reject;
    });
  },
  logout: async () => {},
  user: null,
  ready: false,
};

const AuthContext = createContext<AuthContextType>(defaultContext);
export const useAuth = () => useContext(AuthContext);

function AuthProviderWithPrivy({ children, onReady }: { children: React.ReactNode; onReady: (context: AuthContextType) => void }) {
  const { login: privyLogin, logout, user, authenticated, ready } = usePrivy();
  const hasNotified = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  const realLogin = useCallback(async (options?: any) => {
    if (!ready) throw new Error('Privy not ready');
    return await privyLogin(options);
  }, [ready, privyLogin]);

  useEffect(() => {
    if (ready && !hasNotified.current) {
      hasNotified.current = true;
      
      // Check if there are pending login promises
      if (pendingResolve) {
        console.log('🔄 [AuthProvider] Processing pending login promise...');
        
        // If user is already authenticated (e.g., from OAuth callback), resolve immediately
        if (authenticated && user) {
          console.log('✅ [AuthProvider] User already authenticated, resolving pending promise');
          pendingResolve({ user });
          pendingResolve = null;
          pendingReject = null;
        } else {
          // Otherwise, call login
          console.log('🚀 [AuthProvider] User not authenticated, calling login...');
          realLogin()
            .then((result) => {
              console.log('✅ [AuthProvider] Login successful');
              pendingResolve?.(result);
              pendingResolve = null;
              pendingReject = null;
            })
            .catch((err) => {
              console.error('❌ [AuthProvider] Login failed:', err);
              pendingReject?.(err);
              pendingResolve = null;
              pendingReject = null;
            });
        }
      }
      
      const contextValue: AuthContextType = {
        isAuthReady: true,
        isAuthenticated: authenticated,
        login: realLogin,
        logout,
        user,
        ready: true,
      };
      
      window.dispatchEvent(new CustomEvent('auth-ready'));
      onReady(contextValue);
    }
  }, [ready, authenticated, user, realLogin, logout, onReady]);

  if (!ready) return <>{children}</>;

  const contextValue: AuthContextType = {
    isAuthReady: true,
    isAuthenticated: authenticated,
    login: realLogin,
    logout,
    user,
    ready: true,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loadAuth, setLoadAuth] = useState(false);
  const [authContextValue, setAuthContextValue] = useState<AuthContextType | null>(null);
  const hasInitialized = useRef(false);

  // Initialize on mount - runs once
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    
    // Check for OAuth params - DON'T clean them here
    if (hasOAuthParams()) {
      console.log('🔐 OAuth callback detected, forcing auth load');
      setLoadAuth(true);
    }
    
    // Check if current page needs auth
    if (needsAuth(pathname)) {
      console.log(`🔐 Page needs auth: ${pathname}, loading auth`);
      setLoadAuth(true);
    }
  }, [pathname]);

  // Listen for manual load-auth event
  useEffect(() => {
    const handler = () => {
      console.log('📢 load-auth event received');
      setLoadAuth(true);
    };
    window.addEventListener('load-auth', handler);
    return () => window.removeEventListener('load-auth', handler);
  }, []);

  const handleAuthReady = useCallback((ctx: AuthContextType) => {
    console.log('✅ handleAuthReady called, updating authContextValue');
    setAuthContextValue(ctx);
  }, []);

  if (!loadAuth) {
    return <>{children}</>;
  }

  console.log('🚀 Loading Privy provider...');
  return (
    <DynamicPrivyProvider onReady={handleAuthReady}>
      {authContextValue ? (
        <AuthContext.Provider value={authContextValue}>
          {children}
        </AuthContext.Provider>
      ) : (
        <>{children}</>
      )}
    </DynamicPrivyProvider>
  );
}

function DynamicPrivyProvider({ children, onReady }: { children: React.ReactNode; onReady: (context: AuthContextType) => void }) {
  const [Comp, setComp] = useState<React.ComponentType<{ children: React.ReactNode }> | null>(null);

  useEffect(() => {
    let mounted = true;
    import('./PrivyInnerProvider').then(mod => {
      if (mounted) setComp(() => mod.default);
    });
    return () => { mounted = false; };
  }, []);

  if (!Comp) return <>{children}</>;
  
  return (
    <Comp>
      <AuthProviderWithPrivy onReady={onReady}>
        {children}
      </AuthProviderWithPrivy>
    </Comp>
  );
}