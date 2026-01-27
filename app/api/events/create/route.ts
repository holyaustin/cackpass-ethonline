// app/api/events/create/route.ts - SIMPLIFIED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { Event, TicketType, User } from '@/lib/database/models'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    
    console.log('Received event data:', JSON.stringify(body, null, 2))
    
    // Validate required fields
    if (!body.organizerId && !body.organizerWallet) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required field: organizerId or organizerWallet' 
        },
        { status: 400 }
      )
    }
    
    // Find or create user
    let userId = body.organizerId
    let userWallet = body.organizerWallet
    
    // If we have organizerId, verify it's a valid ObjectId
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const userExists = await User.findById(userId)
      if (!userExists) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid organizerId: User not found' 
          },
          { status: 404 }
        )
      }
    } else if (userWallet) {
      // Find user by wallet address
      const userByWallet = await User.findOne({ walletAddress: userWallet })
      if (userByWallet) {
        userId = userByWallet._id
      } else {
        // Create new user with wallet
        const newUser = new User({
          walletAddress: userWallet,
          loginMethod: 'wallet',
          organizer: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        await newUser.save()
        userId = newUser._id
      }
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Could not identify user. Please provide organizerId or organizerWallet' 
        },
        { status: 400 }
      )
    }
    
    // Extract virtual options
    const virtualOptions = body.virtualOptions || {}
    const isVirtual = body.isVirtual || 
                     body.location?.toLowerCase().includes('virtual') || 
                     body.location?.toLowerCase().includes('online') || 
                     body.location?.toLowerCase().includes('zoom') ||
                     body.location?.toLowerCase().includes('meet') ||
                     body.location?.toLowerCase().includes('webinar') ||
                     false
    
    // Prepare event data
    const eventData: any = {
      // Core fields
      organizerId: userId,
      organizerWallet: userWallet,
      title: body.title,
      description: body.description,
      category: body.category,
      customCategory: body.customCategory || undefined,
      
      // Location
      venue: body.location,
      location: {
        address: body.location
      },
      
      // Virtual
      isVirtual: isVirtual,
      ...(isVirtual && {
        virtualOptions: {
          zoomMeeting: virtualOptions.zoomMeeting || false,
          googleMeet: virtualOptions.googleMeet || false,
          hasVirtualLink: virtualOptions.hasVirtualLink || false,
          virtualLink: virtualOptions.virtualLink || ''
        }
      }),
      
      // Dates
      startDate: body.startDateTime ? new Date(body.startDateTime) : 
                (body.startDate ? new Date(`${body.startDate}T${body.startTime || '00:00'}`) : new Date()),
      endDate: body.endDateTime ? new Date(body.endDateTime) :
              (body.endDate ? new Date(`${body.endDate}T${body.endTime || '23:59'}`) : new Date()),
      startDateTime: body.startDateTime || (body.startDate ? new Date(`${body.startDate}T${body.startTime || '00:00'}`) : null),
      endDateTime: body.endDateTime || (body.endDate ? new Date(`${body.endDate}T${body.endTime || '23:59'}`) : null),
      
      // Pricing
      isFree: Boolean(body.isFree),
      price: body.price || (body.priceAmount ? parseFloat(body.priceAmount) : 0),
      currency: body.currency || 'USD',
      
      // Ticket type
      ticketType: body.ticketType || 'GeneralAdmission',
      
      // Capacity
      unlimitedCapacity: Boolean(body.unlimitedCapacity),
      capacity: body.capacity ? parseInt(body.capacity) : undefined,
      
      // Blockchain
      isOnChain: Boolean(body.isOnChain),
      transactionHash: body.transactionHash,
      gaslessWallet: body.gaslessWallet,
      ticketId: body.ticketId,
      imageCid: body.imageCid,
      metadataCid: body.metadataCid,
      metadataURI: body.metadataURI,
      onChainId: body.onChainId,
      
      // Status
      status: body.status || 'published',
      isActive: body.isActive !== false,
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // Clean up undefined fields
    Object.keys(eventData).forEach(key => {
      if (eventData[key] === undefined) {
        delete eventData[key]
      }
    })
    
    // Create event
    const event = new Event(eventData)
    await event.save()
    
    // Create TicketType for paid events
    if (!eventData.isFree && eventData.ticketType) {
      const ticketType = new TicketType({
        eventId: event._id,
        name: `${eventData.title} - ${eventData.ticketType}`,
        description: `Ticket for ${eventData.title}`,
        category: eventData.ticketType,
        price: eventData.price || 0,
        maxSupply: eventData.unlimitedCapacity ? 0 : (eventData.capacity || 100),
        currentSupply: 0,
        metadataURI: eventData.metadataURI,
        isActive: true
      })
      await ticketType.save()
    }
    
    return NextResponse.json({
      success: true,
      eventId: event._id,
      message: 'Event created successfully',
      event: {
        id: event._id,
        title: event.title,
        isFree: event.isFree,
        isOnChain: event.isOnChain
      }
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('Event creation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create event',
        details: error.message
      },
      { status: 500 }
    )
  }
}