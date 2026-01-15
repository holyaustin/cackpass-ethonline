// lib/api/constants.ts

// Use environment variable to toggle mock data
export const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'

// API endpoints
export const API_ENDPOINTS = {
  // User endpoints
  USER_PROFILE: '/api/user/profile',
  USER_AUTH: '/api/auth/user',
  
  // Event endpoints
  EVENTS: '/api/events',
  EVENT_CREATE: '/api/events/create',
  EVENT_DETAIL: (id: string) => `/api/events/${id}`,
  
  // Ticket endpoints
  TICKETS: '/api/tickets',
  TICKET_PURCHASE: '/api/tickets/purchase',
  
  // Wallet endpoints
  WALLET_BALANCE: '/api/wallet/balance',
  WALLET_FUND: '/api/wallet/fund',
  
  // IPFS endpoints
  IPFS_UPLOAD: '/api/ipfs/upload',
  IPFS_SIGNED_URL: '/api/ipfs/signed-url',
}

// Common headers for API calls
export const API_HEADERS = {
  'Content-Type': 'application/json',
}

// Add authorization header helper
export const getAuthHeaders = (token?: string) => {
  const headers: Record<string, string> = { ...API_HEADERS }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}