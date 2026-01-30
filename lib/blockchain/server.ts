// /lib/blockchain/server.ts - SERVER-ONLY
'use server'

import { ethers } from 'ethers'
import { CackPassCoreABI } from '@/lib/contracts/abis/CackPassCore'

// These are server-only functions that can access environment variables

export enum TicketCategory {
  GeneralAdmission = 0,
  ReservedSeating = 1,
  VIPPremium = 2,
  Others = 3
}

export async function createEventOnChainServer(params: {
  eventName: string
  baseURI: string
  startTime: number
  endTime: number
}) {
  try {
    console.log('🔗 [SERVER ACTION] Creating event on blockchain')
    
    if (!process.env.GASLESS_PRIVATE_KEY) {
      throw new Error('GASLESS_PRIVATE_KEY not configured')
    }
    
    if (!process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS) {
      throw new Error('Contract address not configured')
    }
    
    // Setup
    const rpcUrl = process.env.NEXT_PUBLIC_LISK_RPC_URL || 'https://rpc.sepolia-api.lisk.com'
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(process.env.GASLESS_PRIVATE_KEY, provider)
    
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS,
      CackPassCoreABI,
      wallet
    )
    
    // Create event
    const tx = await contract.createEvent(
      params.eventName,
      params.baseURI,
      params.startTime,
      params.endTime,
      { gasLimit: 500000 }
    )
    
    const receipt = await tx.wait()
    
    // Parse event ID
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
      } catch (error) {
        console.warn('Failed to parse event log')
      }
    }
    
    return {
      success: true,
      eventId,
      transactionHash: tx.hash,
      gasPaidBy: wallet.address
    }
    
  } catch (error: any) {
    console.error('Server action error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

export async function addTicketTypeServer(params: {
  eventId: number
  category: TicketCategory
  maxTickets: number
  ticketPrice: bigint
}) {
  try {
    if (!process.env.GASLESS_PRIVATE_KEY) {
      throw new Error('GASLESS_PRIVATE_KEY not configured')
    }
    
    const rpcUrl = process.env.NEXT_PUBLIC_LISK_RPC_URL || 'https://rpc.sepolia-api.lisk.com'
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(process.env.GASLESS_PRIVATE_KEY, provider)
    
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS!,
      CackPassCoreABI,
      wallet
    )
    
    const tx = await contract.addTicketType(
      params.eventId,
      params.category,
      params.maxTickets,
      params.ticketPrice,
      { gasLimit: 300000 }
    )
    
    await tx.wait()
    
    return {
      success: true,
      transactionHash: tx.hash,
      gasPaidBy: wallet.address
    }
    
  } catch (error: any) {
    console.error('Add ticket type error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}