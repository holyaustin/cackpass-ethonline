// /app/api/tickets/free/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { connectDB } from '@/lib/database/connection'
import mongoose from 'mongoose'
import crypto from 'crypto'

// Initialize Privy client
const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID || '',
  process.env.PRIVY_APP_SECRET || ''
)

// Rate limiting store
const rateLimitStore = new Map<string, { count: number, resetTime: number }>()
const RATE_LIMIT_WINDOW = 3600000 // 1 hour in milliseconds
const MAX_FREE_TICKETS_PER_HOUR = 5

// Type declaration for global
declare global {
  // eslint-disable-next-line no-var
  var rateLimitCleanup: NodeJS.Timeout | undefined
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `FREE-${Date.now().toString(36)}`
  
  console.log(`🎫 [${requestId}] Free ticket API called`)
  
  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log(`❌ [${requestId}] Missing auth header`)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
          requestId
        },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    
    // Verify the token with Privy
    let verifiedClaims
    try {
      verifiedClaims = await privy.verifyAuthToken(token)
    } catch (error) {
      console.error(`❌ [${requestId}] Token verification failed:`, error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
          requestId
        },
        { status: 401 }
      )
    }

    const userId = verifiedClaims.userId
    
    if (!userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User not found',
          code: 'USER_NOT_FOUND',
          requestId
        },
        { status: 404 }
      )
    }

    // Rate limiting
    const now = Date.now()
    const userLimit = rateLimitStore.get(userId)
    
    if (userLimit) {
      if (now < userLimit.resetTime) {
        if (userLimit.count >= MAX_FREE_TICKETS_PER_HOUR) {
          const retryAfter = Math.ceil((userLimit.resetTime - now) / 1000)
          console.log(`⏰ [${requestId}] Rate limit exceeded for user ${userId}`)
          
          return NextResponse.json(
            { 
              success: false, 
              error: `Too many requests. Please try again in ${retryAfter} seconds.`,
              code: 'RATE_LIMITED',
              retryAfter,
              requestId
            },
            { status: 429 }
          )
        }
        userLimit.count++
      } else {
        // Reset window
        rateLimitStore.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
      }
    } else {
      rateLimitStore.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    }

    // Parse and validate request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON body',
          code: 'INVALID_JSON',
          requestId
        },
        { status: 400 }
      )
    }
    
    const { eventId, ticketTypeId, quantity = 1 } = body
    
    // ✅ FIXED: Only require eventId for free tickets
    if (!eventId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing eventId',
          code: 'MISSING_EVENT_ID',
          requestId
        },
        { status: 400 }
      )
    }
    
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 2) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Quantity must be between 1 and 2',
          code: 'INVALID_QUANTITY',
          requestId
        },
        { status: 400 }
      )
    }

    // Get user info from Privy to get wallet address
    const privyUser = await privy.getUser(userId)
    
    if (!privyUser) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User not found in Privy',
          code: 'USER_NOT_FOUND',
          requestId
        },
        { status: 404 }
      )
    }

    // Extract wallet address from Privy user
    function getWalletAddressFromPrivyUser(user: any): string | null {
      if (!user) return null
      
      if (user.wallet?.address && typeof user.wallet.address === 'string') {
        return user.wallet.address.toLowerCase()
      }
      
      const linkedAccounts = user.linkedAccounts || []
      
      const embeddedWallet = linkedAccounts.find(
        (acc: any) => acc.type === 'wallet' && acc.walletClientType === 'privy'
      )
      
      if (embeddedWallet?.address) {
        return embeddedWallet.address.toLowerCase()
      }
      
      for (const account of linkedAccounts) {
        if (account.type === 'wallet' && account.address) {
          return account.address.toLowerCase()
        }
      }
      
      return null
    }

    const walletAddress = getWalletAddressFromPrivyUser(privyUser)
    
    if (!walletAddress) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No wallet address found. Please connect a wallet to receive tickets.',
          code: 'NO_WALLET',
          requestId
        },
        { status: 400 }
      )
    }

    console.log(`👤 [${requestId}] User ${userId}, Wallet: ${walletAddress}`)

    // Connect to database
    await connectDB()
    
    // Get User model with your schema
    const UserSchema = new mongoose.Schema({
      privyId: { type: String, required: true, unique: true },
      walletAddress: { type: String, default: null },
      loginMethod: { 
        type: String, 
        enum: ['email', 'google', 'twitter'], 
        required: true 
      },
      email: { type: String },
      firstName: { type: String },
      lastName: { type: String },
      username: { type: String },
      isOrganizer: { type: Boolean, default: false },
      country: { type: String, default: '' },
      phoneNumber: { type: String, default: '' },
      isProfileComplete: { type: Boolean, default: false },
      admin: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    })

    // Get or create models
    const User = mongoose.models.User || mongoose.model('User', UserSchema)
    
    // First try to find user by wallet address (case-insensitive)
    let user = await User.findOne({ 
      walletAddress: { $regex: new RegExp(`^${walletAddress}$`, 'i') } 
    }).lean()
    
    // If not found by wallet address, try by privyId
    if (!user) {
      user = await User.findOne({ privyId: userId }).lean()
    }
    
    // If still not found, user doesn't exist in database
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User account not found. Please complete your profile first.',
          code: 'USER_NOT_REGISTERED',
          requestId
        },
        { status: 404 }
      )
    }

    // Check if user has email
    if (!user.email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email address not found in your profile. Please update your profile with a valid email.',
          code: 'NO_EMAIL',
          requestId
        },
        { status: 400 }
      )
    }

    // Get other models
    const Event = mongoose.models.Event || mongoose.model('Event', new mongoose.Schema({}), 'events')
    const TicketType = mongoose.models.TicketType || mongoose.model('TicketType', new mongoose.Schema({}), 'tickettypes')
    const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', new mongoose.Schema({}), 'tickets')
    
    // ✅ FIXED: Validate event first
    const event = await Event.findById(eventId).lean()
    
    if (!event) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Event not found',
          code: 'EVENT_NOT_FOUND',
          requestId
        },
        { status: 404 }
      )
    }
    
    // ✅ FIXED: Check if event is free
    if (!event.isFree) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'This event is not free',
          code: 'EVENT_NOT_FREE',
          requestId
        },
        { status: 400 }
      )
    }
    
    // ✅ FIXED: Handle ticket type for free events
    let ticketType
    let finalTicketTypeId = ticketTypeId
    
    if (ticketTypeId) {
      // If ticketTypeId was provided, use it
      ticketType = await TicketType.findById(ticketTypeId).lean()
      
      if (!ticketType) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Ticket type not found',
            code: 'TICKET_TYPE_NOT_FOUND',
            requestId
          },
          { status: 404 }
        )
      }
      
      // Verify this is actually a free ticket if ticketTypeId was provided
      if (ticketType.price > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'This is not a free ticket',
            code: 'NOT_FREE_TICKET',
            price: ticketType.price,
            requestId
          },
          { status: 400 }
        )
      }
    } else {
      // ✅ FIXED: For free events without ticketTypeId, find or create a free ticket type
      console.log(`🔍 [${requestId}] No ticketTypeId provided, looking for free ticket type for event ${eventId}`)
      
      // Look for existing free ticket type for this event
      ticketType = await TicketType.findOne({
        eventId: eventId,
        price: 0
      }).lean()
      
      // If no free ticket type exists, create one
      if (!ticketType) {
        console.log(`📝 [${requestId}] Creating free ticket type for event ${eventId}`)
        
        // Create a new ticket type for free events
        const FreeTicketTypeSchema = new mongoose.Schema({
          eventId: { type: String, required: true },
          name: { type: String, default: 'Free Admission' },
          category: { type: String, default: 'General Admission' },
          price: { type: Number, default: 0 },
          maxSupply: { type: Number, default: 0 }, // 0 = unlimited
          currentSupply: { type: Number, default: 0 },
          isActive: { type: Boolean, default: true },
          createdAt: { type: Date, default: Date.now },
          updatedAt: { type: Date, default: Date.now }
        })
        
        const FreeTicketType = mongoose.models.TicketType || mongoose.model('TicketType', FreeTicketTypeSchema)
        
        const newTicketType = await FreeTicketType.create({
          eventId: eventId,
          name: 'Free Admission',
          category: 'GeneralAdmission',
          price: 0,
          maxSupply: 0,
          currentSupply: 0,
          isActive: true
        })
        
        ticketType = newTicketType.toObject()
        finalTicketTypeId = newTicketType._id.toString()
        
        console.log(`✅ [${requestId}] Created free ticket type: ${finalTicketTypeId}`)
      } else {
        finalTicketTypeId = ticketType._id.toString()
        console.log(`✅ [${requestId}] Found existing free ticket type: ${finalTicketTypeId}`)
      }
    }
    
    // Check availability (only if ticket has a max supply)
    if (ticketType.maxSupply > 0 && ticketType.currentSupply + quantity > ticketType.maxSupply) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Not enough tickets available',
          code: 'SOLD_OUT',
          available: ticketType.maxSupply - ticketType.currentSupply,
          requestId
        },
        { status: 400 }
      )
    }
    
    // Check if event is in the past
    if (new Date(event.endDate) < new Date()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'This event has already ended',
          code: 'EVENT_ENDED',
          requestId
        },
        { status: 400 }
      )
    }
    
    // Check if user already has tickets for this event
    const existingTickets = await Ticket.countDocuments({
      userId: user._id,
      eventId,
      status: { $in: ['active', 'used'] }
    })
    
    if (existingTickets >= 3) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Maximum 3 tickets per event allowed',
          code: 'MAX_TICKETS_REACHED',
          existing: existingTickets,
          requestId
        },
        { status: 400 }
      )
    }
    
    // Generate unique ticket ID
    const ticketId = `FREE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
    
    // Generate QR code data
    const verificationCode = crypto.randomBytes(12).toString('hex')
    const qrCodeData = `cackpass://ticket/${ticketId}/${verificationCode}`
    
    // Generate QR code image URL (using a free QR code API)
    const qrCodeImageUrl = generateQRCodeUrl(qrCodeData)
    
    // Create ticket record
    const ticketData = {
      ticketId,
      userId: user._id,
      eventId,
      ticketTypeId: finalTicketTypeId,
      quantity,
      totalAmount: 0,
      status: 'active',
      metadata: {
        emailSent: false,
        emailAddress: user.email,
        walletAddress: walletAddress,
        isFree: true,
        source: 'free_ticket_api',
        userName: user.firstName || user.username || 'User',
        qrCodeData: qrCodeData,
        qrCodeImageUrl: qrCodeImageUrl,
        verificationCode: verificationCode
      },
      expiresAt: new Date(event.endDate),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const ticket = await Ticket.create(ticketData)
    
    // Update ticket supply (only if ticket type has max supply)
    if (ticketType.maxSupply > 0) {
      await TicketType.findByIdAndUpdate(
        finalTicketTypeId,
        { $inc: { currentSupply: quantity } },
        { new: true }
      )
    }
    
    // Send email notification with QR code
    let emailSent = false
    let emailError: string | null = null
    
    try {
      await sendTicketEmail({
        to: user.email,
        ticketId: ticket.ticketId,
        eventName: event.title,
        eventDate: formatEventDate(event.startDate),
        eventTime: formatEventTime(event.startDate),
        venue: event.venue || 'Online Event',
        quantity,
        userName: user.firstName || user.username || 'User',
        ticketType: ticketType.name,
        qrCodeImageUrl: qrCodeImageUrl,
        qrCodeData: qrCodeData,
        ticketDetails: {
          eventId: event._id.toString(),
          ticketId: ticket.ticketId,
          purchaseDate: new Date().toLocaleDateString(),
          status: 'Confirmed'
        }
      })
      
      emailSent = true
      
      // Update ticket with email sent status
      await Ticket.findByIdAndUpdate(ticket._id, {
        'metadata.emailSent': true,
        'metadata.sentAt': new Date()
      })
      
      console.log(`📧 [${requestId}] Email sent to ${user.email}`)
      
    } catch (error: any) {
      console.error(`❌ [${requestId}] Email sending failed:`, error)
      emailError = error.message || 'Email sending failed'
    }
    
    const responseTime = Date.now() - startTime
    console.log(`✅ [${requestId}] Free ticket created in ${responseTime}ms`, {
      userId: user._id,
      email: user.email,
      ticketId: ticket.ticketId,
      emailSent,
      ticketTypeId: finalTicketTypeId,
      ticketTypeSource: ticketTypeId ? 'provided' : 'auto-created'
    })
    
    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.ticketId,
        eventId,
        ticketTypeId: finalTicketTypeId,
        quantity,
        price: 0,
        currency: 'USDC',
        status: 'active',
        qrCode: qrCodeData,
        qrCodeImageUrl: qrCodeImageUrl
      },
      user: {
        email: user.email,
        name: user.firstName || user.username,
        emailSent,
        emailError: emailError || undefined
      },
      event: {
        title: event.title,
        date: formatEventDate(event.startDate),
        venue: event.venue
      },
      qrCode: qrCodeData,
      qrCodeImageUrl: qrCodeImageUrl,
      message: emailSent 
        ? `Free ticket with QR code sent to ${user.email}! Check your inbox.`
        : `Free ticket created! Ticket ID: ${ticket.ticketId}`,
      requestId,
      responseTime,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    const responseTime = Date.now() - startTime
    console.error(`🔥 [${requestId}] Error:`, {
      error: error.message,
      stack: error.stack,
      responseTime
    })
    
    let errorMessage = 'Failed to process free ticket request'
    let errorCode = 'PROCESSING_ERROR'
    
    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      errorMessage = 'Database error occurred'
      errorCode = 'DATABASE_ERROR'
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        requestId,
        responseTime
      },
      { status: 500 }
    )
  }
}

// Helper function to generate QR code URL using a free QR code API
function generateQRCodeUrl(data: string): string {
  // Encode the data for URL
  const encodedData = encodeURIComponent(data)
  
  // Using QRCode Monkey API (free, no API key required)
  // You can also use Google Charts API or other QR code services
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}&margin=10`
  
  // Alternative: Google Charts API
  // return `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodedData}&choe=UTF-8`
}

// Helper function to format event date
function formatEventDate(dateString: string | Date): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Helper function to format event time
function formatEventTime(dateString: string | Date): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

// Email sending function with QR code
async function sendTicketEmail({
  to,
  ticketId,
  eventName,
  eventDate,
  eventTime,
  venue,
  quantity,
  userName,
  ticketType,
  qrCodeImageUrl,
  qrCodeData,
  ticketDetails
}: {
  to: string
  ticketId: string
  eventName: string
  eventDate: string
  eventTime: string
  venue: string
  quantity: number
  userName: string
  ticketType: string
  qrCodeImageUrl: string
  qrCodeData: string
  ticketDetails: {
    eventId: string
    ticketId: string
    purchaseDate: string
    status: string
  }
}) {
  // Use your email service
  if (process.env.NODE_ENV === 'test') {
    console.log(`📧 [TEST] Would send email to ${to} for ticket ${ticketId}`)
    return
  }
  
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY not configured. Skipping email send.')
    return
  }
  
  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CACK-pass <tickets@cackpass.com>',
        to: [to],
        subject: `🎫 Your Ticket for ${eventName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your CACK-pass Ticket</title>
            <style>
              /* Reset and base styles */
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f9fafb;
                padding: 20px;
              }
              
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              }
              
              /* Header */
              .header {
                background: linear-gradient(135deg, #4f46e5, #7c3aed);
                color: white;
                padding: 30px 20px;
                text-align: center;
                border-bottom: 4px solid #3730a3;
              }
              
              .header h1 {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 8px;
              }
              
              .header p {
                opacity: 0.9;
                font-size: 16px;
              }
              
              /* Content */
              .content {
                padding: 40px;
              }
              
              .greeting {
                font-size: 18px;
                margin-bottom: 30px;
                color: #4b5563;
              }
              
              .greeting strong {
                color: #111827;
              }
              
              /* Ticket Card */
              .ticket-card {
                background: linear-gradient(135deg, #f8fafc, #f1f5f9);
                border-radius: 12px;
                padding: 25px;
                margin-bottom: 30px;
                border: 1px solid #e2e8f0;
              }
              
              .ticket-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px dashed #cbd5e1;
              }
              
              .ticket-id {
                font-size: 20px;
                font-weight: 700;
                color: #4f46e5;
              }
              
              .ticket-status {
                background: #10b981;
                color: white;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
              }
              
              /* QR Code Section */
              .qr-section {
                text-align: center;
                margin: 30px 0;
                padding: 25px;
                background: white;
                border-radius: 10px;
                border: 1px solid #e5e7eb;
              }
              
              .qr-title {
                font-size: 18px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 15px;
              }
              
              .qr-code {
                max-width: 200px;
                margin: 0 auto 15px;
              }
              
              .qr-code img {
                width: 100%;
                height: auto;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 10px;
                background: white;
              }
              
              .qr-data {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                color: #6b7280;
                word-break: break-all;
                background: #f9fafb;
                padding: 10px;
                border-radius: 6px;
                margin-top: 10px;
              }
              
              /* Details Grid */
              .details-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin-bottom: 30px;
              }
              
              .detail-item {
                background: white;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
              }
              
              .detail-label {
                font-size: 12px;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 5px;
              }
              
              .detail-value {
                font-size: 16px;
                font-weight: 600;
                color: #1f2937;
              }
              
              /* Instructions */
              .instructions {
                background: #f0f9ff;
                border-radius: 10px;
                padding: 25px;
                margin-top: 30px;
                border-left: 4px solid #0ea5e9;
              }
              
              .instructions h3 {
                color: #0369a1;
                margin-bottom: 15px;
                font-size: 18px;
              }
              
              .instructions ol {
                margin-left: 20px;
                color: #475569;
              }
              
              .instructions li {
                margin-bottom: 10px;
              }
              
              /* Footer */
              .footer {
                text-align: center;
                padding: 25px;
                color: #6b7280;
                font-size: 14px;
                border-top: 1px solid #e5e7eb;
                background: #f9fafb;
              }
              
              .footer a {
                color: #4f46e5;
                text-decoration: none;
              }
              
              .footer a:hover {
                text-decoration: underline;
              }
              
              .support {
                margin-top: 15px;
                font-size: 13px;
              }
              
              /* Responsive */
              @media (max-width: 480px) {
                .content {
                  padding: 20px;
                }
                
                .details-grid {
                  grid-template-columns: 1fr;
                }
                
                .ticket-header {
                  flex-direction: column;
                  gap: 10px;
                  text-align: center;
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <!-- Header -->
              <div class="header">
                <h1>🎫 Your Digital Ticket</h1>
                <p>CACK-pass - Digital Event Tickets</p>
              </div>
              
              <!-- Content -->
              <div class="content">
                <!-- Greeting -->
                <div class="greeting">
                  Hello <strong>${userName}</strong>,<br>
                  Your ticket for <strong>${eventName}</strong> has been confirmed!
                </div>
                
                <!-- Ticket Card -->
                <div class="ticket-card">
                  <div class="ticket-header">
                    <div class="ticket-id">Ticket ID: ${ticketId}</div>
                    <div class="ticket-status">CONFIRMED</div>
                  </div>
                  
                  <!-- QR Code Section -->
                  <div class="qr-section">
                    <div class="qr-title">Scan QR Code at Entrance</div>
                    <div class="qr-code">
                      <img src="${qrCodeImageUrl}" alt="QR Code for Ticket ${ticketId}" />
                    </div>
                    <div class="qr-data">${qrCodeData}</div>
                    <p style="font-size: 13px; color: #6b7280; margin-top: 10px;">
                      Show this QR code at the event entrance for scanning
                    </p>
                  </div>
                  
                  <!-- Event Details Grid -->
                  <div class="details-grid">
                    <div class="detail-item">
                      <div class="detail-label">Event</div>
                      <div class="detail-value">${eventName}</div>
                    </div>
                    
                    <div class="detail-item">
                      <div class="detail-label">Date & Time</div>
                      <div class="detail-value">${eventDate}<br>${eventTime}</div>
                    </div>
                    
                    <div class="detail-item">
                      <div class="detail-label">Venue</div>
                      <div class="detail-value">${venue}</div>
                    </div>
                    
                    <div class="detail-item">
                      <div class="detail-label">Ticket Type</div>
                      <div class="detail-value">${ticketType}</div>
                    </div>
                    
                    <div class="detail-item">
                      <div class="detail-label">Quantity</div>
                      <div class="detail-value">${quantity} Ticket${quantity > 1 ? 's' : ''}</div>
                    </div>
                    
                    <div class="detail-item">
                      <div class="detail-label">Purchase Date</div>
                      <div class="detail-value">${ticketDetails.purchaseDate}</div>
                    </div>
                  </div>
                </div>
                
                <!-- Instructions -->
                <div class="instructions">
                  <h3>📋 Next Steps</h3>
                  <ol>
                    <li><strong>Save this email</strong> - Keep it handy for event day</li>
                    <li><strong>Bring your QR code</strong> - Show it on your phone or print it</li>
                    <li><strong>Arrive early</strong> - Please arrive 30 minutes before the event starts</li>
                    <li><strong>Have ID ready</strong> - Bring valid photo identification</li>
                    <li><strong>Check event updates</strong> - Watch for emails from the organizer</li>
                  </ol>
                </div>
              </div>
              
              <!-- Footer -->
              <div class="footer">
                <p>
                  This is your official ticket for <strong>${eventName}</strong>.<br>
                  Do not share this QR code with others.
                </p>
                
                <div class="support">
                  Need help? Contact our support team at 
                  <a href="mailto:support@cackpass.com">support@cackpass.com</a>
                </div>
                
                <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
                  CACK-pass Digital Tickets • Secure Blockchain Verification
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
        // Optional: Add text version for email clients that don't support HTML
        text: `
          YOUR TICKET CONFIRMATION - ${eventName}
          
          Hello ${userName},
          
          Your ticket for "${eventName}" has been confirmed!
          
          TICKET DETAILS:
          - Ticket ID: ${ticketId}
          - Event: ${eventName}
          - Date: ${eventDate}
          - Time: ${eventTime}
          - Venue: ${venue}
          - Ticket Type: ${ticketType}
          - Quantity: ${quantity} Ticket${quantity > 1 ? 's' : ''}
          - Status: CONFIRMED
          
          QR CODE DATA: ${qrCodeData}
          
          IMPORTANT INSTRUCTIONS:
          1. Save this email for event day
          2. Show the QR code on your phone at the entrance
          3. Arrive 30 minutes before the event starts
          4. Bring valid photo identification
          5. Check for updates from the organizer
          
          Need help? Contact: support@cackpass.com
          
          CACK-pass Digital Tickets
          Secure Blockchain Verification
        `
      }),
    })
    
    if (!resendResponse.ok) {
      const error = await resendResponse.json()
      throw new Error(`Resend error: ${error.message}`)
    }
    
    console.log(`✅ Email with QR code sent via Resend to ${to}`)
    
  } catch (error) {
    console.error('❌ Resend email error:', error)
    throw error
  }
}

// Initialize rate limit cleanup if not already running
if (typeof global !== 'undefined' && !global.rateLimitCleanup) {
  global.rateLimitCleanup = setInterval(() => {
    const now = Date.now()
    for (const [userId, limit] of rateLimitStore.entries()) {
      if (now > limit.resetTime + 86400000) { // 24 hours after reset
        rateLimitStore.delete(userId)
      }
    }
  }, 300000) // Run every 5 minutes
}