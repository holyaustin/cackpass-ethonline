// /app/api/test/rpc/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

export async function GET(request: NextRequest) {
  const rpcUrls = [
    'https://lisk-sepolia.drpc.org',
    'https://rpc.sepolia-api.lisk.com',
    'https://4202.rpc.thirdweb.com',
    'https://lisk-sepolia.rpc.caldera.xyz/http',
    'https://jsonrpc.sepolia.lisk.com',
  ]

  const results = []

  for (const rpcUrl of rpcUrls) {
    try {
      console.log(`Testing RPC: ${rpcUrl}`)
      const startTime = Date.now()
      
      // Create provider with proper options for ethers v6
      const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
        batchMaxCount: 1,
        staticNetwork: null,
        cacheTimeout: -1,
        pollingInterval: 1000,
      })
      
      // Set custom timeout using Promise.race
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout after 5000ms')), 5000)
      })
      
      const [network, blockNumber] = await Promise.race([
        Promise.all([
          provider.getNetwork(),
          provider.getBlockNumber(),
        ]),
        timeoutPromise
      ]) as [ethers.Network, number]
      
      const endTime = Date.now()
      const responseTime = endTime - startTime
      
      results.push({
        url: rpcUrl,
        status: '✅ SUCCESS',
        network: `${network.name} (Chain ID: ${network.chainId})`,
        blockNumber,
        responseTime: `${responseTime}ms`,
      })
      
      console.log(`✅ ${rpcUrl}: Connected in ${responseTime}ms`)
      
    } catch (error: any) {
      results.push({
        url: rpcUrl,
        status: '❌ FAILED',
        error: error.message,
        code: error.code,
      })
      console.log(`❌ ${rpcUrl}: ${error.message}`)
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    results,
    recommendation: results.find(r => r.status === '✅ SUCCESS') 
      ? 'Use first successful RPC'
      : 'All RPCs failed - check network connectivity'
  })
}