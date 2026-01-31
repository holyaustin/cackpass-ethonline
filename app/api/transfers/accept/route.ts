// app/api/transfers/accept/route.ts
import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/database/connection'
import { MyTicket, User, TransferHistory, Notification } from '@/lib/database/models'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { transferId, walletAddress } = body
    
    // Validate input
    if (!transferId || !walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Validate wallet address format
    const walletRegex = /^0x[a-fA-F0-9]{40}$/
    if (!walletRegex.test(walletAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }
    
    // Find user
    const user = await User.findOne({ walletAddress })
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 400 }
      )
    }
    
    // Find transfer history record
    const transfer = await TransferHistory.findById(transferId)
      .populate('fromUserId toUserId')
    
    if (!transfer) {
      return NextResponse.json(
        { success: false, error: 'Transfer not found' },
        { status: 404 }
      )
    }
    
    // Verify user is the recipient
    if (transfer.toUserId._id.toString() !== user._id.toString()) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You can only accept transfers sent to you' },
        { status: 403 }
      )
    }
    
    // Check transfer status
    if (transfer.status !== 'pending') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot accept transfer with status: ${transfer.status}` 
        },
        { status: 400 }
      )
    }
    
    // Find the ticket
    const ticket = await MyTicket.findById(transfer.ticketId)
      .populate('eventId ticketTypeId')
    
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      )
    }
    
    // Verify ticket is still in transferred state
    if (ticket.status !== 'transferred' || !ticket.transferredTo) {
      return NextResponse.json(
        { success: false, error: 'Ticket is not in transferable state' },
        { status: 400 }
      )
    }
    
    // Verify ticket is transferred to the correct user
    if (ticket.transferredTo.toString() !== user._id.toString()) {
      return NextResponse.json(
        { success: false, error: 'Ticket transfer mismatch' },
        { status: 400 }
      )
    }
    
    // Check if ticket is for a past event
    if (ticket.eventId && ticket.eventId.endDate) {
      const eventEndDate = new Date(ticket.eventId.endDate)
      if (eventEndDate < new Date()) {
        return NextResponse.json(
          { success: false, error: 'Cannot accept ticket for past events' },
          { status: 400 }
        )
      }
    }
    
    // Start transaction
    const session = await mongoose.startSession()
    session.startTransaction()
    
    try {
      // Create new ticket for recipient
      const newTicket = await MyTicket.create([{
        ticketNumber: ticket.ticketNumber,
        userId: user._id,
        eventId: ticket.eventId?._id,
        ticketTypeId: ticket.ticketTypeId?._id,
        orderId: ticket.orderId,
        seatNumber: ticket.seatNumber,
        zone: ticket.zone,
        status: 'active',
        metadata: {
          ...ticket.metadata,
          originalOwner: transfer.fromUserId._id,
          transferredFrom: ticket.userId,
          transferId: transfer._id,
          acceptedAt: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }], { session })
      
      // Update original ticket status
      ticket.status = 'transferred_complete'
      ticket.updatedAt = new Date()
      await ticket.save({ session })
      
      // Update transfer history
      transfer.status = 'accepted'
      transfer.acceptedAt = new Date()
      transfer.updatedAt = new Date()
      await transfer.save({ session })
      
      // Create notification for sender
      await Notification.create([{
        userId: transfer.fromUserId._id,
        type: 'ticket_transfer_accepted',
        title: 'Ticket Transfer Accepted',
        message: `${user.firstName || 'User'} has accepted your ticket for ${ticket.eventId?.title || 'an event'}`,
        data: {
          ticketId: newTicket[0]._id,
          ticketNumber: ticket.ticketNumber,
          toUserId: user._id,
          toWallet: user.walletAddress,
          eventTitle: ticket.eventId?.title,
          transferId: transfer._id
        },
        isRead: false,
        createdAt: new Date()
      }], { session })
      
      // Create notification for recipient
      await Notification.create([{
        userId: user._id,
        type: 'ticket_transfer_accepted',
        title: 'Transfer Accepted',
        message: `You have accepted the ticket for ${ticket.eventId?.title || 'an event'}`,
        data: {
          ticketId: newTicket[0]._id,
          ticketNumber: ticket.ticketNumber,
          fromUserId: transfer.fromUserId._id,
          fromWallet: transfer.fromUserId.walletAddress,
          eventTitle: ticket.eventId?.title,
          transferId: transfer._id
        },
        isRead: false,
        createdAt: new Date()
      }], { session })
      
      // Commit transaction
      await session.commitTransaction()
      
      return NextResponse.json({
        success: true,
        message: 'Transfer accepted successfully',
        data: {
          newTicketId: newTicket[0]._id,
          ticketNumber: ticket.ticketNumber,
          transferId: transfer._id,
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
    console.error('Error accepting transfer:', error)
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Duplicate ticket number detected' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to accept transfer',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}