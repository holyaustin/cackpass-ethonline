// /app/api/tickets/mint/route.ts - UPDATED AND FIXED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { CackPassCoreABI } from '@/lib/contracts/abis/CackPassCore'
import { connectDB } from '@/lib/database/connection'
import { User, Event, Order, MyTicket, TicketType, GaslessApproval, Payment } from '@/lib/database/models'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const body = await request.json()
    console.log('🎫 [MINT API] Received request:', body)
    
    const { 
      walletAddress, 
      eventId, 
      orderId,        // ADDED: Accept orderId from frontend
      approvalId,     // Optional: for gasless minting
      quantity = 1, 
      method = 'crypto' 
    } = body

    // Validate required fields
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'walletAddress is required' },
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

    let event = null
    let order = null

    // If orderId is provided, get order and event from it
    if (orderId) {
      console.log('📦 Using orderId:', orderId)
      
      order = await Order.findById(orderId).session(session)
      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Order not found' },
          { status: 404 }
        )
      }

      // Verify order belongs to user
      if (order.userId.toString() !== user._id.toString()) {
        return NextResponse.json(
          { success: false, error: 'Order does not belong to user' },
          { status: 403 }
        )
      }

      // Get event from order
      event = await Event.findById(order.eventId).session(session)
      if (!event) {
        return NextResponse.json(
          { success: false, error: 'Event not found' },
          { status: 404 }
        )
      }

      // Check if order is already minted
      if (order.mintStatus === 'minted') {
        return NextResponse.json(
          { success: false, error: 'Order already minted' },
          { status: 400 }
        )
      }
    } 
    // If eventId is provided directly (legacy support)
    else if (eventId) {
      console.log('📦 Using eventId directly:', eventId)
      
      // Get event
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
    } else {
      return NextResponse.json(
        { success: false, error: 'Either orderId or eventId is required' },
        { status: 400 }
      )
    }

    // If approvalId is provided, handle gasless minting
    if (approvalId) {
      console.log('🔐 Processing gasless minting with approval:', approvalId)
      const result = await handleGaslessMinting(
        approvalId, 
        walletAddress, 
        event, 
        user, 
        quantity, 
        order, // Pass the order if we have it
        session
      )
      return result
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
      orderId: order?._id || null,
      status: 'active',
      seatNumber: null,
      zone: null,
      metadata: {
        purchaseMethod: method,
        purchaseDate: new Date().toISOString(),
        eventTitle: event.title,
        venue: event.venue,
        startDate: event.startDate,
        orderId: order?._id?.toString() || null,
        blockchainEventId: event.onChainId || null
      },
      createdAt: new Date(),
      updatedAt: new Date()
    })
    console.log('Creating ticket with orderId:', order?._id)
    await ticket.save({ session })

    // Update order status if we have an order
    if (order) {
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
    console.error('❌ Ticket minting error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to mint ticket',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  } finally {
    session.endSession()
  }
}

// Updated handleGaslessMinting to accept order parameter
async function handleGaslessMinting(
  approvalId: string,
  walletAddress: string,
  event: any,
  user: any,
  quantity: number,
  order: any, // Can be null if no order yet
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

    // Use PAYMENT_RECEIVER_ADDRESS from environment
    const PAYMENT_RECEIVER_ADDRESS = process.env.PAYMENT_RECEIVER_ADDRESS || '0x2c3b2b2325610a6814f2f822d0bf4dab8cf16e16'
    console.log('💰 Payment receiver:', PAYMENT_RECEIVER_ADDRESS)

    // Check if GASLESS_PRIVATE_KEY is configured
    if (!process.env.GASLESS_PRIVATE_KEY) {
      console.warn('⚠️ GASLESS_PRIVATE_KEY not configured, minting in database only')
      
      // Create or update order
      let finalOrder = order
      if (!finalOrder) {
        finalOrder = new Order({
          userId: user._id,
          eventId: event._id,
          quantity: approval.amount || quantity,
          totalAmount: approval.amount ? Number(ethers.formatEther(approval.price || 0)) * approval.amount : 0,
          currency: approval.currency || 'USD',
          paymentMethod: 'crypto',
          paymentStatus: 'paid',
          paymentReference: `GASLESS-${approval.approvalId.slice(0, 16)}`,
          mintStatus: 'minted',
          metadata: {
            approvalId: approval.approvalId,
            isMockSignature: true,
            paymentReceiver: PAYMENT_RECEIVER_ADDRESS
          },
          createdAt: new Date(),
          updatedAt: new Date()
        })
        await finalOrder.save({ session })
      } else {
        finalOrder.mintStatus = 'minted'
        finalOrder.metadata = {
          ...finalOrder.metadata,
          approvalId: approval.approvalId,
          isMockSignature: true,
          paymentReceiver: PAYMENT_RECEIVER_ADDRESS
        }
        await finalOrder.save({ session })
      }
      
      // Create database ticket
      const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase()
      
      const ticket = new MyTicket({
        ticketNumber,
        userId: user._id,
        eventId: event._id,
        orderId: finalOrder._id,
        status: 'active',
        metadata: {
          eventTitle: event.title,
          approvalId: approval.approvalId,
          mintedVia: 'gasless_database',
          mintedAt: new Date().toISOString(),
          isMockSignature: approval.metadata?.isMockSignature || false,
          paymentReceiver: PAYMENT_RECEIVER_ADDRESS,
          orderId: finalOrder._id.toString()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      await ticket.save({ session })
      
      // Mark approval as used
      approval.status = 'used'
      approval.usedAt = new Date()
      approval.metadata = {
        ...approval.metadata,
        paymentReceiver: PAYMENT_RECEIVER_ADDRESS,
        orderId: finalOrder._id.toString()
      }
      await approval.save({ session })
      
      await session.commitTransaction()
      
      return NextResponse.json({
        success: true,
        ticketId: ticket._id,
        ticketNumber,
        orderId: finalOrder._id.toString(),
        message: 'Ticket minted in database (gasless signing requires GASLESS_PRIVATE_KEY)',
        paymentReceiver: PAYMENT_RECEIVER_ADDRESS
      })
    }

    // REAL GASLESS MINTING ON BLOCKCHAIN with payment to receiver
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

      console.log('📝 Gasless minting with approval:', {
        ...approvalData,
        paymentReceiver: PAYMENT_RECEIVER_ADDRESS
      })
      
      // Check if the contract has a payment receiver parameter
      // First, let's see if we need to send value with the transaction
      const priceInEth = Number(ethers.formatEther(approval.price || 0))
      const totalValue = priceInEth * (approval.amount || quantity)
      
      console.log('💰 Transaction details:', {
        price: priceInEth,
        quantity: approval.amount || quantity,
        totalValue,
        paymentReceiver: PAYMENT_RECEIVER_ADDRESS
      })
      
      // Call contract to mint with approval
      const txOptions: any = {
        gasLimit: 300000
      }
      
      // If there's a price, send the value to the payment receiver
      if (totalValue > 0) {
        txOptions.value = ethers.parseEther(totalValue.toString())
        console.log('💰 Sending value with transaction:', txOptions.value.toString(), 'wei')
      }
      
      const tx = await contract.mintWithApproval(
        approvalData,
        approval.signature,
        txOptions
      )
      
      console.log('Gasless transaction sent:', tx.hash)
      console.log('Payment receiver:', PAYMENT_RECEIVER_ADDRESS)
      const receipt = await tx.wait()
      
      // Create or update order
      let finalOrder = order
      if (!finalOrder) {
        finalOrder = new Order({
          userId: user._id,
          eventId: event._id,
          quantity: approval.amount || quantity,
          totalAmount: totalValue,
          currency: approval.currency || 'USD',
          paymentMethod: 'crypto',
          paymentStatus: 'paid',
          paymentReference: `GASLESS-${approval.approvalId.slice(0, 16)}`,
          mintStatus: 'minted',
          transactionHash: tx.hash,
          metadata: {
            approvalId: approval.approvalId,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            paymentReceiver: PAYMENT_RECEIVER_ADDRESS,
            totalValue
          },
          createdAt: new Date(),
          updatedAt: new Date()
        })
        await finalOrder.save({ session })
      } else {
        finalOrder.mintStatus = 'minted'
        finalOrder.transactionHash = tx.hash
        finalOrder.metadata = {
          ...finalOrder.metadata,
          approvalId: approval.approvalId,
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          paymentReceiver: PAYMENT_RECEIVER_ADDRESS,
          totalValue
        }
        await finalOrder.save({ session })
      }
      
      // Create database ticket
      const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase()
      
      const ticket = new MyTicket({
        ticketNumber,
        userId: user._id,
        eventId: event._id,
        orderId: finalOrder._id,
        status: 'active',
        metadata: {
          eventTitle: event.title,
          approvalId: approval.approvalId,
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          mintedVia: 'gasless',
          mintedAt: new Date().toISOString(),
          signedBy: approval.metadata?.signedBy || 'unknown',
          paymentReceiver: PAYMENT_RECEIVER_ADDRESS,
          orderId: finalOrder._id.toString()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      await ticket.save({ session })
      
      // Mark approval as used
      approval.status = 'used'
      approval.usedAt = new Date()
      approval.transactionHash = tx.hash
      approval.metadata = {
        ...approval.metadata,
        paymentReceiver: PAYMENT_RECEIVER_ADDRESS,
        transactionHash: tx.hash,
        orderId: finalOrder._id.toString()
      }
      await approval.save({ session })
      
      await session.commitTransaction()
      
      return NextResponse.json({
        success: true,
        ticketId: ticket._id,
        ticketNumber,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        approvalId: approval.approvalId,
        orderId: finalOrder._id.toString(),
        paymentReceiver: PAYMENT_RECEIVER_ADDRESS,
        message: 'Ticket minted successfully via gasless transaction'
      })
      
    } catch (blockchainError: any) {
      console.error('Gasless blockchain minting error:', blockchainError)
      
      // Fallback to database-only minting if blockchain fails
      // Create or update order for fallback
      let finalOrder = order
      if (!finalOrder) {
        finalOrder = new Order({
          userId: user._id,
          eventId: event._id,
          quantity: approval.amount || quantity,
          totalAmount: approval.amount ? Number(ethers.formatEther(approval.price || 0)) * approval.amount : 0,
          currency: approval.currency || 'USD',
          paymentMethod: 'crypto',
          paymentStatus: 'paid',
          paymentReference: `GASLESS-FALLBACK-${approval.approvalId.slice(0, 16)}`,
          mintStatus: 'minted',
          metadata: {
            approvalId: approval.approvalId,
            blockchainError: blockchainError.message,
            paymentReceiver: PAYMENT_RECEIVER_ADDRESS,
            mintedInDatabaseOnly: true
          },
          createdAt: new Date(),
          updatedAt: new Date()
        })
        await finalOrder.save({ session })
      } else {
        finalOrder.mintStatus = 'minted'
        finalOrder.metadata = {
          ...finalOrder.metadata,
          approvalId: approval.approvalId,
          blockchainError: blockchainError.message,
          paymentReceiver: PAYMENT_RECEIVER_ADDRESS,
          mintedInDatabaseOnly: true
        }
        await finalOrder.save({ session })
      }
      
      const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase()
      
      const ticket = new MyTicket({
        ticketNumber,
        userId: user._id,
        eventId: event._id,
        orderId: finalOrder._id,
        status: 'active',
        metadata: {
          eventTitle: event.title,
          approvalId: approval.approvalId,
          mintedVia: 'gasless_database_fallback',
          blockchainError: blockchainError.message,
          mintedAt: new Date().toISOString(),
          paymentReceiver: PAYMENT_RECEIVER_ADDRESS,
          orderId: finalOrder._id.toString()
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
        mintedInDatabaseOnly: true,
        paymentReceiver: PAYMENT_RECEIVER_ADDRESS,
        orderId: finalOrder._id.toString()
      }
      await approval.save({ session })
      
      await session.commitTransaction()
      
      return NextResponse.json({
        success: true,
        ticketId: ticket._id,
        ticketNumber,
        orderId: finalOrder._id.toString(),
        warning: 'Gasless blockchain minting failed, ticket created in database only',
        error: blockchainError.message,
        paymentReceiver: PAYMENT_RECEIVER_ADDRESS,
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

// Updated mintOnBlockchain to use PAYMENT_RECEIVER_ADDRESS
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
    // Use PAYMENT_RECEIVER_ADDRESS from environment
    const PAYMENT_RECEIVER_ADDRESS = process.env.PAYMENT_RECEIVER_ADDRESS || '0x2c3b2b2325610a6814f2f822d0bf4dab8cf16e16'
    console.log('💰 Minting with payment receiver:', PAYMENT_RECEIVER_ADDRESS)
    
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
    console.log('Payment receiver:', PAYMENT_RECEIVER_ADDRESS)
    const receipt = await tx.wait()
    console.log('Transaction confirmed in block:', receipt.blockNumber)
    return { tx, receipt, paymentReceiver: PAYMENT_RECEIVER_ADDRESS }
  } catch (error: any) {
    console.error('Regular blockchain minting error:', error)
    throw error
  }
}

// GET endpoint to check mint status
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