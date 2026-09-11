// /app/api/blockchain/create-event/route.ts - UPDATED FOR ethers v6
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { CackPassCoreABI } from '@/lib/contracts/abis/CackPassCore'
import { connectDB } from '@/lib/database/connection'
import { TicketType, Event } from '@/lib/database/models'

const ARC_TESTNET_CONFIG = {
  CHAIN_ID: 5042002,
  RPC_URL: 'https://rpc.testnet.arc.network',
  EXPLORER_URL: 'https://testnet.arcscan.app',
  GAS_LIMIT: 500000,
  NATIVE_CURRENCY: 'USDC'
} as const

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 [BLOCKCHAIN API] Creating event on Arc Testnet')
    
    // Validate critical environment variables with proper type checking
    const requiredEnvVars = {
      GASLESS_PRIVATE_KEY: process.env.GASLESS_PRIVATE_KEY,
      NEXT_PUBLIC_CACKPASS_CORE_ADDRESS: process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS
    }
    
    // Check if any required variables are missing
    const missingVars = Object.entries(requiredEnvVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key)
    
    if (missingVars.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required environment variables: ${missingVars.join(', ')}`,
        action: 'Please configure all required environment variables for Arc Testnet'
      }, { status: 500 })
    }
    
    // TypeScript now knows these are not undefined
    const GASLESS_PRIVATE_KEY = requiredEnvVars.GASLESS_PRIVATE_KEY!
    const CONTRACT_ADDRESS = requiredEnvVars.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS!
    
    const body = await request.json()
    const { eventName, baseURI, startTime, endTime, category = 'GeneralAdmission', price = '0' } = body
    
    console.log('Creating event:', { 
      eventName, 
      baseURI: baseURI?.slice(0, 50) + '...',
      startTime,
      endTime,
      category,
      price
    })
    
    // Basic input validation
    if (!eventName || eventName.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Event name is required'
      }, { status: 400 })
    }
    
    if (!baseURI || !baseURI.startsWith('ipfs://')) {
      return NextResponse.json({
        success: false,
        error: 'Valid IPFS URI (starting with ipfs://) is required'
      }, { status: 400 })
    }
    
    if (!startTime || !endTime || startTime >= endTime) {
      return NextResponse.json({
        success: false,
        error: 'Valid start and end times are required (end time must be after start time)'
      }, { status: 400 })
    }
    
    // Setup provider and wallet for Arc Testnet
    const rpcUrl = process.env.NEXT_PUBLIC_ARC_RPC_URL || ARC_TESTNET_CONFIG.RPC_URL
    const provider = new ethers.JsonRpcProvider(rpcUrl, ARC_TESTNET_CONFIG.CHAIN_ID)
    const wallet = new ethers.Wallet(GASLESS_PRIVATE_KEY, provider)
    
    console.log('Gasless wallet:', wallet.address)
    console.log('Contract address:', CONTRACT_ADDRESS)
    console.log('Network: Arc Testnet (Chain ID:', ARC_TESTNET_CONFIG.CHAIN_ID, ')')
    
    // Check wallet balance
    const balance = await provider.getBalance(wallet.address)
    const balanceInEth = ethers.formatEther(balance)
    console.log('Wallet balance:', balanceInEth, 'ETH')
    
    if (balance === 0n) {
      return NextResponse.json({
        success: false,
        error: 'Gasless wallet has insufficient funds',
        walletAddress: wallet.address,
        balance: balanceInEth,
        network: 'Arc Testnet',
        message: `Please send ${ARC_TESTNET_CONFIG.NATIVE_CURRENCY} to ${wallet.address} on Arc Testnet`
      }, { status: 400 })
    }
    
    // Create contract instance - CONTRACT_ADDRESS is guaranteed to be defined
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CackPassCoreABI,
      wallet
    )
    
    console.log('Sending transaction to Arc Testnet...')
    
    // Create event with appropriate gas settings
    const tx = await contract.createEvent(
      eventName,
      baseURI,
      startTime,
      endTime,
      {
        gasLimit: ARC_TESTNET_CONFIG.GAS_LIMIT
      }
    )
    
    console.log('Transaction sent:', tx.hash)
    console.log('Explorer URL:', `${ARC_TESTNET_CONFIG.EXPLORER_URL}/tx/${tx.hash}`)
    
    const receipt = await tx.wait()
    console.log('Transaction confirmed in block:', receipt.blockNumber)
    
    // Parse event creation from logs
    let eventId = 0
    const eventCreatedSignature = ethers.id('EventCreated(uint256,address,string,uint256,uint256)')
    
    for (const log of receipt.logs || []) {
      if (log.topics[0] === eventCreatedSignature) {
        try {
          const parsedLog = contract.interface.parseLog(log)
          eventId = Number(parsedLog?.args.eventId || 0)
          console.log('Event created with ID:', eventId)
          break
        } catch (parseError) {
          console.warn('Failed to parse event log:', parseError)
        }
      }
    }
    
    // CRITICAL FIX: Create TicketType in database for blockchain events
    let dbTicketTypeId = null
    try {
      await connectDB()
      
      // Create a TicketType in database for this blockchain event
      const ticketType = new TicketType({
        eventId: eventId.toString(),
        name: `${eventName} - ${category}`,
        category: category,
        price: parseFloat(price),
        maxSupply: 0, // Default to unlimited for blockchain events initially
        currentSupply: 0,
        isActive: true,
        isOnChain: true,
        onChainId: eventId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      await ticketType.save()
      dbTicketTypeId = ticketType._id
      console.log('✅ Database TicketType created for blockchain event:', dbTicketTypeId)
      
    } catch (dbError) {
      console.error('❌ Failed to create database TicketType:', dbError)
      // Don't fail the whole process, just log the error
    }
    
    return NextResponse.json({
      success: true,
      eventId,
      transactionHash: tx.hash,
      explorerUrl: `${ARC_TESTNET_CONFIG.EXPLORER_URL}/tx/${tx.hash}`,
      gasPaidBy: wallet.address,
      network: 'Arc Testnet',
      chainId: ARC_TESTNET_CONFIG.CHAIN_ID,
      // Add database info
      database: {
        ticketTypeCreated: dbTicketTypeId !== null,
        ticketTypeId: dbTicketTypeId
      },
      receipt: {
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'success' : 'failed',
        gasUsed: receipt.gasUsed?.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString()
      }
    })
    
  } catch (error: any) {
    console.error('❌ Arc Testnet Blockchain API error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
    
    // User-friendly error messages
    let userMessage = 'Transaction failed on Arc Testnet'
    let statusCode = 500
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      userMessage = 'Gasless wallet has insufficient funds for Arc Testnet'
      statusCode = 400
    } else if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
      userMessage = 'Network error. Please check Arc Testnet RPC connection.'
      statusCode = 503
    } else if (error.code === 'CALL_EXCEPTION') {
      userMessage = 'Contract call failed. Check contract address and ABI.'
      statusCode = 400
    } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      userMessage = 'Transaction simulation failed'
      statusCode = 400
    } else if (error.message.includes('invalid address')) {
      userMessage = 'Invalid contract address format'
      statusCode = 400
    }
    
    return NextResponse.json({
      success: false,
      error: userMessage,
      code: error.code,
      network: 'Arc Testnet',
      timestamp: new Date().toISOString()
    }, { status: statusCode })
  }
}

// GET endpoint to check Arc Testnet status - FIXED FOR ethers v6
export async function GET(request: NextRequest) {
  try {
    // Check required environment variables
    if (!process.env.GASLESS_PRIVATE_KEY || !process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS) {
      return NextResponse.json({
        success: false,
        error: 'Missing required environment variables',
        missing: [
          !process.env.GASLESS_PRIVATE_KEY && 'GASLESS_PRIVATE_KEY',
          !process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS && 'NEXT_PUBLIC_CACKPASS_CORE_ADDRESS'
        ].filter(Boolean)
      }, { status: 500 })
    }
    
    const rpcUrl = process.env.NEXT_PUBLIC_ARC_RPC_URL || ARC_TESTNET_CONFIG.RPC_URL
    const provider = new ethers.JsonRpcProvider(rpcUrl, ARC_TESTNET_CONFIG.CHAIN_ID)
    
    // Get wallet address from private key
    const wallet = new ethers.Wallet(process.env.GASLESS_PRIVATE_KEY)
    const walletAddress = wallet.address
    
    const [network, blockNumber, feeData, balance] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber(),
      provider.getFeeData(), // FIXED: Changed from getGasPrice() to getFeeData()
      provider.getBalance(walletAddress)
    ])
    
    const balanceInEth = ethers.formatEther(balance)
    
    // Format gas prices from fee data
    const gasPriceInfo = {
      gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') + ' gwei' : 'Unknown',
      maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') + ' gwei' : 'Unknown',
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') + ' gwei' : 'Unknown'
    }
    
    return NextResponse.json({
      success: true,
      network: {
        name: network.name,
        chainId: network.chainId,
        blockNumber,
        ...gasPriceInfo,
        rpcUrl
      },
      wallet: {
        address: walletAddress,
        balance: balanceInEth,
        hasSufficientFunds: balance > ethers.parseEther('0.01'),
        recommendedMinBalance: '0.1 ETH'
      },
      contract: {
        address: process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS,
        isConfigured: true
      },
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('Arc Testnet status check error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check Arc Testnet status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      network: 'Arc Testnet',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}