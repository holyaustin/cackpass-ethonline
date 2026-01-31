// app/api/transfers/initiate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/database/connection'
import { MyTicket, User, TransferHistory, Notification } from '@/lib/database/models'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { ticketId, recipientAddress, walletAddress } = body
    
    // Validate input
    if (!ticketId || !recipientAddress || !walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Validate wallet address format
    const walletRegex = /^0x[a-fA-F0-9]{40}$/
    if (!walletRegex.test(walletAddress) || !walletRegex.test(recipientAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }
    
    // Check if sender is transferring to themselves
    if (walletAddress.toLowerCase() === recipientAddress.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Cannot transfer ticket to yourself' },
        { status: 400 }
      )
    }
    
    // Find sender user
    const sender = await User.findOne({ walletAddress })
    if (!sender) {
      return NextResponse.json(
        { success: false, error: 'Sender not found' },
        { status: 400 }
      )
    }
    
    // Find recipient user
    let recipient = await User.findOne({ walletAddress: recipientAddress })
    
    // If recipient doesn't exist, create a placeholder user
    if (!recipient) {
      recipient = await User.create({
        walletAddress: recipientAddress,
        email: null,
        firstName: 'User',
        lastName: recipientAddress.slice(2, 8),
        isActive: false,
        createdAt: new Date()
      })
    }
    
    // Find the ticket
    const ticket = await MyTicket.findOne({
      _id: new mongoose.Types.ObjectId(ticketId),
      userId: sender._id
    }).populate('eventId ticketTypeId')
    
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found or not owned by you' },
        { status: 400 }
      )
    }
    
    // Check if ticket is transferable
    if (ticket.status !== 'active') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Ticket cannot be transferred. Current status: ${ticket.status}` 
        },
        { status: 400 }
      )
    }
    
    // Check if ticket is already transferred
    if (ticket.transferredTo) {
      return NextResponse.json(
        { success: false, error: 'Ticket has already been transferred' },
        { status: 400 }
      )
    }
    
    // Check if event has ended
    if (ticket.eventId && ticket.eventId.endDate) {
      const eventEndDate = new Date(ticket.eventId.endDate)
      if (eventEndDate < new Date()) {
        return NextResponse.json(
          { success: false, error: 'Cannot transfer ticket for past events' },
          { status: 400 }
        )
      }
    }
    
    // Check transfer limits (max 5 active transfers per user)
    const activeTransfers = await MyTicket.countDocuments({
      userId: sender._id,
      status: 'transferred',
      transferredTo: { $exists: true, $ne: null }
    })
    
    if (activeTransfers >= 5) {
      return NextResponse.json(
        { success: false, error: 'Maximum active transfers limit reached (5)' },
        { status: 400 }
      )
    }
    
    // Start a transaction
    const session = await mongoose.startSession()
    session.startTransaction()
    
    try {
      // Update ticket status
      ticket.status = 'transferred'
      ticket.transferredTo = recipient._id
      ticket.transferredAt = new Date()
      ticket.updatedAt = new Date()
      await ticket.save({ session })
      
      // Create transfer history record
      const transferHistory = await TransferHistory.create([{
        ticketId: ticket._id,
        fromUserId: sender._id,
        toUserId: recipient._id,
        status: 'pending',
        ticketNumber: ticket.ticketNumber,
        eventId: ticket.eventId?._id,
        ticketTypeId: ticket.ticketTypeId?._id,
        transferredAt: new Date(),
        createdAt: new Date()
      }], { session })
      
      // Create notification for recipient
      await Notification.create([{
        userId: recipient._id,
        type: 'ticket_transfer_received',
        title: 'Ticket Transfer Received',
        message: `${sender.firstName || 'User'} has sent you a ticket for ${ticket.eventId?.title || 'an event'}`,
        data: {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber,
          fromUserId: sender._id,
          fromWallet: sender.walletAddress,
          eventTitle: ticket.eventId?.title,
          transferId: transferHistory[0]._id
        },
        isRead: false,
        createdAt: new Date()
      }], { session })
      
      // Create notification for sender
      await Notification.create([{
        userId: sender._id,
        type: 'ticket_transfer_sent',
        title: 'Ticket Transfer Initiated',
        message: `You have transferred ticket #${ticket.ticketNumber} to ${recipient.walletAddress.slice(0, 6)}...`,
        data: {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber,
          toUserId: recipient._id,
          toWallet: recipient.walletAddress,
          eventTitle: ticket.eventId?.title,
          transferId: transferHistory[0]._id
        },
        isRead: false,
        createdAt: new Date()
      }], { session })
      
      // Commit transaction
      await session.commitTransaction()
      
      return NextResponse.json({
        success: true,
        message: 'Transfer initiated successfully',
        data: {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber,
          recipientAddress: recipient.walletAddress,
          transferId: transferHistory[0]._id,
          eventTitle: ticket.eventId?.title,
          timestamp: new Date().toISOString()
        }
      })
      
    } catch (transactionError) {
      await session.abortTransaction()
      throw transactionError
    } finally {
      session.endSession()
    }
    
  } catch (error: any) {
    console.error('Error initiating transfer:', error)
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Duplicate transfer detected' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initiate transfer',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}