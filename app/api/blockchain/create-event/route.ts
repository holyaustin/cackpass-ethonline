// /app/api/blockchain/create-event/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { CackPassCoreABI } from '@/lib/contracts/abis/CackPassCore'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 [BLOCKCHAIN API] Creating event on-chain')
    
    // Check environment
    if (!process.env.GASLESS_PRIVATE_KEY) {
      return NextResponse.json(
        { success: false, error: 'Server configuration missing: GASLESS_PRIVATE_KEY' },
        { status: 500 }
      )
    }
    
    if (!process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS) {
      return NextResponse.json(
        { success: false, error: 'Server configuration missing: NEXT_PUBLIC_CACKPASS_CORE_ADDRESS' },
        { status: 500 }
      )
    }
    
    const body = await request.json()
    const { eventName, baseURI, startTime, endTime } = body
    
    console.log('Creating event:', { eventName, baseURI, startTime, endTime })
    
    // Setup provider and wallet
    const rpcUrl = process.env.NEXT_PUBLIC_LISK_RPC_URL || 'https://rpc.sepolia-api.lisk.com'
    console.log('Using RPC:', rpcUrl)
    
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(process.env.GASLESS_PRIVATE_KEY, provider)
    
    console.log('Gasless wallet:', wallet.address)
    
    // Check balance
    const balance = await provider.getBalance(wallet.address)
    console.log('Wallet balance:', ethers.formatEther(balance), 'ETH')
    
    if (balance === 0n) {
      return NextResponse.json({
        success: false,
        error: 'Gasless wallet has insufficient funds',
        walletAddress: wallet.address,
        balance: ethers.formatEther(balance),
        message: `Please send ETH to ${wallet.address}`
      }, { status: 400 })
    }
    
    // Create contract instance
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS,
      CackPassCoreABI,
      wallet
    )
    
    console.log('Sending transaction...')
    
    // Create event
    const tx = await contract.createEvent(
      eventName,
      baseURI,
      startTime,
      endTime,
      {
        gasLimit: 500000
      }
    )
    
    console.log('Transaction sent:', tx.hash)
    
    const receipt = await tx.wait()
    console.log('Transaction confirmed in block:', receipt.blockNumber)
    
    // Parse event creation from logs
    let eventId = 0
    const eventCreatedLog = receipt.logs?.find((log: any) => {
      const contractAddress = contract.target.toString().toLowerCase()
      const logAddress = log.address.toLowerCase()
      
      return (
        logAddress === contractAddress &&
        log.topics[0] === ethers.id('EventCreated(uint256,address,string,uint256,uint256)')
      )
    })
    
    if (eventCreatedLog) {
      try {
        const parsedLog = contract.interface.parseLog(eventCreatedLog)
        eventId = Number(parsedLog?.args.eventId || 0)
        console.log('Event created with ID:', eventId)
      } catch (parseError) {
        console.warn('Failed to parse event log:', parseError)
      }
    }
    
    return NextResponse.json({
      success: true,
      eventId,
      transactionHash: tx.hash,
      gasPaidBy: wallet.address,
      receipt: {
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'success' : 'failed',
        gasUsed: receipt.gasUsed?.toString()
      }
    })
    
  } catch (error: any) {
    console.error('❌ Blockchain API error:', {
      message: error.message,
      code: error.code,
      reason: error.reason,
      stack: error.stack
    })
    
    let userMessage = error.message
    if (error.code === 'INSUFFICIENT_FUNDS') {
      userMessage = 'Gasless wallet has insufficient funds'
    } else if (error.code === 'NETWORK_ERROR') {
      userMessage = 'Network error. Please check your RPC connection.'
    } else if (error.code === 'CALL_EXCEPTION') {
      userMessage = 'Contract call failed. Check contract address and ABI.'
    }
    
    return NextResponse.json({
      success: false,
      error: userMessage,
      code: error.code,
      reason: error.reason
    }, { status: 500 })
  }
}