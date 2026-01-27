// lib/blockchain/ticket-minting.ts
import { ethers } from 'ethers'
import { CackPassCoreABI } from '@/lib/contracts/abis/CackPassCore'

interface MintTicketParams {
  eventId: number
  ticketType: number
  metadataURI: string
  recipient: string
  price: bigint
  userWalletAddress: string
}

export async function mintTicketOnChain(params: MintTicketParams) {
  try {
    // Initialize provider for Lisk Sepolia
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_LISK_RPC_URL
    )
    
    // Use gasless wallet private key from .env
    const gaslessWallet = new ethers.Wallet(
      process.env.GASSLESS_PRIVATE_KEY!,
      provider
    )
    
    // Initialize contract
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CACKPASS_CONTRACT_ADDRESS!,
      CackPassCoreABI,
      gaslessWallet
    )
    
    // Prepare transaction data
    const txData = contract.interface.encodeFunctionData('mint', [
      params.recipient,  // User's embedded wallet address
      params.eventId,
      params.ticketType,
      params.metadataURI
    ])
    
    // Estimate gas
    const gasEstimate = await contract.mint.estimateGas(
      params.recipient,
      params.eventId,
      params.ticketType,
      params.metadataURI,
      { value: params.price }
    )
    
    // Get current gas price
    const feeData = await provider.getFeeData()
    
    // Execute gasless transaction (wallet pays for gas)
    const tx = await gaslessWallet.sendTransaction({
      to: process.env.NEXT_PUBLIC_CACKPASS_CONTRACT_ADDRESS!,
      data: txData,
      value: params.price,  // Ticket price in wei
      gasLimit: gasEstimate * BigInt(120) / BigInt(100),
      maxFeePerGas: feeData.maxFeePerGas || undefined,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || undefined,
    })
    
    // Wait for confirmation
    const receipt = await tx.wait()
    
    // FIXED: Check if receipt exists before accessing properties
    if (!receipt) {
      throw new Error('Transaction receipt not found')
    }
    
    // Extract ticket ID from event logs
    const event = receipt.logs?.find((log: any) => 
      log.address.toLowerCase() === process.env.NEXT_PUBLIC_CACKPASS_CONTRACT_ADDRESS!.toLowerCase()
    )
    
    let ticketId = 0
    if (event) {
      try {
        const parsedLog = contract.interface.parseLog(event)
        ticketId = parsedLog?.args?.tokenId?.toString() || 0
      } catch (parseError) {
        console.warn('Failed to parse event log:', parseError)
        // Ticket ID will remain 0, but transaction still succeeded
      }
    }
    
    return {
      success: true,
      transactionHash: tx.hash,
      receipt,
      ticketId,
      gasPaidBy: gaslessWallet.address
    }
  } catch (error) {
    console.error('Blockchain minting error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export function createTicketMetadata(
  eventData: any,
  imageCid: string,
  ticketType: string,
  price: string
) {
  return {
    name: `${eventData.eventName} - ${ticketType}`,
    description: eventData.description,
    image: imageCid ? `ipfs://${imageCid}` : '',
    external_url: `${process.env.NEXT_PUBLIC_APP_URL}/tickets`,
    attributes: [
      {
        trait_type: "Event",
        value: eventData.eventName
      },
      {
        trait_type: "Category",
        value: eventData.category
      },
      {
        trait_type: "Ticket Type",
        value: ticketType
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

// Helper function to check if event is free
export function isFreeEvent(priceAmount: string): boolean {
  return parseFloat(priceAmount) === 0
}

// Additional helper function for better error handling
export function parseTransactionReceipt(receipt: ethers.TransactionReceipt | null) {
  if (!receipt) {
    return {
      status: 'failed',
      blockNumber: null,
      gasUsed: null,
      effectiveGasPrice: null
    }
  }
  
  return {
    status: receipt.status === 1 ? 'success' : 'failed',
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed?.toString(),
    effectiveGasPrice: receipt.gasPrice?.toString()
  }
}