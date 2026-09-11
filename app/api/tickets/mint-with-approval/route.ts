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
    console.log('🎫 Mint with approval request:', body)
    
    const { 
      walletAddress, 
      eventId, 
      paymentId,  // This is what your frontend is sending
      quantity = 1, 
      approvalId,
      method = 'wallet',
      ticketTypeId
    } = body

    if (!walletAddress || !eventId || !paymentId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: walletAddress, eventId, paymentId' },
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

    // Get event
    let event
    if (mongoose.Types.ObjectId.isValid(eventId)) {
      event = await Event.findById(eventId).session(session)
    } else {
      event = await Event.findOne({ onChainId: parseInt(eventId) }).session(session)
    }
    
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Get payment
    const payment = await Payment.findById(paymentId).session(session)
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Verify payment belongs to user and event
    if (!payment.userId?.equals(user._id) || !payment.eventId.equals(event._id)) {
      return NextResponse.json(
        { success: false, error: 'Payment mismatch' },
        { status: 400 }
      )
    }

    // Check if payment is completed
    if (payment.paymentStatus !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'Payment not completed' },
        { status: 400 }
      )
    }

    // Find or create order from payment
    let order = await Order.findOne({ paymentReference: payment.paymentReference }).session(session)
    
    if (!order) {
      // Create order from payment
      order = new Order({
        userId: user._id,
        eventId: event._id,
        ticketTypeId: payment.ticketTypeId || null,
        quantity: payment.quantity,
        totalAmount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod === 'wallet' ? 'crypto' : payment.paymentMethod,
        paymentStatus: 'paid',
        paymentReference: payment.paymentReference,
        mintStatus: 'pending',
        transactionHash: payment.transactionHash || null,
        ticketIds: [],
        metadata: {
          paymentId: payment._id,
          approvalId: payment.approvalId,
          walletAddress: payment.walletAddress,
          signatureData: payment.signatureData,
          validUntil: payment.validUntil
        },
        createdAt: new Date(),
        updatedAt: new Date()
      })
      await order.save({ session })
      
      // Link payment to order
      payment.metadata = {
        ...payment.metadata,
        orderId: order._id
      }
      await payment.save({ session })
    }

    // Check if order is already minted
    if (order.mintStatus === 'minted') {
      return NextResponse.json(
        { success: false, error: 'Tickets already minted for this order' },
        { status: 400 }
      )
    }

    // Get or create ticket type
    let ticketType = ticketTypeId 
      ? await TicketType.findById(ticketTypeId).session(session)
      : payment.ticketTypeId 
        ? await TicketType.findById(payment.ticketTypeId).session(session)
        : await TicketType.findOne({ eventId: event._id }).session(session)
    
    if (!ticketType) {
      // Create default ticket type if none exists
      ticketType = new TicketType({
        eventId: event._id,
        name: `${event.title} - General Admission`,
        description: `Ticket for ${event.title}`,
        category: 'GeneralAdmission',
        price: event.price || 0,
        maxSupply: 1000,
        currentSupply: 0,
        isActive: true
      })
      await ticketType.save({ session })
    }

    // If approvalId is provided, handle gasless minting
    let transactionHash = null
    let blockNumber = null
    
    if (approvalId && process.env.GASLESS_PRIVATE_KEY) {
      try {
        console.log('🚀 Attempting gasless minting with approval:', approvalId)
        
        // Find the approval
        const approval = await GaslessApproval.findOne({ approvalId }).session(session)
        if (!approval) {
          throw new Error('Approval not found')
        }

        // Check if approval is valid
        if (approval.validUntil < new Date()) {
          approval.status = 'expired'
          await approval.save({ session })
          throw new Error('Approval has expired')
        }

        if (approval.status === 'used') {
          throw new Error('Approval has already been used')
        }

        // Verify recipient matches
        if (approval.recipient.toLowerCase() !== walletAddress.toLowerCase()) {
          throw new Error('Approval is not for this wallet address')
        }

        // Setup blockchain connection
        const rpcUrl = process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.network'
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
        
        transactionHash = tx.hash
        blockNumber = receipt.blockNumber
        
        // Mark approval as used
        approval.status = 'used'
        approval.usedAt = new Date()
        approval.transactionHash = tx.hash
        await approval.save({ session })
        
        console.log('✅ Gasless minting successful:', { txHash: tx.hash, blockNumber })
        
      } catch (blockchainError: any) {
        console.error('❌ Gasless blockchain minting error:', blockchainError)
        // Don't fail the whole process if blockchain minting fails
        // We'll still create the ticket in the database
      }
    }

    // Generate unique ticket numbers for each ticket
    const ticketNumbers = []
    const tickets = []
    
    for (let i = 0; i < quantity; i++) {
      const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}-${i}`.toUpperCase()
      ticketNumbers.push(ticketNumber)
      
      const ticket = new MyTicket({
        ticketNumber,
        userId: user._id,
        eventId: event._id,
        ticketTypeId: ticketType._id,
        orderId: order._id,
        status: 'active',
        seatNumber: null,
        zone: null,
        metadata: {
          purchaseMethod: method,
          purchaseDate: new Date().toISOString(),
          eventTitle: event.title,
          venue: event.venue,
          startDate: event.startDate,
          orderId: order._id.toString(),
          paymentId: payment._id.toString(),
          walletAddress: walletAddress,
          ...(transactionHash && {
            blockchainMinted: true,
            transactionHash,
            blockNumber,
            mintedVia: 'gasless',
            mintedAt: new Date().toISOString()
          }),
          ...(!transactionHash && {
            mintedInDatabaseOnly: true,
            blockchainError: 'Gasless minting not attempted or failed'
          })
        },
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      tickets.push(ticket)
    }

    // Save all tickets
    await MyTicket.insertMany(tickets, { session })

    // Update order status
    order.mintStatus = 'minted'
    order.ticketIds = Array.isArray(ticketNumbers) ? ticketNumbers : [ticketNumbers]

    // Add logging to debug
    console.log('Setting ticketIds:', ticketNumbers)
    console.log('Type of ticketNumbers:', typeof ticketNumbers)

    if (transactionHash) {
      order.transactionHash = transactionHash
    }
    order.updatedAt = new Date()
    await order.save({ session })

    // Update payment with minting info
    payment.metadata = {
      ...payment.metadata,
      mintedAt: new Date().toISOString(),
      ticketCount: quantity,
      ticketIds: tickets.map(t => t._id),
      ...(transactionHash && { mintTransactionHash: transactionHash })
    }
    await payment.save({ session })

    // Update ticket type supply
    ticketType.currentSupply += quantity
    await ticketType.save({ session })

    await session.commitTransaction()

    console.log('✅ Tickets minted successfully:', {
      orderId: order._id.toString(),
      paymentId: payment._id.toString(),
      ticketCount: tickets.length,
      ticketNumbers,
      transactionHash
    })

    return NextResponse.json({
      success: true,
      ticketId: tickets[0]?._id.toString(), // Return first ticket ID for backward compatibility
      ticketIds: tickets.map(t => t._id.toString()),
      ticketNumbers,
      orderId: order._id.toString(),
      paymentId: payment._id.toString(),
      transactionHash,
      blockNumber,
      message: `Successfully minted ${quantity} ticket(s)`
    })

  } catch (error: any) {
    await session.abortTransaction()
    console.error('❌ Ticket minting with approval error:', error)
    
    // Return proper error response
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to mint ticket with approval',
        details: error.message 
      },
      { status: 500 }
    )
  } finally {
    session.endSession()
  }
}

// Optional: Add GET endpoint to check mint status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const paymentId = searchParams.get('paymentId')
    const orderId = searchParams.get('orderId')
    
    if (!paymentId && !orderId) {
      return NextResponse.json({
        success: false,
        error: 'paymentId or orderId query parameter is required'
      }, { status: 400 })
    }
    
    await connectDB()
    
    let query = {}
    if (paymentId) {
      query = { _id: paymentId }
    } else if (orderId) {
      query = { _id: orderId }
    }
    
    const payment = await Payment.findById(paymentId)
      .populate('eventId', 'title startDate venue')
      .populate('userId', 'walletAddress email')
      .populate('ticketTypeId', 'name price')
    
    if (!payment) {
      return NextResponse.json({
        success: false,
        error: 'Payment not found'
      }, { status: 404 })
    }
    
    // Find order by payment reference
    const order = await Order.findOne({ paymentReference: payment.paymentReference })
    
    let tickets = []
    if (order) {
      tickets = await MyTicket.find({ orderId: order._id })
    }
    
    return NextResponse.json({
      success: true,
      payment: {
        _id: payment._id,
        paymentMethod: payment.paymentMethod,
        paymentStatus: payment.paymentStatus,
        amount: payment.amount,
        currency: payment.currency,
        event: payment.eventId,
        user: payment.userId,
        ticketType: payment.ticketTypeId,
        createdAt: payment.createdAt
      },
      order: order ? {
        _id: order._id,
        mintStatus: order.mintStatus,
        ticketCount: order.ticketIds?.length || 0
      } : null,
      tickets: tickets.map(ticket => ({
        _id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        createdAt: ticket.createdAt
      })),
      ticketCount: tickets.length
    })
    
  } catch (error: any) {
    console.error('Get mint status error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch mint status'
    }, { status: 500 })
  }
}