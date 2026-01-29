// /lib/blockchain/ticket-minting.ts - UPDATED WITH BETTER ERROR HANDLING
import { ethers } from 'ethers'
import { CackPassCoreABI } from '@/lib/contracts/abis/CackPassCore'

// Ticket categories enum to match contract
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

// Gasless wallet for paying gas fees
let gaslessWallet: ethers.Wallet | null = null

// Initialize provider and gasless wallet
function getProvider() {
  const rpcUrl = process.env.NEXT_PUBLIC_LISK_RPC_URL || 'https://rpc.sepolia-api.lisk.com'
  console.log('🔗 Using RPC URL:', rpcUrl)
  return new ethers.JsonRpcProvider(rpcUrl)
}

function getGaslessWallet(): ethers.Wallet {
  if (!gaslessWallet) {
    const provider = getProvider()
    const privateKey = process.env.GASLESS_PRIVATE_KEY
    
    if (!privateKey) {
      console.error('❌ GASLESS_PRIVATE_KEY is not set in environment variables')
      console.log('💡 Please add GASLESS_PRIVATE_KEY to your .env.local file')
      console.log('💡 Generate one with: ethers.Wallet.createRandom().privateKey')
      throw new Error('GASLESS_PRIVATE_KEY environment variable is required for gasless transactions')
    }
    
    // Validate private key format
    if (!privateKey.startsWith('0x')) {
      throw new Error('GASLESS_PRIVATE_KEY must start with 0x')
    }
    
    gaslessWallet = new ethers.Wallet(privateKey, provider)
    console.log('💰 Gasless wallet address:', gaslessWallet.address)
  }
  return gaslessWallet
}

// Get contract instance
function getCackPassCoreContract() {
  const contractAddress = process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS
  if (!contractAddress) {
    console.error('❌ NEXT_PUBLIC_CACKPASS_CORE_ADDRESS is not set')
    throw new Error('NEXT_PUBLIC_CACKPASS_CORE_ADDRESS environment variable is required')
  }
  
  // Validate contract address
  if (!ethers.isAddress(contractAddress)) {
    throw new Error('NEXT_PUBLIC_CACKPASS_CORE_ADDRESS is not a valid Ethereum address')
  }
  
  const wallet = getGaslessWallet()
  console.log('📝 Creating contract instance with address:', contractAddress)
  return new ethers.Contract(contractAddress, CackPassCoreABI, wallet)
}

// Create a new event on-chain
export async function createEventOnChain(params: CreateEventParams) {
  try {
    console.log('🔗 Creating event on blockchain with params:', params)
    
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
    
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber)
    
    // Parse event creation from logs
    const eventCreatedLog = receipt.logs?.find((log: any) => {
      const contractAddress = contract.target.toString().toLowerCase()
      const logAddress = log.address.toLowerCase()
      
      return (
        logAddress === contractAddress &&
        log.topics[0] === ethers.id('EventCreated(uint256,address,string,uint256,uint256)')
      )
    })
    
    let eventId = 0
    if (eventCreatedLog) {
      try {
        const parsedLog = contract.interface.parseLog(eventCreatedLog)
        eventId = Number(parsedLog?.args.eventId || 0)
        console.log('🎫 Event created with ID:', eventId)
      } catch (parseError) {
        console.warn('Failed to parse event log:', parseError)
      }
    }
    
    return {
      success: true,
      transactionHash: tx.hash,
      receipt,
      eventId,
      gasPaidBy: getGaslessWallet().address
    }
  } catch (error: any) {
    console.error('❌ Event creation error:', {
      message: error.message,
      code: error.code,
      reason: error.reason,
      stack: error.stack
    })
    
    // Provide more helpful error messages
    let errorMessage = error.message
    if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = 'Gasless wallet has insufficient funds. Please send ETH to: ' + getGaslessWallet().address
    } else if (error.code === 'CALL_EXCEPTION') {
      errorMessage = 'Contract call failed. Check contract address and parameters.'
    }
    
    return { 
      success: false, 
      error: errorMessage,
      originalError: error.message
    }
  }
}

// Add ticket type to existing event
export async function addTicketType(params: AddTicketTypeParams) {
  try {
    console.log('➕ Adding ticket type:', params)
    
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
    
    return {
      success: true,
      transactionHash: tx.hash,
      receipt,
      gasPaidBy: getGaslessWallet().address
    }
  } catch (error: any) {
    console.error('Add ticket type error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Mint ticket with approval (gasless)
export async function mintTicketWithApproval(params: MintTicketParams) {
  try {
    console.log('🎫 Minting ticket with approval:', params)
    
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
    const ticketMintedLog = receipt.logs?.find((log: any) => {
      const contractAddress = contract.target.toString().toLowerCase()
      const logAddress = log.address.toLowerCase()
      
      return (
        logAddress === contractAddress &&
        log.topics[0] === ethers.id('TicketMinted(address,uint256,uint256,uint8,uint256,uint256)')
      )
    })
    
    let ticketId = 0
    if (ticketMintedLog) {
      try {
        const parsedLog = contract.interface.parseLog(ticketMintedLog)
        ticketId = Number(parsedLog?.args.ticketId || 0)
        console.log('✅ Ticket minted with ID:', ticketId)
      } catch (parseError) {
        console.warn('Failed to parse ticket minted log:', parseError)
      }
    }
    
    return {
      success: true,
      transactionHash: tx.hash,
      receipt,
      ticketId,
      gasPaidBy: getGaslessWallet().address
    }
  } catch (error: any) {
    console.error('Ticket minting error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Helper function to get ticket ID
export function getTicketId(eventId: number, category: TicketCategory): number {
  return eventId * 10**18 + category
}

// Generate unique approval ID
export function generateApprovalId(): string {
  return ethers.id(Date.now().toString() + Math.random().toString())
}

// Helper function to check if event is free
export function isFreeEvent(priceAmount: string): boolean {
  return parseFloat(priceAmount) === 0
}

// Create ticket metadata for IPFS
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