// lib/validation/production.ts

// Production configuration for Arc Testnet
export const ARC_TESTNET_CONFIG = {
  CHAIN_ID: 5042002,
  RPC_URLS: [
    'https://rpc.testnet.arc.network',
    'https://rpc.testnet.arc.io'
  ],
  EXPLORER_URL: 'https://testnet.arcscan.app',
  NATIVE_CURRENCY: 'USDC',
  CHAIN_NAME: 'Arc Testnet',
  REQUIRED_ENV_VARS: {
    MONGODB_URI: 'MongoDB connection string',
    PINATA_JWT: 'Pinata JWT for IPFS',
    PRIVY_APP_SECRET: 'Privy App Secret',
    GASLESS_PRIVATE_KEY: 'Private key for gasless transactions',
    NEXT_PUBLIC_ARC_CONTRACT_ADDRESS: 'Smart contract address',
    NEXT_PUBLIC_ARC_RPC_URL: 'Arc Testnet RPC URL'
  }
} as const

// Validate production environment
export function validateProductionEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (process.env.NODE_ENV !== 'production') {
    errors.push('Running in non-production environment. Set NODE_ENV=production')
  }
  
  Object.entries(ARC_TESTNET_CONFIG.REQUIRED_ENV_VARS).forEach(([key, description]) => {
    if (!process.env[key]) {
      errors.push(`Missing ${key}: ${description}`)
    }
  })
  
  if (process.env.NEXT_PUBLIC_ARC_CHAIN_ID !== '5042002') {
    errors.push(`Invalid chain ID: Expected 5042002 (Arc Testnet), got ${process.env.NEXT_PUBLIC_ARC_CHAIN_ID}`)
  }
  
  if (process.env.GASLESS_PRIVATE_KEY) {
    const pk = process.env.GASLESS_PRIVATE_KEY
    if (!pk.startsWith('0x') || pk.length !== 66) {
      errors.push('Invalid GASLESS_PRIVATE_KEY format. Must be 0x-prefixed 64 character hex string')
    }
  }
  
  if (process.env.NEXT_PUBLIC_ARC_CONTRACT_ADDRESS) {
    const addr = process.env.NEXT_PUBLIC_ARC_CONTRACT_ADDRESS
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
export function isValidArcAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Validate transaction hash
export function isValidTransactionHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash)
}

// Simple input sanitization
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .trim()
    .substring(0, 1000)
}