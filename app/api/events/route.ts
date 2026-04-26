// app/api/events/route.ts - COMPLETE FIXED VERSION
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
    
    // Build query
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
    
    // ========== FIXED DATE FILTER ==========
    // Use startDateTime (actual event time) instead of startDate
    const now = new Date()
    if (dateType === 'upcoming') {
      // Event is upcoming if startDateTime is in the future
      // OR if no startDateTime, use startDate
      query.$or = [
        { startDateTime: { $gte: now } },
        { startDateTime: { $exists: false }, startDate: { $gte: now } }
      ]
    } else if (dateType === 'past') {
      // Event is past if startDateTime is in the past
      // OR if no startDateTime, use startDate
      query.$or = [
        { startDateTime: { $lt: now } },
        { startDateTime: { $exists: false }, startDate: { $lt: now } }
      ]
    }
    // If dateType === 'all', no date filter
    
    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { venue: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } }
      ]
    }
    
    console.log('📅 Date filter:', dateType, 'Current time:', now.toISOString())
    console.log('Query:', JSON.stringify(query, null, 2))
    
    // Execute query with pagination - sort by startDateTime
    const [events, total] = await Promise.all([
      Event.find(query)
        .sort({ startDateTime: 1, startDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments(query)
    ])
    
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