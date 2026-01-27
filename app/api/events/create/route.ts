// app/api/events/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { Event } from '@/lib/database/models'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    
    // Create event in MongoDB
    const event = new Event({
      ...body,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    await event.save()
    
    return NextResponse.json({
      success: true,
      eventId: event._id,
      message: 'Event saved to database'
    })
    
  } catch (error) {
    console.error('Database save error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save event' },
      { status: 500 }
    )
  }
}