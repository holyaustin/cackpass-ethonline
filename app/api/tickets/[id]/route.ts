// /app/api/tickets/[id]/route.ts - NEW FILE (for ticket operations)
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { MyTicket, User, Event, TicketType, Order } from '@/lib/database/models'

export const dynamic = 'force-dynamic'

// GET - Get specific ticket details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Ticket ID is required' },
        { status: 400 }
      )
    }
    
    const ticket = await MyTicket.findById(id)
      .populate('eventId')
      .populate('ticketTypeId')
      .populate('orderId')
      .lean()
    
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      ticket: {
        ...ticket,
        _id: ticket._id.toString(),
        eventId: ticket.eventId?._id?.toString(),
        ticketTypeId: ticket.ticketTypeId?._id?.toString(),
        orderId: ticket.orderId?._id?.toString()
      }
    })
    
  } catch (error: any) {
    console.error('Error fetching ticket:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ticket' },
      { status: 500 }
    )
  }
}

// PATCH - Update ticket status (mark as used, transfer, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    
    const { id } = await params
    const body = await request.json()
    const { status, transferredTo } = body
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Ticket ID is required' },
        { status: 400 }
      )
    }
    
    const ticket = await MyTicket.findById(id)
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      )
    }
    
    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      'active': ['used', 'transferred', 'cancelled'],
      'transferred': ['used', 'cancelled'],
      'used': [], // Can't change from used
      'cancelled': [], // Can't change from cancelled
      'refunded': [] // Can't change from refunded
    }
    
    if (status && status !== ticket.status) {
      const allowedTransitions = validTransitions[ticket.status] || []
      if (!allowedTransitions.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Cannot change status from ${ticket.status} to ${status}` },
          { status: 400 }
        )
      }
      
      ticket.status = status
      ticket.updatedAt = new Date()
      
      if (status === 'used') {
        ticket.usedAt = new Date()
      } else if (status === 'transferred' && transferredTo) {
        ticket.transferredTo = transferredTo
      }
    }
    
    await ticket.save()
    
    return NextResponse.json({
      success: true,
      message: 'Ticket updated successfully',
      ticket: {
        _id: ticket._id.toString(),
        status: ticket.status,
        updatedAt: ticket.updatedAt
      }
    })
    
  } catch (error: any) {
    console.error('Error updating ticket:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update ticket' },
      { status: 500 }
    )
  }
}