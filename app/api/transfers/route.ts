// app/api/transfers/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { MyTicket, User, Event, TicketType, Order } from '@/lib/database/models'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const walletAddress = searchParams.get('walletAddress')
    const type = searchParams.get('type') || 'all' // all, sent, received
    
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'walletAddress is required' },
        { status: 400 }
      )
    }
    
    // Find user
    const user = await User.findOne({ walletAddress })
    if (!user) {
      return NextResponse.json({
        success: true,
        transfers: [],
        stats: {
          sentTransfers: 0,
          receivedTransfers: 0,
          pendingTransfers: 0,
          totalTransfers: 0
        }
      })
    }
    
    // Build query based on transfer type
    let query: any = {}
    
    if (type === 'sent') {
      // Tickets where user is the owner and has transferred or is transferring
      query.userId = user._id
      query.$or = [
        { status: 'transferred' },
        { transferredTo: { $exists: true, $ne: null } }
      ]
    } else if (type === 'received') {
      // Tickets transferred to this user
      query.transferredTo = user._id
      query.status = 'transferred'
    } else {
      // All transfers involving this user
      query.$or = [
        { userId: user._id, transferredTo: { $exists: true } },
        { transferredTo: user._id }
      ]
    }
    
    const transfers = await MyTicket.find(query)
      .populate('eventId')
      .populate('ticketTypeId')
      .populate('orderId')
      .populate('userId', 'walletAddress email firstName lastName')
      .populate('transferredTo', 'walletAddress email firstName lastName')
      .sort({ updatedAt: -1 })
      .lean()
    
    // Format response
    const formattedTransfers = transfers.map(ticket => ({
      _id: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      seatNumber: ticket.seatNumber,
      zone: ticket.zone,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      transferredAt: ticket.transferredTo ? ticket.updatedAt : undefined,
      
      event: ticket.eventId ? {
        _id: ticket.eventId._id.toString(),
        title: ticket.eventId.title,
        venue: ticket.eventId.venue,
        startDate: ticket.eventId.startDate,
        endDate: ticket.eventId.endDate,
        imageCid: ticket.eventId.imageCid,
        bannerImage: ticket.eventId.bannerImage,
        isVirtual: ticket.eventId.isVirtual
      } : null,
      
      ticketType: ticket.ticketTypeId ? {
        _id: ticket.ticketTypeId._id.toString(),
        name: ticket.ticketTypeId.name,
        category: ticket.ticketTypeId.category,
        price: ticket.ticketTypeId.price
      } : null,
      
      order: ticket.orderId ? {
        _id: ticket.orderId._id.toString(),
        paymentMethod: ticket.orderId.paymentMethod,
        totalAmount: ticket.orderId.totalAmount,
        currency: ticket.orderId.currency
      } : null,
      
      fromUser: ticket.userId ? {
        _id: ticket.userId._id.toString(),
        walletAddress: ticket.userId.walletAddress,
        email: ticket.userId.email,
        firstName: ticket.userId.firstName,
        lastName: ticket.userId.lastName
      } : undefined,
      
      toUser: ticket.transferredTo ? {
        _id: ticket.transferredTo._id.toString(),
        walletAddress: ticket.transferredTo.walletAddress,
        email: ticket.transferredTo.email,
        firstName: ticket.transferredTo.firstName,
        lastName: ticket.transferredTo.lastName
      } : undefined
    }))
    
    // Calculate stats
    const sentTransfers = transfers.filter(t => 
      t.userId?._id?.toString() === user._id.toString() && 
      t.transferredTo
    ).length
    
    const receivedTransfers = transfers.filter(t => 
      t.transferredTo?._id?.toString() === user._id.toString()
    ).length
    
    const pendingTransfers = transfers.filter(t => 
      t.status === 'transferred' && 
      t.transferredTo?._id?.toString() === user._id.toString()
    ).length
    
    return NextResponse.json({
      success: true,
      transfers: formattedTransfers,
      stats: {
        sentTransfers,
        receivedTransfers,
        pendingTransfers,
        totalTransfers: transfers.length
      }
    })
    
  } catch (error: any) {
    console.error('Error fetching transfers:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transfers' },
      { status: 500 }
    )
  }
}