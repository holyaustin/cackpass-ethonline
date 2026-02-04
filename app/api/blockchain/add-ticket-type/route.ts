// /app/api/blockchain/add-ticket-type/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { CackPassCoreABI } from '@/lib/contracts/abis/CackPassCore'
import { connectDB } from '@/lib/database/connection'
import { TicketType } from '@/lib/database/models'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('➕ [BLOCKCHAIN API] Adding ticket type')
    
    if (!process.env.GASLESS_PRIVATE_KEY) {
      throw new Error('GASLESS_PRIVATE_KEY not configured')
    }
    
    const body = await request.json()
    const { eventId, category, maxTickets, ticketPrice, eventName = `Event ${eventId}` } = body
    
    console.log('Adding ticket type:', { eventId, category, maxTickets, ticketPrice, eventName })
    
    // Setup
    const rpcUrl = process.env.NEXT_PUBLIC_LISK_RPC_URL || 'https://rpc.sepolia-api.lisk.com'
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(process.env.GASLESS_PRIVATE_KEY, provider)
    
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS!,
      CackPassCoreABI,
      wallet
    )
    
    // Convert string price to bigint if needed
    const priceBigInt = typeof ticketPrice === 'string' ? BigInt(ticketPrice) : ticketPrice
    
    // Add ticket type to blockchain
    const tx = await contract.addTicketType(
      eventId,
      category,
      maxTickets,
      priceBigInt,
      {
        gasLimit: 300000
      }
    )
    
    console.log('Transaction sent:', tx.hash)
    const receipt = await tx.wait()
    
    // CRITICAL FIX: Create/update TicketType in database
    let dbTicketTypeId = null
    try {
      await connectDB()
      
      // Convert price from wei to ether for database
      const priceInEth = ethers.formatEther(priceBigInt.toString())
      
      // Check if ticket type already exists in database
      let ticketType = await TicketType.findOne({ 
        eventId: eventId.toString(),
        category: category 
      })
      
      if (ticketType) {
        // Update existing ticket type
        ticketType.maxSupply = maxTickets
        ticketType.price = parseFloat(priceInEth)
        ticketType.updatedAt = new Date()
        await ticketType.save()
        dbTicketTypeId = ticketType._id
        console.log('✅ Database TicketType updated:', dbTicketTypeId)
      } else {
        // Create new ticket type in database
        ticketType = new TicketType({
          eventId: eventId.toString(),
          name: `${eventName} - ${category}`,
          category: category,
          price: parseFloat(priceInEth),
          maxSupply: maxTickets,
          currentSupply: 0,
          isActive: true,
          isOnChain: true,
          onChainId: eventId,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        
        await ticketType.save()
        dbTicketTypeId = ticketType._id
        console.log('✅ Database TicketType created:', dbTicketTypeId)
      }
    } catch (dbError) {
      console.error('❌ Database TicketType creation failed:', dbError)
      // Don't fail the blockchain transaction, just log the error
    }
    
    return NextResponse.json({
      success: true,
      transactionHash: tx.hash,
      gasPaidBy: wallet.address,
      database: {
        ticketTypeCreated: dbTicketTypeId !== null,
        ticketTypeId: dbTicketTypeId
      }
    })
    
  } catch (error: any) {
    console.error('Add ticket type API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}