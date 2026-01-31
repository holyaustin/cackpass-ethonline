// app/api/transfers/cancel/route.ts
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
    
    // Verify user is the sender
    if (transfer.fromUserId._id.toString() !== user._id.toString()) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You can only cancel transfers you initiated' },
        { status: 403 }
      )
    }
    
    // Check transfer status
    if (transfer.status !== 'pending') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot cancel transfer with status: ${transfer.status}` 
        },
        { status: 400 }
      )
    }
    
    // Find the ticket
    const ticket = await MyTicket.findById(transfer.ticketId)
      .populate('eventId')
    
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      )
    }
    
    // Check if ticket is still in transferred status
    if (ticket.status !== 'transferred' || !ticket.transferredTo) {
      return NextResponse.json(
        { success: false, error: 'Ticket is not in transferable state' },
        { status: 400 }
      )
    }
    
    // Check if transfer has been accepted
    if (transfer.status === 'accepted') {
      return NextResponse.json(
        { success: false, error: 'Transfer has already been accepted and cannot be cancelled' },
        { status: 400 }
      )
    }
    
    // Start transaction
    const session = await mongoose.startSession()
    session.startTransaction()
    
    try {
      // Update ticket status back to active
      ticket.status = 'active'
      ticket.transferredTo = undefined
      ticket.transferredAt = undefined
      ticket.updatedAt = new Date()
      await ticket.save({ session })
      
      // Update transfer history
      transfer.status = 'cancelled'
      transfer.cancelledAt = new Date()
      transfer.updatedAt = new Date()
      await transfer.save({ session })
      
      // Create notification for recipient
      if (transfer.toUserId) {
        await Notification.create([{
          userId: transfer.toUserId._id,
          type: 'ticket_transfer_cancelled',
          title: 'Ticket Transfer Cancelled',
          message: `${user.firstName || 'User'} has cancelled the ticket transfer for ${ticket.eventId?.title || 'an event'}`,
          data: {
            ticketId: ticket._id,
            ticketNumber: ticket.ticketNumber,
            fromUserId: user._id,
            fromWallet: user.walletAddress,
            eventTitle: ticket.eventId?.title,
            transferId: transfer._id
          },
          isRead: false,
          createdAt: new Date()
        }], { session })
      }
      
      // Create notification for sender
      await Notification.create([{
        userId: user._id,
        type: 'ticket_transfer_cancelled',
        title: 'Transfer Cancelled',
        message: `You have cancelled the transfer of ticket #${ticket.ticketNumber}`,
        data: {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber,
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
        message: 'Transfer cancelled successfully',
        data: {
          ticketId: ticket._id,
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
    console.error('Error cancelling transfer:', error)
    
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to cancel transfer',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}