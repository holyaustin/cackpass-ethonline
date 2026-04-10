import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { Event, TicketType, User } from '@/lib/database/models'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    
    console.log('📝 [API] Received event data:', JSON.stringify(body, null, 2))
    
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
      const userByWallet = await User.findOne({ walletAddress: userWallet })
      if (userByWallet) {
        userId = userByWallet._id
      } else {
        const newUser = new User({
          walletAddress: userWallet,
          loginMethod: 'wallet',
          isOrganizer: true,
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
      organizerId: userId,
      organizerWallet: userWallet,
      title: body.title,
      description: body.description,
      category: body.category,
      customCategory: body.customCategory || undefined,
      venue: body.venue || body.location,
      location: { address: body.location || body.venue },
      isVirtual: isVirtual,
      ...(isVirtual && {
        virtualOptions: {
          zoomMeeting: virtualOptions.zoomMeeting || false,
          googleMeet: virtualOptions.googleMeet || false,
          hasVirtualLink: virtualOptions.hasVirtualLink || false,
          virtualLink: virtualOptions.virtualLink || ''
        }
      }),
      startDate: body.startDateTime ? new Date(body.startDateTime) : 
                (body.startDate ? new Date(`${body.startDate}T${body.startTime || '00:00'}`) : new Date()),
      endDate: body.endDateTime ? new Date(body.endDateTime) :
              (body.endDate ? new Date(`${body.endDate}T${body.endTime || '23:59'}`) : new Date()),
      startDateTime: body.startDateTime || (body.startDate ? new Date(`${body.startDate}T${body.startTime || '00:00'}`) : null),
      endDateTime: body.endDateTime || (body.endDate ? new Date(`${body.endDate}T${body.endTime || '23:59'}`) : null),
      isFree: Boolean(body.isFree),
      price: body.price || (body.priceAmount ? parseFloat(body.priceAmount) : 0),
      currency: body.currency || 'USD',
      ticketType: body.ticketType || 'GeneralAdmission',
      unlimitedCapacity: Boolean(body.unlimitedCapacity),
      capacity: body.capacity ? parseInt(body.capacity) : undefined,
      isOnChain: Boolean(body.isOnChain),
      transactionHash: body.transactionHash,
      gaslessWallet: body.gaslessWallet,
      ticketId: body.ticketId,
      imageCid: body.imageCid,
      metadataCid: body.metadataCid,
      metadataURI: body.metadataURI,
      onChainId: body.onChainId,
      status: body.status || 'published',
      isActive: body.isActive !== false,
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
    console.log(`✅ [API] Event created: ${event._id} - ${event.title}`)
    
    // ========== CREATE TICKET TYPES - USING EXACT SAME PATTERN AS MIGRATION SCRIPT ==========
    let ticketTypesCreated = 0
    
    // Determine ticket type name based on event's ticketType field (same as migration script)
    let ticketTypeName = ''
    let category = ''
    let onChainCategoryId = 0

    switch (event.ticketType) {
      case 'GeneralAdmission':
        ticketTypeName = 'General Admission'
        category = 'GeneralAdmission'
        onChainCategoryId = 0
        break
      case 'ReservedSeating':
        ticketTypeName = 'Reserved Seating'
        category = 'ReservedSeating'
        onChainCategoryId = 1
        break
      case 'VIPPremium':
        ticketTypeName = 'VIP Premium'
        category = 'VIPPremium'
        onChainCategoryId = 2
        break
      case 'Others':
        ticketTypeName = event.title
        category = 'Others'
        onChainCategoryId = 3
        break
      default:
        ticketTypeName = 'General Admission'
        category = 'GeneralAdmission'
        onChainCategoryId = 0
    }

    // Create ticket type - EXACT same structure as migration script
    const ticketTypeData = {
      eventId: event._id,
      name: ticketTypeName,
      description: `Ticket for ${event.title}`,
      category: category,
      price: event.isFree ? 0 : event.price,
      maxSupply: event.unlimitedCapacity ? 0 : (event.capacity || 100),
      currentSupply: 0,
      isActive: true,
      onChainCategoryId: onChainCategoryId,
    }

    console.log(`🎫 [API] Creating ticket type: ${ticketTypeName} - $${ticketTypeData.price}`)

    const ticketType = new TicketType(ticketTypeData)
    await ticketType.save()
    ticketTypesCreated++
    
    console.log(`   ✅ Created ticket type: ${ticketType.name} (ID: ${ticketType._id})`)
    console.log(`✅ [API] Total ticket types created: ${ticketTypesCreated}`)
    
    // Verify ticket types were actually saved
    const verifyTicketTypes = await TicketType.find({ eventId: event._id })
    console.log(`🔍 [API] Verification: Found ${verifyTicketTypes.length} ticket types in database for this event`)
    
    // Redirect to the newly created event page
    const eventUrl = `/events/${event._id}`
    
    return NextResponse.json({
      success: true,
      eventId: event._id,
      ticketTypesCreated: ticketTypesCreated,
      ticketTypesCount: verifyTicketTypes.length,
      redirectUrl: eventUrl,
      message: `Event created successfully with ${ticketTypesCreated} ticket type(s)`,
      event: {
        id: event._id,
        title: event.title,
        isFree: event.isFree,
        isOnChain: event.isOnChain
      }
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('❌ [API] Event creation error:', error)
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

// PUT endpoint - Update event with blockchain info
export async function PUT(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { eventId, onChainId, transactionHash, ticketId, isOnChain } = body
    
    if (!eventId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'eventId is required' 
        },
        { status: 400 }
      )
    }
    
    const event = await Event.findById(eventId)
    if (!event) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Event not found' 
        },
        { status: 404 }
      )
    }
    
    if (onChainId !== undefined) event.onChainId = onChainId
    if (transactionHash !== undefined) event.transactionHash = transactionHash
    if (ticketId !== undefined) event.ticketId = ticketId
    if (isOnChain !== undefined) event.isOnChain = isOnChain
    
    event.updatedAt = new Date()
    await event.save()
    
    return NextResponse.json({
      success: true,
      message: 'Event updated successfully',
      event: {
        id: event._id,
        onChainId: event.onChainId,
        transactionHash: event.transactionHash,
        isOnChain: event.isOnChain
      }
    })
    
  } catch (error: any) {
    console.error('Event update error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update event',
        details: error.message
      },
      { status: 500 }
    )
  }
}