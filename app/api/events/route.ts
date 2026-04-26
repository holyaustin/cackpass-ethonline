// app/api/events/route.ts - COMPLETE WORKING VERSION
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { Event, User } from '@/lib/database/models'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

// GET - Fetch events with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const category = searchParams.get('category')
    const priceType = searchParams.get('priceType')
    const dateType = searchParams.get('dateType')
    const search = searchParams.get('search') || ''
    
    const skip = (page - 1) * limit
    
    // Build base query
    let query: any = { 
      status: 'published',
      isActive: true 
    }
    
    // Category filter
    if (category && category !== 'all') {
      query.category = category
    }
    
    // Price type filter
    if (priceType === 'free') {
      query.isFree = true
    } else if (priceType === 'paid') {
      query.isFree = false
      query.price = { $gt: 0 }
    }
    
    // ========== DATE FILTER USING END DATE/TIME ==========
    // Tickets can be sold until the event ENDS, not just until it starts
    const now = new Date()
    
    if (dateType === 'upcoming') {
      // Events that HAVEN'T ENDED yet (tickets still available)
      query.$or = [
        { endDateTime: { $gt: now } },
        { endDateTime: { $exists: false }, endDate: { $gt: now } }
      ]
    } else if (dateType === 'past') {
      // Events that HAVE ENDED (no tickets available)
      query.$or = [
        { endDateTime: { $lt: now } },
        { endDateTime: { $exists: false }, endDate: { $lt: now } }
      ]
    }
    // If dateType === 'all' or undefined, show all events
    
    // Search filter
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' }
      query.$and = [
        query.$or ? { $or: query.$or } : {},
        {
          $or: [
            { title: searchRegex },
            { description: searchRegex },
            { venue: searchRegex },
            { 'location.address': searchRegex }
          ]
        }
      ]
      // Clean up if $or was at root
      if (query.$or && query.$and[0].$or) {
        delete query.$or
      }
    }
    
    console.log('📅 Date filter:', dateType)
    console.log('⏰ Current time:', now.toISOString())
    console.log('🔍 Query:', JSON.stringify(query, (key, value) => {
      if (value instanceof Date) return value.toISOString()
      return value
    }, 2))
    
    // Execute query with pagination - sort by endDateTime (events ending soon first for upcoming)
    let eventsQuery = Event.find(query)
    
    if (dateType === 'upcoming') {
      eventsQuery = eventsQuery.sort({ endDateTime: 1, endDate: 1 }) // Ending soon first
    } else if (dateType === 'past') {
      eventsQuery = eventsQuery.sort({ endDateTime: -1, endDate: -1 }) // Most recent first
    } else {
      eventsQuery = eventsQuery.sort({ endDateTime: 1, endDate: 1, createdAt: -1 })
    }
    
    const [events, total] = await Promise.all([
      eventsQuery.skip(skip).limit(limit).lean(),
      Event.countDocuments(query)
    ])
    
    // Log each event's datetime for debugging
    console.log(`📊 Found ${events.length} events:`)
    events.forEach(event => {
      const eventEnd = event.endDateTime || event.endDate
      const timeSource = event.endDateTime ? 'endDateTime' : 'endDate'
      const isActive = new Date(eventEnd) > now
      console.log(`   - ${event.title}: Ends at ${eventEnd} (using ${timeSource}) - Tickets ${isActive ? 'AVAILABLE' : 'SOLD OUT'}`)
    })
    
    const totalPages = Math.ceil(total / limit)
    
    // Format dates for client
    const formattedEvents = events.map(event => ({
      ...event,
      _id: event._id.toString(),
      startDate: event.startDate?.toISOString(),
      endDate: event.endDate?.toISOString(),
      startDateTime: event.startDateTime?.toISOString(),
      endDateTime: event.endDateTime?.toISOString(),
      createdAt: event.createdAt?.toISOString(),
      updatedAt: event.updatedAt?.toISOString(),
      ticketsAvailable: new Date(event.endDateTime || event.endDate) > now
    }))
    
    return NextResponse.json({
      success: true,
      events: formattedEvents,
      total,
      totalPages,
      currentPage: page,
      hasMore: page < totalPages
    })
    
  } catch (error: any) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch events',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// POST - Create new event
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    console.log('Creating event with data:', JSON.stringify(body, null, 2))
    
    // Validate required fields
    const requiredFields = ['title', 'startDate', 'endDate', 'organizerWallet']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }
    
    // Find or create user by wallet address for organizerId
    let user = await User.findOne({ walletAddress: body.organizerWallet })
    let organizerId
    
    if (user) {
      organizerId = user._id
    } else {
      // If user doesn't exist, create a new user
      console.log('Creating new user for wallet:', body.organizerWallet)
      user = await User.create({
        privyId: `wallet_${body.organizerWallet}`,
        walletAddress: body.organizerWallet,
        loginMethod: 'email',
        isOrganizer: true,
        isProfileComplete: false,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      organizerId = user._id
      console.log('✅ New user created:', organizerId)
    }
    
    // Convert date strings to Date objects
    const eventData = {
      ...body,
      organizerId,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      startDateTime: body.startDateTime ? new Date(body.startDateTime) : null,
      endDateTime: body.endDateTime ? new Date(body.endDateTime) : null,
      price: typeof body.price === 'number' ? body.price : 
             body.priceAmount ? parseFloat(body.priceAmount) : 0,
      capacity: body.capacity ? parseInt(body.capacity) : null,
      isOnChain: body.isOnChain || false,
      status: body.status || 'published',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // Clean up the event data
    delete eventData.eventId
    delete eventData._id
    
    // Create event
    const event = new Event(eventData)
    await event.save()
    
    console.log('✅ Event created in database:', event._id)
    
    return NextResponse.json({
      success: true,
      eventId: event._id.toString(),
      event: {
        ...event.toObject(),
        _id: event._id.toString()
      }
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create event',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// PUT - Update existing event
export async function PUT(request: NextRequest) {
  try {
    console.log('📝 [UPDATE EVENT] Received request')
    await connectDB()
    
    const body = await request.json()
    console.log('Update request body:', JSON.stringify(body, null, 2))
    
    // Accept either MongoDB _id or onChainId
    const { _id, eventId, onChainId, ...updateData } = body
    
    const query: any = {}
    if (_id) {
      try {
        query._id = new mongoose.Types.ObjectId(_id)
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid _id format' },
          { status: 400 }
        )
      }
    } else if (eventId) {
      try {
        query._id = new mongoose.Types.ObjectId(eventId)
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid eventId format' },
          { status: 400 }
        )
      }
    } else if (onChainId) {
      query.onChainId = onChainId
    } else {
      return NextResponse.json(
        { success: false, error: 'Event ID is required (use _id, eventId, or onChainId)' },
        { status: 400 }
      )
    }
    
    // Remove any fields that shouldn't be updated
    delete updateData._id
    delete updateData.organizerId
    delete updateData.organizerWallet
    delete updateData.createdAt
    
    // Handle price conversion
    if (updateData.priceAmount) {
      updateData.price = parseFloat(updateData.priceAmount)
    }
    
    // Handle capacity conversion
    if (updateData.capacity) {
      updateData.capacity = parseInt(updateData.capacity)
    }
    
    // Update event
    const updatedEvent = await Event.findOneAndUpdate(
      query,
      { 
        ...updateData,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    )
    
    if (!updatedEvent) {
      console.error('Event not found with query:', query)
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }
    
    console.log('✅ Event updated:', updatedEvent._id)
    
    return NextResponse.json({
      success: true,
      event: {
        ...updatedEvent.toObject(),
        _id: updatedEvent._id.toString()
      }
    })
    
  } catch (error: any) {
    console.error('Error updating event:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update event',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

// OPTIONS - CORS support
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}