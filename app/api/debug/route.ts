// Add this debug endpoint to check database connection
// app/api/debug/route.ts
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { Event } from '@/lib/database/models'

export async function GET() {
  try {
    console.log('🔍 Debug: Checking database connection...')
    
    // Connect to database
    await connectDB()
    console.log('✅ Database connected successfully')
    
    // Count all events
    const totalEvents = await Event.countDocuments({})
    console.log(`📊 Total events in database: ${totalEvents}`)
    
    // Get all events with details
    const events = await Event.find({})
      .select('_id title status isActive createdAt')
      .sort({ createdAt: -1 })
      .lean()
    
    console.log('📋 Events found:', events.map(e => ({
      id: e._id,
      title: e.title,
      status: e.status,
      isActive: e.isActive,
      createdAt: e.createdAt
    })))
    
    // Check for status filters
    const activeEvents = await Event.countDocuments({ isActive: true })
    const publishedEvents = await Event.countDocuments({ status: 'published' })
    
    console.log(`📈 Active events: ${activeEvents}`)
    console.log(`📈 Published events: ${publishedEvents}`)
    
    return NextResponse.json({
      success: true,
      connection: 'connected',
      stats: {
        totalEvents,
        activeEvents,
        publishedEvents,
        events: events
      },
      environment: process.env.NODE_ENV,
      databaseUrl: process.env.MONGODB_URI ? '✓ Set' : '✗ Not set'
    })
    
  } catch (error: any) {
    console.error('❌ Debug error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      environment: process.env.NODE_ENV
    }, { status: 500 })
  }
}