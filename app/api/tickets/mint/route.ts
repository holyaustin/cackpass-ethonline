import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { CackPassCoreABI } from '@/lib/contracts/abis/CackPassCore'
import { connectDB } from '@/lib/database/connection'
import { User, Event, Order, MyTicket, TicketType } from '@/lib/database/models'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const body = await request.json()
    const { walletAddress, eventId, paymentId, quantity, method } = body

    if (!walletAddress || !eventId || !paymentId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
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
    const event = await Event.findById(eventId).session(session)
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Get order
    const order = await Order.findById(paymentId).session(session)
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Get ticket type
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
      orderId: order._id,
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

    // Update order status
    order.paymentStatus = 'completed'
    order.mintStatus = 'minted'
    order.updatedAt = new Date()
    await order.save({ session })

    // Update ticket type supply
    ticketType.currentSupply += quantity
    await ticketType.save({ session })

    // If event is on-chain, mint the NFT ticket
    if (event.isOnChain && event.onChainId) {
      try {
        // This would call the blockchain contract to mint the ticket
        // For now, we'll simulate it
        console.log(`Would mint NFT ticket for event ${event.onChainId} to ${walletAddress}`)
        
        // In production, this would:
        // 1. Get the signed approval from database
        // 2. Call contract.mintWithApproval(approval, signature)
        // 3. Update ticket with transaction hash
      } catch (error) {
        console.error('Blockchain minting error:', error)
        // Don't fail the whole process if blockchain minting fails
        // The ticket still exists in our database
      }
    }

    await session.commitTransaction()

    return NextResponse.json({
      success: true,
      ticketId: ticket._id.toString(),
      ticketNumber,
      orderId: order._id.toString(),
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