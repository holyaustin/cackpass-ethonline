// /app/api/tickets/mint/route.ts -
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { CackPassCoreABI } from '@/lib/contracts/abis/CackPassCore'
import { connectDB } from '@/lib/database/connection'
import { User, Event, Order, MyTicket, TicketType, GaslessApproval } from '@/lib/database/models'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const body = await request.json()
    const { walletAddress, eventId, paymentId, quantity = 1, approvalId, method = 'crypto' } = body

    if (!walletAddress || !eventId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: walletAddress, eventId' },
        { status: 400 }
      )
    }

    await connectDB()

    // Get user
    const user = await User.findOne({ walletAddress }).session(session)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Get event - eventId could be MongoDB ObjectId or string
    let event
    if (mongoose.Types.ObjectId.isValid(eventId)) {
      event = await Event.findById(eventId).session(session)
    } else {
      // Try to find by onChainId if it's a number
      event = await Event.findOne({ onChainId: parseInt(eventId) }).session(session)
    }
    
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // If approvalId is provided, use gasless minting
    if (approvalId) {
      const result = await handleGaslessMinting(
        approvalId, walletAddress, event, user, quantity, session
      )
      return result
    }

    // Existing minting logic (for non-gasless minting)
    let order
    if (paymentId) {
      order = await Order.findById(paymentId).session(session)
      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Order not found' },
          { status: 404 }
        )
      }
    }

    // Get or create ticket type
    let ticketType = await TicketType.findOne({ eventId: event._id }).session(session)
    if (!ticketType) {
      // Create default ticket type if none exists
      ticketType = new TicketType({
        eventId: event._id,
        name: `${event.title} - General Admission`,
        description: `Ticket for ${event.title}`,
        category: 'GeneralAdmission',
        price: event.price || 0,
        maxSupply: 0,
        currentSupply: 0,
        isActive: true
      })
      await ticketType.save({ session })
    }

    // Generate ticket number
    const ticketNumber = `TKT-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase()

    // Create ticket record
    const ticket = new MyTicket({
      ticketNumber,
      userId: user._id,
      eventId: event._id,
      ticketTypeId: ticketType._id,
      orderId: order?._id,
      status: 'active',
      seatNumber: null,
      zone: null,
      metadata: {
        purchaseMethod: method,
        purchaseDate: new Date().toISOString(),
        eventTitle: event.title,
        venue: event.venue,
        startDate: event.startDate
      },
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await ticket.save({ session })

    // Update order status if exists
    if (order) {
      order.paymentStatus = 'completed'
      order.mintStatus = 'minted'
      order.updatedAt = new Date()
      await order.save({ session })
    }

    // Update ticket type supply
    ticketType.currentSupply += quantity
    await ticketType.save({ session })

    // If event is on-chain and has onChainId, try blockchain minting
    if (event.isOnChain && event.onChainId && process.env.GASLESS_PRIVATE_KEY) {
      try {
        await mintOnBlockchain(event.onChainId, walletAddress, quantity, ticket._id.toString())
        ticket.metadata = {
          ...ticket.metadata,
          blockchainMinted: true,
          mintedAt: new Date().toISOString()
        }
        await ticket.save({ session })
      } catch (error) {
        console.error('Blockchain minting error:', error)
        // Don't fail the whole process if blockchain minting fails
        ticket.metadata = {
          ...ticket.metadata,
          blockchainError: error instanceof Error ? error.message : 'Unknown error',
          mintedInDatabaseOnly: true
        }
        await ticket.save({ session })
      }
    }

    await session.commitTransaction()

    return NextResponse.json({
      success: true,
      ticketId: ticket._id.toString(),
      ticketNumber,
      orderId: order?._id?.toString(),
      message: 'Ticket minted successfully'
    })

  } catch (error: any) {
    await session.abortTransaction()
    console.error('Ticket minting error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to mint ticket',
        details: error.message 
      },
      { status: 500 }
    )
  } finally {
    session.endSession()
  }
}

// Helper function for gasless minting
async function handleGaslessMinting(
  approvalId: string,
  walletAddress: string,
  event: any,
  user: any,
  quantity: number,
  session: mongoose.ClientSession
) {
  try {
    // Find the approval
    const approval = await GaslessApproval.findOne({ approvalId }).session(session)
    if (!approval) {
      return NextResponse.json(
        { success: false, error: 'Approval not found' },
        { status: 404 }
      )
    }

    // Check if approval is still valid
    if (approval.validUntil < new Date()) {
      approval.status = 'expired'
      await approval.save({ session })
      return NextResponse.json(
        { success: false, error: 'Approval has expired' },
        { status: 400 }
      )
    }

    // Check if approval has already been used
    if (approval.status === 'used') {
      return NextResponse.json(
        { success: false, error: 'Approval has already been used' },
        { status: 400 }
      )
    }

    // Verify recipient matches
    if (approval.recipient.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Approval is not for this wallet address' },
        { status: 403 }
      )
    }

    // Check if event.onChainId matches approval.eventId
    if (event.onChainId !== approval.eventId) {
      return NextResponse.json(
        { success: false, error: 'Approval event ID does not match event on-chain ID' },
        { status: 400 }
      )
    }

    // Check if GASLESS_PRIVATE_KEY is configured
    if (!process.env.GASLESS_PRIVATE_KEY) {
      console.warn('⚠️ GASLESS_PRIVATE_KEY not configured, minting in database only')
      
      // Create database ticket without blockchain minting
      const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase()
      
      const ticket = new MyTicket({
        ticketNumber,
        userId: user._id,
        eventId: event._id,
        status: 'active',
        metadata: {
          eventTitle: event.title,
          approvalId: approval.approvalId,
          mintedVia: 'gasless_database',
          mintedAt: new Date().toISOString(),
          isMockSignature: approval.metadata?.isMockSignature || false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      await ticket.save({ session })
      
      // Mark approval as used
      approval.status = 'used'
      approval.usedAt = new Date()
      await approval.save({ session })
      
      // Create order record
      const order = new Order({
        userId: user._id,
        eventId: event._id,
        quantity: approval.amount || quantity,
        totalAmount: approval.amount ? Number(ethers.formatEther(approval.price || 0)) * approval.amount : 0,
        currency: approval.currency || 'USD',
        paymentMethod: 'crypto',
        paymentStatus: 'paid',
        paymentReference: `GASLESS-${approval.approvalId.slice(0, 16)}`,
        mintStatus: 'minted',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      await order.save({ session })
      
      await session.commitTransaction()
      
      return NextResponse.json({
        success: true,
        ticketId: ticket._id,
        ticketNumber,
        message: 'Ticket minted in database (gasless signing requires GASLESS_PRIVATE_KEY)'
      })
    }

    // REAL GASLESS MINTING ON BLOCKCHAIN
    try {
      // Setup blockchain connection
      const rpcUrl = process.env.NEXT_PUBLIC_LISK_RPC_URL || 'https://rpc.api.lisk.com'
      const provider = new ethers.JsonRpcProvider(rpcUrl)
      const wallet = new ethers.Wallet(process.env.GASLESS_PRIVATE_KEY, provider)
      
      const contract = new ethers.Contract(
        process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS!,
        CackPassCoreABI,
        wallet
      )

      // Prepare approval data for contract
      const approvalData = {
        recipient: approval.recipient,
        eventId: BigInt(approval.eventId),
        ticketCategory: approval.metadata?.ticketCategory || 0,
        amount: BigInt(approval.amount || quantity),
        price: BigInt(approval.price || 0),
        validUntil: BigInt(Math.floor(approval.validUntil.getTime() / 1000)),
        id: approval.approvalId
      }

      console.log('📝 Gasless minting with approval:', approvalData)
      
      // Call contract to mint with approval
      const tx = await contract.mintWithApproval(
        approvalData,
        approval.signature,
        {
          gasLimit: 300000
        }
      )
      
      console.log('Gasless transaction sent:', tx.hash)
      const receipt = await tx.wait()
      
      // Create database ticket
      const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase()
      
      const ticket = new MyTicket({
        ticketNumber,
        userId: user._id,
        eventId: event._id,
        status: 'active',
        metadata: {
          eventTitle: event.title,
          approvalId: approval.approvalId,
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          mintedVia: 'gasless',
          mintedAt: new Date().toISOString(),
          signedBy: approval.metadata?.signedBy || 'unknown'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      await ticket.save({ session })
      
      // Mark approval as used
      approval.status = 'used'
      approval.usedAt = new Date()
      approval.transactionHash = tx.hash
      await approval.save({ session })
      
      // Create order record
      const order = new Order({
        userId: user._id,
        eventId: event._id,
        quantity: approval.amount || quantity,
        totalAmount: Number(ethers.formatEther(approval.price || 0)) * (approval.amount || quantity),
        currency: approval.currency || 'USD',
        paymentMethod: 'crypto',
        paymentStatus: 'paid',
        paymentReference: `GASLESS-${approval.approvalId.slice(0, 16)}`,
        mintStatus: 'minted',
        transactionHash: tx.hash,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      await order.save({ session })
      
      await session.commitTransaction()
      
      return NextResponse.json({
        success: true,
        ticketId: ticket._id,
        ticketNumber,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        approvalId: approval.approvalId,
        message: 'Ticket minted successfully via gasless transaction'
      })
      
    } catch (blockchainError: any) {
      console.error('Gasless blockchain minting error:', blockchainError)
      
      // Fallback to database-only minting if blockchain fails
      const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase()
      
      const ticket = new MyTicket({
        ticketNumber,
        userId: user._id,
        eventId: event._id,
        status: 'active',
        metadata: {
          eventTitle: event.title,
          approvalId: approval.approvalId,
          mintedVia: 'gasless_database_fallback',
          blockchainError: blockchainError.message,
          mintedAt: new Date().toISOString()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      await ticket.save({ session })
      
      // Mark approval as used but with error
      approval.status = 'used'
      approval.usedAt = new Date()
      approval.metadata = {
        ...approval.metadata,
        blockchainError: blockchainError.message,
        mintedInDatabaseOnly: true
      }
      await approval.save({ session })
      
      // Create order record for database fallback
      const order = new Order({
        userId: user._id,
        eventId: event._id,
        quantity: approval.amount || quantity,
        totalAmount: approval.amount ? Number(ethers.formatEther(approval.price || 0)) * approval.amount : 0,
        currency: approval.currency || 'USD',
        paymentMethod: 'crypto',
        paymentStatus: 'paid',
        paymentReference: `GASLESS-FALLBACK-${approval.approvalId.slice(0, 16)}`,
        mintStatus: 'minted',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      await order.save({ session })
      
      await session.commitTransaction()
      
      return NextResponse.json({
        success: true,
        ticketId: ticket._id,
        ticketNumber,
        warning: 'Gasless blockchain minting failed, ticket created in database only',
        error: blockchainError.message,
        message: 'Ticket created with database fallback'
      })
    }
  } catch (error: any) {
    console.error('Gasless minting error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process gasless minting',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// Helper for regular blockchain minting
async function mintOnBlockchain(eventId: number, recipient: string, quantity: number, ticketId: string) {
  if (!process.env.GASLESS_PRIVATE_KEY) {
    console.warn('Skipping blockchain minting - GASLESS_PRIVATE_KEY not configured')
    return
  }

  const rpcUrl = process.env.NEXT_PUBLIC_LISK_RPC_URL || 'https://rpc.api.lisk.com'
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const wallet = new ethers.Wallet(process.env.GASLESS_PRIVATE_KEY, provider)
  
  const contract = new ethers.Contract(
    process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS!,
    CackPassCoreABI,
    wallet
  )

  try {
    // Simple mint - in production you'd need proper approval
    const tx = await contract.mint(
      recipient,
      eventId,
      0, // General Admission category
      quantity,
      {
        gasLimit: 300000
      }
    )
    
    console.log('Regular mint transaction sent:', tx.hash)
    const receipt = await tx.wait()
    console.log('Transaction confirmed in block:', receipt.blockNumber)
    return { tx, receipt }
  } catch (error: any) {
    console.error('Regular blockchain minting error:', error)
    throw error
  }
}

// Optional: Add GET endpoint to check mint status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const ticketId = searchParams.get('ticketId')
    const walletAddress = searchParams.get('walletAddress')
    
    if (!ticketId && !walletAddress) {
      return NextResponse.json({
        success: false,
        error: 'Provide ticketId or walletAddress query parameter'
      }, { status: 400 })
    }
    
    await connectDB()
    
    let query = {}
    if (ticketId) {
      query = { _id: ticketId }
    } else if (walletAddress) {
      const user = await User.findOne({ walletAddress })
      if (!user) {
        return NextResponse.json({
          success: true,
          tickets: []
        })
      }
      query = { userId: user._id }
    }
    
    const tickets = await MyTicket.find(query)
      .populate('eventId', 'title venue startDate')
      .populate('ticketTypeId', 'name category price')
      .populate('orderId', 'paymentStatus totalAmount')
      .sort({ createdAt: -1 })
      .limit(20)
    
    return NextResponse.json({
      success: true,
      tickets: tickets.map(ticket => ({
        _id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        event: ticket.eventId,
        ticketType: ticket.ticketTypeId,
        order: ticket.orderId,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt
      }))
    })
    
  } catch (error: any) {
    console.error('Get tickets error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tickets'
    }, { status: 500 })
  }
}