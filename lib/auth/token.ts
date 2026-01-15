// lib/auth/token.ts

/**
 * Auth token management utilities for Privy
 */

/**
 * Get auth token from client-side
 * Note: In production, you should handle tokens via HttpOnly cookies
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Try to get token from localStorage (set by Privy after login)
  const token = localStorage.getItem('privy:auth_token');
  
  // If not found, try to get from Privy session
  if (!token) {
    const privySession = localStorage.getItem('privy:session');
    if (privySession) {
      try {
        const session = JSON.parse(privySession);
        return session.token || null;
      } catch {
        return null;
      }
    }
  }
  
  return token;
}

/**
 * Clear auth tokens on logout
 */
export function clearAuthTokens(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('privy:auth_token');
  localStorage.removeItem('privy:session');
  localStorage.removeItem('privy_token'); // Legacy token
}

/**
 * Store auth token after login
 */
export function storeAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('privy:auth_token', token);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Get wallet address from local storage
 */
export function getWalletAddress(): string | null {
  if (typeof window === 'undefined') return null;
  
  const walletData = localStorage.getItem('privy:embedded_wallet');
  if (walletData) {
    try {
      const wallet = JSON.parse(walletData);
      return wallet.address || null;
    } catch {
      return null;
    }
  }
  
  return null;
}