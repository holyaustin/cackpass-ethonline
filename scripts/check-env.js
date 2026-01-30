// scripts/check-env.js
require('dotenv').config({ path: '.env.local' })

console.log('🔍 Checking environment variables...\n')

const required = {
  'GASLESS_PRIVATE_KEY': process.env.GASLESS_PRIVATE_KEY,
  'NEXT_PUBLIC_CACKPASS_CORE_ADDRESS': process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS,
  'NEXT_PUBLIC_LISK_RPC_URL': process.env.NEXT_PUBLIC_LISK_RPC_URL,
  'PINATA_JWT': process.env.PINATA_JWT,
  'MONGODB_URI': process.env.MONGODB_URI,
  'PRIVY_APP_SECRET': process.env.PRIVY_APP_SECRET,
}

Object.entries(required).forEach(([key, value]) => {
  if (value) {
    const display = key.includes('PRIVATE') || key.includes('SECRET') || key.includes('JWT') 
      ? '***SET***' 
      : value.substring(0, 20) + '...'
    console.log(`✅ ${key}: ${display}`)
  } else {
    console.log(`❌ ${key}: MISSING`)
  }
})

// Try to create wallet from private key
if (process.env.GASLESS_PRIVATE_KEY) {
  try {
    const { Wallet } = require('ethers')
    const wallet = new Wallet(process.env.GASLESS_PRIVATE_KEY)
    console.log(`\n💰 Gasless wallet address: ${wallet.address}`)
    
    // Check if it starts with 0x
    if (!process.env.GASLESS_PRIVATE_KEY.startsWith('0x')) {
      console.log('⚠️  WARNING: GASLESS_PRIVATE_KEY should start with 0x')
    }
  } catch (error) {
    console.log(`\n❌ Invalid GASLESS_PRIVATE_KEY: ${error.message}`)
  }
}