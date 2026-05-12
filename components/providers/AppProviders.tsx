// /components/providers/AppProviders.tsx - REPLACE with this
'use client';

import { AuthProvider } from './AuthProvider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  // AuthProvider now handles conditional loading of Privy
  return <AuthProvider>{children}</AuthProvider>;
}