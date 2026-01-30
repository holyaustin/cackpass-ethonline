// app/api/events/route.ts - FIXED (no params needed here, but adding proper typing)
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { Event } from '@/lib/database/models'

export const dynamic = 'force-dynamic'

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
    if (category) {
      query.category = category
    }
    
    // Price type filter
    if (priceType === 'free') {
      query.isFree = true
    } else if (priceType === 'paid') {
      query.isFree = false
      query.price = { $gt: 0 }
    }
    
    // Date filter
    const now = new Date()
    if (dateType === 'upcoming') {
      query.startDate = { $gte: now }
    } else if (dateType === 'past') {
      query.startDate = { $lt: now }
    }
    
    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { venue: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } }
      ]
    }
    
    // Execute query with pagination
    const [events, total] = await Promise.all([
      Event.find(query)
        .sort({ startDate: 1, createdAt: -1 })
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