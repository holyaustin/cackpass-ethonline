// /app/api/debug/env/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 })
  }

  // Check if variables are set (without exposing private keys)
  const envVars = {
    hasGaslessPrivateKey: !!process.env.GASLESS_PRIVATE_KEY,
    hasContractAddress: !!process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS,
    hasRpcUrl: !!process.env.NEXT_PUBLIC_LISK_RPC_URL,
    gaslessWalletAddress: process.env.GASLESS_PRIVATE_KEY ? 
      new (await import('ethers')).Wallet(process.env.GASLESS_PRIVATE_KEY).address : null,
    contractAddress: process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS,
    rpcUrl: process.env.NEXT_PUBLIC_LISK_RPC_URL,
    chainId: process.env.NEXT_PUBLIC_CHAIN_ID,
    nodeEnv: process.env.NODE_ENV,
    // Check other critical variables
    hasPinataJwt: !!process.env.PINATA_JWT,
    hasMongoUri: !!process.env.MONGODB_URI,
    hasPrivySecret: !!process.env.PRIVY_APP_SECRET,
  }

  return NextResponse.json(envVars)
}