// lib/validation/production.ts

// Production configuration for LISK Mainnet
export const LISK_MAINNET_CONFIG = {
  CHAIN_ID: 1135,
  RPC_URLS: [
    'https://rpc.api.lisk.com',
    'https://lisk-rpc.publicnode.com'
  ],
  EXPLORER_URL: 'https://blockscout.lisk.com',
  NATIVE_CURRENCY: 'ETH',
  CHAIN_NAME: 'LISK Mainnet',
  REQUIRED_ENV_VARS: {
    MONGODB_URI: 'MongoDB connection string',
    PINATA_JWT: 'Pinata JWT for IPFS',
    PRIVY_APP_SECRET: 'Privy App Secret',
    GASLESS_PRIVATE_KEY: 'Private key for gasless transactions',
    NEXT_PUBLIC_CACKPASS_CORE_ADDRESS: 'Smart contract address',
    NEXT_PUBLIC_LISK_RPC_URL: 'LISK Mainnet RPC URL'
  }
} as const

// Validate if we're running in production mode
export function validateProductionEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check NODE_ENV
  if (process.env.NODE_ENV !== 'production') {
    errors.push('Running in non-production environment. Set NODE_ENV=production')
  }
  
  // Check required environment variables
  Object.entries(LISK_MAINNET_CONFIG.REQUIRED_ENV_VARS).forEach(([key, description]) => {
    if (!process.env[key]) {
      errors.push(`Missing ${key}: ${description}`)
    }
  })
  
  // Validate LISK Mainnet chain ID
  if (process.env.NEXT_PUBLIC_CHAIN_ID !== '1135') {
    errors.push(`Invalid chain ID: Expected 1135 (LISK Mainnet), got ${process.env.NEXT_PUBLIC_CHAIN_ID}`)
  }
  
  // Validate private key format (basic check)
  if (process.env.GASLESS_PRIVATE_KEY) {
    const pk = process.env.GASLESS_PRIVATE_KEY
    if (!pk.startsWith('0x') || pk.length !== 66) {
      errors.push('Invalid GASLESS_PRIVATE_KEY format. Must be 0x-prefixed 64 character hex string')
    }
  }
  
  // Validate contract address format
  if (process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS) {
    const addr = process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS
    if (!addr.startsWith('0x') || addr.length !== 42) {
      errors.push('Invalid contract address format')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Validate wallet address
export function isValidLiskAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Validate transaction hash
export function isValidTransactionHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash)
}

// Simple input sanitization
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .trim()
    .substring(0, 1000) // Limit length
}