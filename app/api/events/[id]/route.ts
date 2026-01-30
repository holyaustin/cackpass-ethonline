// app/api/events/[id]/route.ts - FIXED
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
    
    // Await the params promise
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
    
    // Format event data
    const formattedEvent = {
      ...event,
      _id: event._id.toString(),
      startDate: event.startDate?.toISOString(),
      endDate: event.endDate?.toISOString(),
      startDateTime: event.startDateTime?.toISOString(),
      endDateTime: event.endDateTime?.toISOString(),
      createdAt: event.createdAt?.toISOString(),
      updatedAt: event.updatedAt?.toISOString(),
    }
    
    return NextResponse.json({
      success: true,
      event: formattedEvent
    })
    
  } catch (error: any) {
    console.error('Error fetching event:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch event' },
      { status: 500 }
    )
  }
}