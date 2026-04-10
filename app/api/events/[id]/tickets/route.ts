// app/api/events/[id]/tickets/route.ts - FIXED
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { Event } from '@/lib/database/models'

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
    
    const event = await Event.findById(id).lean()
    
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }
    
    // Create virtual ticket from event data
    let ticketTypeName = 'General Admission'
    switch (event.ticketType) {
      case 'GeneralAdmission':
        ticketTypeName = 'General Admission'
        break
      case 'ReservedSeating':
        ticketTypeName = 'Reserved Seating'
        break
      case 'VIPPremium':
        ticketTypeName = 'VIP Premium'
        break
      case 'Others':
        ticketTypeName = event.title
        break
      default:
        ticketTypeName = 'General Admission'
    }
    
    const virtualTicket = {
      _id: `virtual-${event._id}`,
      name: ticketTypeName,
      description: `${ticketTypeName} ticket for ${event.title}`,
      category: event.ticketType || 'GeneralAdmission',
      price: event.isFree ? 0 : event.price,
      maxSupply: event.unlimitedCapacity ? 0 : (event.capacity || 100),
      currentSupply: 0,
      isActive: true,
      eventId: event._id.toString()
    }
    
    return NextResponse.json({
      success: true,
      ticketTypes: [virtualTicket]
    })
    
  } catch (error: any) {
    console.error('Error fetching tickets:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}