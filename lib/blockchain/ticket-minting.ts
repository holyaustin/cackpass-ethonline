// /lib/blockchain/ticket-minting.ts - COMPLETE FIXED VERSION WITH TYPE SAFETY
import { ethers } from 'ethers'
import { CackPassCoreABI } from '@/lib/contracts/abis/CackPassCore'

// ============================================
// CRITICAL FIX: Load environment variables
// ============================================
// Next.js loads .env.local automatically, but we need to ensure it's loaded
// for server-side modules. In development, we can explicitly load it.
if (process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
  try {
    // Dynamically import dotenv only on server-side
    const dotenv = require('dotenv')
    const path = require('path')
    
    // Load .env.local from project root
    const envPath = path.resolve(process.cwd(), '.env.local')
    const result = dotenv.config({ path: envPath })
    
    if (result.error) {
      console.warn('⚠️ Could not load .env.local:', result.error.message)
    } else {
      console.log('✅ Successfully loaded .env.local for blockchain module')
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.warn('⚠️ Could not load dotenv:', errorMessage)
  }
}

// Debug log to verify environment variables are loaded
console.log('\n=== BLOCKCHAIN MODULE DEBUG ===')
console.log('Module loaded at:', new Date().toISOString())
console.log('Runtime environment check:')
console.log('  NODE_ENV:', process.env.NODE_ENV)
console.log('  GASLESS_PRIVATE_KEY exists:', !!process.env.GASLESS_PRIVATE_KEY)
console.log('  GASLESS_PRIVATE_KEY length:', process.env.GASLESS_PRIVATE_KEY?.length)
console.log('  NEXT_PUBLIC_CACKPASS_CORE_ADDRESS exists:', !!process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS)
console.log('  NEXT_PUBLIC_LISK_RPC_URL:', process.env.NEXT_PUBLIC_LISK_RPC_URL)
console.log('  NEXT_PUBLIC_CHAIN_ID:', process.env.NEXT_PUBLIC_CHAIN_ID)
console.log('================================\n')

// ============================================
// TypeScript Interfaces
// ============================================
export enum TicketCategory {
  GeneralAdmission = 0,
  ReservedSeating = 1,
  VIPPremium = 2,
  Others = 3
}

interface MintTicketParams {
  recipient: string
  eventId: number
  ticketCategory: TicketCategory
  amount: number
  price: bigint
  validUntil: number
  approvalId: string
  signature: string
}

interface CreateEventParams {
  eventName: string
  baseURI: string
  startTime: number
  endTime: number
}

interface AddTicketTypeParams {
  eventId: number
  category: TicketCategory
  maxTickets: number
  ticketPrice: bigint
}

// ============================================
// Configuration Validation
// ============================================
function validateEnvironment(): void {
  const errors: string[] = []
  
  if (!process.env.GASLESS_PRIVATE_KEY) {
    errors.push('GASLESS_PRIVATE_KEY is not set in environment variables')
  } else if (!process.env.GASLESS_PRIVATE_KEY.startsWith('0x')) {
    errors.push('GASLESS_PRIVATE_KEY must start with 0x')
  } else if (process.env.GASLESS_PRIVATE_KEY.length !== 66) {
    errors.push(`GASLESS_PRIVATE_KEY should be 66 characters (got ${process.env.GASLESS_PRIVATE_KEY.length})`)
  }
  
  if (!process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS) {
    errors.push('NEXT_PUBLIC_CACKPASS_CORE_ADDRESS is not set')
  } else if (!ethers.isAddress(process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS)) {
    errors.push('NEXT_PUBLIC_CACKPASS_CORE_ADDRESS is not a valid Ethereum address')
  }
  
  if (!process.env.NEXT_PUBLIC_LISK_RPC_URL) {
    console.warn('⚠️ NEXT_PUBLIC_LISK_RPC_URL not set, using default')
  }
  
  if (errors.length > 0) {
    console.error('❌ Environment validation errors:')
    errors.forEach(error => console.error('   -', error))
    throw new Error(`Environment validation failed: ${errors.join(', ')}`)
  }
}

// Run validation when module loads
try {
  validateEnvironment()
  console.log('✅ Environment validation passed')
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown validation error'
  console.error('❌ Environment validation failed on module load:', errorMessage)
}

// ============================================
// Wallet and Provider Management
// ============================================
let gaslessWallet: ethers.Wallet | null = null
let provider: ethers.JsonRpcProvider | null = null

function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    const rpcUrl = process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.network'
    console.log('🔗 Creating RPC provider for:', rpcUrl)
    provider = new ethers.JsonRpcProvider(rpcUrl)
    
    // Test connection
    provider.getNetwork().then(network => {
      console.log('✅ Connected to network:', network.name, '(Chain ID:', network.chainId + ')')
    }).catch(error => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown network error'
      console.error('❌ Failed to connect to RPC:', errorMessage)
    })
  }
  return provider
}

function getGaslessWallet(): ethers.Wallet {
  if (!gaslessWallet) {
    const privateKey = process.env.GASLESS_PRIVATE_KEY!
    
    try {
      gaslessWallet = new ethers.Wallet(privateKey, getProvider())
      console.log('💰 Gasless wallet initialized:', gaslessWallet.address)
      
      // Check balance in background
      getProvider().getBalance(gaslessWallet.address).then(balance => {
        console.log('   Balance:', ethers.formatEther(balance), 'ETH')
        if (balance === 0n) {
          console.warn('⚠️  WARNING: Gasless wallet has 0 ETH!')
          console.log('   Send test ETH to:', gaslessWallet!.address)
        }
      }).catch(error => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown balance error'
        console.warn('⚠️  Could not check wallet balance:', errorMessage)
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown wallet creation error'
      console.error('❌ Failed to create gasless wallet:', errorMessage)
      throw new Error(`Invalid GASLESS_PRIVATE_KEY: ${errorMessage}`)
    }
  }
  return gaslessWallet
}

function getCackPassCoreContract() {
  const contractAddress = process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS!
  const wallet = getGaslessWallet()
  
  console.log('📝 Creating contract instance:')
  console.log('   Contract:', contractAddress)
  console.log('   Signer:', wallet.address)
  
  return new ethers.Contract(contractAddress, CackPassCoreABI, wallet)
}

// ============================================
// Blockchain Functions
// ============================================
export async function createEventOnChain(params: CreateEventParams): Promise<{
  success: boolean;
  transactionHash?: string;
  receipt?: {
    blockNumber: number;
    status: string;
    gasUsed?: string;
  };
  eventId?: number;
  gasPaidBy?: string;
  error?: string;
  details?: {
    code?: string;
    reason?: string;
    transactionHash?: string;
  };
}> {
  try {
    console.log('\n🎫 Creating event on blockchain:')
    console.log('   Name:', params.eventName)
    console.log('   Base URI:', params.baseURI.substring(0, 50) + '...')
    console.log('   Start:', new Date(params.startTime * 1000).toISOString())
    console.log('   End:', new Date(params.endTime * 1000).toISOString())
    
    const contract = getCackPassCoreContract()
    
    console.log('⛽ Sending transaction...')
    const tx = await contract.createEvent(
      params.eventName,
      params.baseURI,
      params.startTime,
      params.endTime,
      {
        gasLimit: 500000
      }
    )
    
    console.log('📝 Transaction sent:', tx.hash)
    console.log('⏳ Waiting for confirmation...')
    
    const receipt = await tx.wait()
    
    if (!receipt) {
      throw new Error('Transaction receipt not found')
    }
    
    console.log('✅ Transaction confirmed:')
    console.log('   Block:', receipt.blockNumber)
    console.log('   Gas used:', receipt.gasUsed?.toString())
    console.log('   Status:', receipt.status === 1 ? 'success' : 'failed')
    
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
        console.log('🎫 Event created with ID:', eventId)
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error'
        console.warn('Failed to parse event log:', errorMessage)
        // Fallback: Try to extract from transaction
        if (tx.hash && !eventId) {
          console.log('Using transaction hash as fallback event identifier')
        }
      }
    }
    
    return {
      success: true,
      transactionHash: tx.hash,
      receipt: {
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'success' : 'failed',
        gasUsed: receipt.gasUsed?.toString()
      },
      eventId,
      gasPaidBy: getGaslessWallet().address
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = (error as any)?.code
    const errorReason = (error as any)?.reason
    const transactionHash = (error as any)?.transactionHash
    
    console.error('\n❌ Event creation failed:', {
      message: errorMessage,
      code: errorCode,
      reason: errorReason,
      transactionHash,
      transaction: (error as any)?.transaction
    })
    
    // Provide helpful error messages
    let userMessage = errorMessage
    
    if (errorCode === 'INSUFFICIENT_FUNDS') {
      const walletAddress = getGaslessWallet().address
      userMessage = `Gasless wallet has insufficient funds. Please send ETH to: ${walletAddress}`
    } else if (errorCode === 'NETWORK_ERROR' || errorMessage.includes('fetch failed')) {
      userMessage = 'Network error. Please check your RPC URL and internet connection.'
    } else if (errorCode === 'CALL_EXCEPTION') {
      userMessage = 'Contract call failed. The contract may not be deployed or ABI is incorrect.'
    } else if (errorMessage.includes('nonce')) {
      userMessage = 'Transaction nonce error. Please try again in a moment.'
    }
    
    return { 
      success: false, 
      error: userMessage,
      details: {
        code: errorCode,
        reason: errorReason,
        transactionHash
      }
    }
  }
}

export async function addTicketType(params: AddTicketTypeParams): Promise<{
  success: boolean;
  transactionHash?: string;
  receipt?: {
    blockNumber: number;
    status: string;
  };
  gasPaidBy?: string;
  error?: string;
  details?: {
    code?: string;
    reason?: string;
  };
}> {
  try {
    console.log('\n➕ Adding ticket type to event:', params.eventId)
    console.log('   Category:', TicketCategory[params.category])
    console.log('   Max tickets:', params.maxTickets === 0 ? 'Unlimited' : params.maxTickets)
    console.log('   Price:', ethers.formatEther(params.ticketPrice), 'ETH')
    
    const contract = getCackPassCoreContract()
    
    const tx = await contract.addTicketType(
      params.eventId,
      params.category,
      params.maxTickets,
      params.ticketPrice,
      {
        gasLimit: 300000
      }
    )
    
    console.log('📝 Ticket type transaction sent:', tx.hash)
    const receipt = await tx.wait()
    
    if (!receipt) {
      throw new Error('Transaction receipt not found')
    }
    
    console.log('✅ Ticket type added successfully')
    console.log('   Block:', receipt.blockNumber)
    console.log('   Gas used:', receipt.gasUsed?.toString())
    
    return {
      success: true,
      transactionHash: tx.hash,
      receipt: {
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'success' : 'failed'
      },
      gasPaidBy: getGaslessWallet().address
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = (error as any)?.code
    const errorReason = (error as any)?.reason
    
    console.error('Add ticket type error:', errorMessage)
    return { 
      success: false, 
      error: errorMessage,
      details: {
        code: errorCode,
        reason: errorReason
      }
    }
  }
}

export async function mintTicketWithApproval(params: MintTicketParams): Promise<{
  success: boolean;
  transactionHash?: string;
  receipt?: {
    blockNumber: number;
    status: string;
  };
  ticketId?: number;
  gasPaidBy?: string;
  error?: string;
  details?: {
    code?: string;
    reason?: string;
  };
}> {
  try {
    console.log('\n🎫 Minting ticket with approval:')
    console.log('   Recipient:', params.recipient)
    console.log('   Event ID:', params.eventId)
    console.log('   Category:', TicketCategory[params.ticketCategory])
    console.log('   Amount:', params.amount)
    console.log('   Price:', ethers.formatEther(params.price), 'ETH')
    
    const contract = getCackPassCoreContract()
    
    // Prepare approval struct
    const approval = {
      recipient: params.recipient,
      eventId: params.eventId,
      ticketCategory: params.ticketCategory,
      amount: params.amount,
      price: params.price,
      validUntil: params.validUntil,
      id: params.approvalId
    }
    
    const tx = await contract.mintWithApproval(
      approval,
      params.signature,
      {
        gasLimit: 400000
      }
    )
    
    console.log('📝 Mint transaction sent:', tx.hash)
    const receipt = await tx.wait()
    
    if (!receipt) {
      throw new Error('Transaction receipt not found')
    }
    
    // Parse ticket minted event
    let ticketId = 0
    const ticketMintedLog = receipt.logs?.find((log: any) => {
      const contractAddress = contract.target.toString().toLowerCase()
      const logAddress = log.address.toLowerCase()
      
      return (
        logAddress === contractAddress &&
        log.topics[0] === ethers.id('TicketMinted(address,uint256,uint256,uint8,uint256,uint256)')
      )
    })
    
    if (ticketMintedLog) {
      try {
        const parsedLog = contract.interface.parseLog(ticketMintedLog)
        ticketId = Number(parsedLog?.args.ticketId || 0)
        console.log('✅ Ticket minted with ID:', ticketId)
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error'
        console.warn('Failed to parse ticket minted log:', errorMessage)
      }
    }
    
    console.log('   Block:', receipt.blockNumber)
    console.log('   Gas used:', receipt.gasUsed?.toString())
    
    return {
      success: true,
      transactionHash: tx.hash,
      receipt: {
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'success' : 'failed'
      },
      ticketId,
      gasPaidBy: getGaslessWallet().address
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = (error as any)?.code
    const errorReason = (error as any)?.reason
    
    console.error('Ticket minting error:', errorMessage)
    return { 
      success: false, 
      error: errorMessage,
      details: {
        code: errorCode,
        reason: errorReason
      }
    }
  }
}

// ============================================
// Helper Functions
// ============================================
export function getTicketId(eventId: number, category: TicketCategory): number {
  return eventId * 10**18 + category
}

export function generateApprovalId(): string {
  return ethers.id(Date.now().toString() + Math.random().toString())
}

export function isFreeEvent(priceAmount: string): boolean {
  return parseFloat(priceAmount) === 0
}

export function createTicketMetadata(
  eventData: any,
  imageCid: string,
  ticketType: string,
  price: string,
  category: TicketCategory
) {
  return {
    name: `${eventData.eventName} - ${ticketType}`,
    description: eventData.description,
    image: imageCid ? `ipfs://${imageCid}` : '',
    external_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.com'}/tickets`,
    attributes: [
      {
        trait_type: "Event",
        value: eventData.eventName
      },
      {
        trait_type: "Category",
        value: ticketType
      },
      {
        trait_type: "Ticket Category ID",
        value: category.toString()
      },
      {
        trait_type: "Price",
        value: price
      },
      {
        trait_type: "Location",
        value: eventData.location
      },
      {
        trait_type: "Date",
        value: `${eventData.startDate} ${eventData.startTime}`
      },
      {
        trait_type: "Is Virtual",
        value: eventData.showVirtualOptions ? "Yes" : "No"
      },
      {
        trait_type: "Is Free",
        value: price === '0' ? "Yes" : "No"
      }
    ]
  }
}

// ============================================
// Test Function (for debugging)
// ============================================
export async function testBlockchainConnection(): Promise<{
  success: boolean;
  network?: {
    name: string;
    chainId: number;
  };
  wallet?: {
    address: string;
    balance: string;
    hasFunds: boolean;
  };
  blockNumber?: number;
  error?: string;
}> {
  try {
    console.log('\n🔧 Testing blockchain connection...')
    
    const wallet = getGaslessWallet()
    const provider = getProvider()
    
    const [network, balance, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBalance(wallet.address),
      provider.getBlockNumber()
    ])
    
    console.log('✅ Connection test successful:')
    console.log('   Network:', network.name, '(Chain ID:', network.chainId + ')')
    console.log('   Latest block:', blockNumber)
    console.log('   Wallet:', wallet.address)
    console.log('   Balance:', ethers.formatEther(balance), 'ETH')
    console.log('   Has funds:', balance > 0n)
    
    return {
      success: true,
      network: {
        name: network.name,
        chainId: Number(network.chainId)
      },
      wallet: {
        address: wallet.address,
        balance: ethers.formatEther(balance),
        hasFunds: balance > 0n
      },
      blockNumber
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Blockchain connection test failed:', errorMessage)
    return {
      success: false,
      error: errorMessage
    }
  }
}

// ============================================
// Initialize on module load (development only)
// ============================================
if (process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
  console.log('\n🚀 Blockchain module initialization...')
  
  // Test connection in background (non-blocking)
  setTimeout(() => {
    testBlockchainConnection().then(result => {
      if (!result.success) {
        console.error('❌ Blockchain initialization failed')
      } else if (result.wallet && !result.wallet.hasFunds) {
        console.warn('⚠️  Gasless wallet has no ETH. Send funds to:', result.wallet.address)
      }
    }).catch(error => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error'
      console.error('❌ Blockchain initialization error:', errorMessage)
    })
  }, 1000)
}