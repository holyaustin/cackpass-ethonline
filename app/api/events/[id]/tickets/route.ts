import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { Event, TicketType } from '@/lib/database/models'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      )
    }
    
    // Get event for capacity info
    const event = await Event.findById(id).lean()
    
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }
    
    // Find real ticket types in the database
    let ticketTypes = await TicketType.find({ eventId: id }).lean()
    
    // If no ticket types exist, create virtual ticket from event data
    if (!ticketTypes || ticketTypes.length === 0) {
      let ticketTypeName = 'General Admission'
      let category = 'GeneralAdmission'
      let onChainCategoryId = 0
      
      switch (event.ticketType) {
        case 'GeneralAdmission':
          ticketTypeName = 'General Admission'
          category = 'GeneralAdmission'
          onChainCategoryId = 0
          break
        case 'ReservedSeating':
          ticketTypeName = 'Reserved Seating'
          category = 'ReservedSeating'
          onChainCategoryId = 1
          break
        case 'VIPPremium':
          ticketTypeName = 'VIP Premium'
          category = 'VIPPremium'
          onChainCategoryId = 2
          break
        case 'Others':
          ticketTypeName = event.title
          category = 'Others'
          onChainCategoryId = 3
          break
        default:
          ticketTypeName = 'General Admission'
          category = 'GeneralAdmission'
          onChainCategoryId = 0
      }
      
      // Calculate remaining tickets for virtual ticket
      const soldTickets = event.ticketsSold || 0
      const totalCapacity = event.unlimitedCapacity ? 0 : event.capacity
      const remainingTickets = event.unlimitedCapacity ? 0 : (event.capacity - soldTickets)
      
      console.log(`📊 Virtual ticket calculation:`);
      console.log(`   - Total capacity: ${totalCapacity === 0 ? 'Unlimited' : totalCapacity}`);
      console.log(`   - Tickets sold: ${soldTickets}`);
      console.log(`   - Remaining: ${remainingTickets === 0 ? 'Unlimited' : remainingTickets}`);
      
      const virtualTicket = {
        _id: `virtual_${event._id}`,
        name: ticketTypeName,
        description: `${ticketTypeName} ticket for ${event.title}`,
        category: category,
        price: event.isFree ? 0 : event.price,
        maxSupply: totalCapacity,
        currentSupply: soldTickets, // This shows how many sold
        isActive: true,
        eventId: event._id.toString(),
        isVirtual: true
      }
      
      ticketTypes = [virtualTicket]
    } else {
      // Format real ticket types - include updated currentSupply
      ticketTypes = ticketTypes.map(ticket => ({
        ...ticket,
        _id: ticket._id.toString(),
        eventId: ticket.eventId.toString()
      }))
    }
    
    return NextResponse.json({
      success: true,
      ticketTypes: ticketTypes,
      event: {
        capacity: event.capacity,
        ticketsSold: event.ticketsSold || 0,
        unlimitedCapacity: event.unlimitedCapacity
      }
    })
    
  } catch (error: any) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}