// /app/api/tickets/my-tickets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { MyTicket, User, Event, TicketType, Order } from '@/lib/database/models'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const filter = searchParams.get('filter') || 'all'
    const search = searchParams.get('search') || ''
    const walletAddress = searchParams.get('walletAddress')
    
    if (!walletAddress) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'walletAddress query param is required' 
        },
        { status: 400 }
      )
    }
    
    const skip = (page - 1) * limit
    
    // Find user by wallet address
    const user = await User.findOne({ walletAddress })
    if (!user) {
      return NextResponse.json({
        success: true,
        tickets: [],
        stats: {
          totalTickets: 0,
          activeTickets: 0,
          pastTickets: 0,
          transferredTickets: 0
        },
        pagination: {
          page: 1,
          totalPages: 0,
          totalItems: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      })
    }
    
    // Build base query
    let query: any = { userId: user._id }
    
    // Apply status filters
    if (filter === 'active') {
      query.status = 'active'
    } else if (filter === 'transferred') {
      query.status = 'transferred'
    } else if (filter === 'used') {
      query.status = 'used'
    } else if (filter === 'cancelled') {
      query.status = 'cancelled'
    } else if (filter === 'refunded') {
      query.status = 'refunded'
    }
    
    // Get tickets with population
    const [tickets, total] = await Promise.all([
      MyTicket.find(query)
        .populate({
          path: 'eventId',
          select: 'title venue location startDate endDate startDateTime endDateTime imageCid bannerImage isVirtual isFree price currency',
          model: Event
        })
        .populate({
          path: 'ticketTypeId',
          select: 'name category price',
          model: TicketType
        })
        .populate({
          path: 'orderId',
          select: 'paymentMethod paymentStatus totalAmount currency createdAt',
          model: Order
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MyTicket.countDocuments(query)
    ])
    
    // Filter by date and search
    const now = new Date()
    const filteredTickets = tickets.filter(ticket => {
      const event = ticket.eventId as any
      
      // Apply date filters
      if (filter === 'active') {
        const eventDate = event?.startDate || event?.startDateTime
        if (!eventDate || new Date(eventDate) <= now) return false
      } else if (filter === 'past') {
        const eventDate = event?.startDate || event?.startDateTime
        if (eventDate && new Date(eventDate) > now) return false
      }
      
      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase()
        const eventTitle = event?.title?.toLowerCase() || ''
        const venue = event?.venue?.toLowerCase() || ''
        const ticketNumber = ticket.ticketNumber?.toLowerCase() || ''
        
        return (
          eventTitle.includes(searchLower) ||
          venue.includes(searchLower) ||
          ticketNumber.includes(searchLower)
        )
      }
      
      return true
    })
    
    // Format response
    const formattedTickets = filteredTickets.map(ticket => {
      const event = ticket.eventId as any
      const ticketType = ticket.ticketTypeId as any
      const order = ticket.orderId as any
      
      const eventDate = event?.startDate || event?.startDateTime
      const isPast = eventDate ? new Date(eventDate) <= new Date() : false
      const isActive = ticket.status === 'active' && !isPast
      
      return {
        _id: ticket._id?.toString() || '',
        ticketNumber: ticket.ticketNumber || '',
        qrCode: ticket.qrCode || '',
        qrCodeCid: ticket.qrCodeCid || '',
        status: ticket.status || 'active',
        seatNumber: ticket.seatNumber || '',
        zone: ticket.zone || '',
        createdAt: ticket.createdAt ? new Date(ticket.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: ticket.updatedAt ? new Date(ticket.updatedAt).toISOString() : new Date().toISOString(),
        isPast,
        isActive,
        canTransfer: isActive && ticket.status === 'active',
        
        event: event ? {
          _id: event._id?.toString() || '',
          title: event.title || '',
          venue: event.venue || '',
          location: event.location || {},
          startDate: event.startDate ? new Date(event.startDate).toISOString() : '',
          endDate: event.endDate ? new Date(event.endDate).toISOString() : '',
          startDateTime: event.startDateTime ? new Date(event.startDateTime).toISOString() : '',
          endDateTime: event.endDateTime ? new Date(event.endDateTime).toISOString() : '',
          imageCid: event.imageCid || '',
          bannerImage: event.bannerImage || '',
          isVirtual: event.isVirtual || false,
          isFree: event.isFree || false,
          price: event.price || 0,
          currency: event.currency || 'USD'
        } : null,
        
        ticketType: ticketType ? {
          _id: ticketType._id?.toString() || '',
          name: ticketType.name || '',
          category: ticketType.category || '',
          price: ticketType.price || 0
        } : null,
        
        order: order ? {
          _id: order._id?.toString() || '',
          paymentMethod: order.paymentMethod || 'free',
          paymentStatus: order.paymentStatus || 'completed',
          totalAmount: order.totalAmount || 0,
          currency: order.currency || 'USD',
          createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString()
        } : null
      }
    })
    
    const totalPages = Math.ceil(total / limit)
    
    // Calculate stats
    const stats = {
      totalTickets: total,
      activeTickets: formattedTickets.filter(t => t.isActive).length,
      pastTickets: formattedTickets.filter(t => t.isPast).length,
      transferredTickets: formattedTickets.filter(t => t.status === 'transferred').length
    }
    
    return NextResponse.json({
      success: true,
      tickets: formattedTickets,
      stats,
      pagination: {
        page,
        totalPages,
        totalItems: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })
    
  } catch (error: any) {
    console.error('Error fetching user tickets:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch tickets',
        details: error.message 
      },
      { status: 500 }
    )
  }
}