// app/api/events/[id]/tickets/route.ts - FIXED
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { TicketType } from '@/lib/database/models'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    
    // Await the params promise
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      )
    }
    
    const ticketTypes = await TicketType.find({ eventId: id }).lean()
    
    const formattedTicketTypes = ticketTypes.map(ticket => ({
      ...ticket,
      _id: ticket._id.toString()
    }))
    
    return NextResponse.json({
      success: true,
      ticketTypes: formattedTicketTypes
    })
    
  } catch (error: any) {
    console.error('Error fetching ticket types:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ticket types' },
      { status: 500 }
    )
  }
}