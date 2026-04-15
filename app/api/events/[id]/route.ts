// app/api/events/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { Event } from '@/lib/database/models'
import mongoose from 'mongoose'

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
    return NextResponse.json({ success: true, event: formattedEvent })
  } catch (error: any) {
    console.error('Error fetching event:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch event' },
      { status: 500 }
    )
  }
}

// ✅ PUT – Update event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    const { id } = await params
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid event ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      startDateTime,
      endDateTime,
      startDate,
      endDate,
      startTime,
      endTime,
      category,
      customCategory,
      venue,
      location,
      isVirtual,
      virtualOptions,
      isFree,
      price,
      currency,
      ticketType,
      unlimitedCapacity,
      capacity,
      imageCid,
      status,
      isActive,
    } = body

    const updateData: any = {
      title,
      description,
      startDateTime: startDateTime ? new Date(startDateTime) : undefined,
      endDateTime: endDateTime ? new Date(endDateTime) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      category,
      customCategory,
      venue,
      location,
      isVirtual,
      virtualOptions,
      isFree,
      price,
      currency,
      ticketType,
      unlimitedCapacity,
      capacity,
      imageCid,
      status,
      isActive,
      updatedAt: new Date(),
    }

    // Remove undefined fields
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key])

    const event = await Event.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, event })
  } catch (error: any) {
    console.error('PUT /api/events/[id] error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update event' },
      { status: 500 }
    )
  }
}