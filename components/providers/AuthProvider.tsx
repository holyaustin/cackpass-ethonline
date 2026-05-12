// /components/providers/AuthProvider.tsx - NEW FILE
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

// Pages that don't need authentication (same as PUBLIC_PAGES in Header)
const PUBLIC_PAGES = [
  '/',
  '/events',
  '/about',
  '/privacy',
  '/terms',
  '/payment/success',
  '/payment/failed',
  '/complete-profile', // IMPORTANT: Keep this - it needs auth but is special
];

// Check if current page needs authentication
function needsAuth(pathname: string): boolean {
  // Exact matches that don't need auth
  if (PUBLIC_PAGES.includes(pathname)) return false;
  
  // Event detail pages don't need auth initially
  if (pathname.startsWith('/events/') && pathname !== '/events') return false;
  
  // These pages need authentication
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return true;
  if (pathname === '/profile') return true;
  if (pathname === '/complete-profile') return true; // Needs auth for wallet creation
  
  return false;
}

// Lazy load Privy provider ONLY when needed
const LazyPrivyProvider = dynamic(
  () => import('./PrivyInnerProvider'),
  { 
    ssr: false,
    loading: () => <>{/* No loading state - children render immediately */}</>
  }
);

// Create a context to expose auth state
interface AuthContextType {
  isAuthReady: boolean;
  loadAuth: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  isAuthReady: false, 
  loadAuth: () => {} 
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loadAuth, setLoadAuth] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Listen for manual auth load trigger (from login button clicks)
  useEffect(() => {
    const handleLoadAuth = () => {
      console.log('📢 Manual auth load triggered');
      setLoadAuth(true);
    };
    
    window.addEventListener('load-auth', handleLoadAuth);
    return () => window.removeEventListener('load-auth', handleLoadAuth);
  }, []);

  // Auto-load auth for pages that need it
  useEffect(() => {
    if (hasMounted && needsAuth(pathname)) {
      console.log(`🔐 Page needs auth: ${pathname}, loading...`);
      setLoadAuth(true);
    }
  }, [pathname, hasMounted]);

  const loadAuthManually = () => {
    console.log('🔓 Manual auth load requested');
    setLoadAuth(true);
  };

  // For public pages, don't load ANY auth code
  if (!hasMounted || !loadAuth) {
    return (
      <AuthContext.Provider value={{ isAuthReady: false, loadAuth: loadAuthManually }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // Only load Privy for pages that actually need authentication
  console.log('✅ Loading Privy provider...');
  return (
    <AuthContext.Provider value={{ isAuthReady: true, loadAuth: loadAuthManually }}>
      <LazyPrivyProvider>
        {children}
      </LazyPrivyProvider>
    </AuthContext.Provider>
  );
}