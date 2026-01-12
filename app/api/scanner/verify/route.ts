// app/api/scanner/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { CheckIn, Order, Event, User } from '@/lib/database/models'
import { cackPassCore } from '@/lib/contracts/client'
import { PrivyClient } from '@privy-io/server-auth'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export async function POST(request: NextRequest) {
  try {
    const authToken = request.headers.get('authorization')?.split(' ')[1]
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verifiedClaims = await privy.verifyAuthToken(authToken)
    const scannerId = verifiedClaims.userId
    
    await connectDB()
    
    const scanner = await User.findOne({ privyId: scannerId })
    if (!scanner || !scanner.organizer) {
      return NextResponse.json(
        { error: 'Not authorized to scan' },
        { status: 403 }
      )
    }
    
    const { ticketId, location } = await request.json()
    
    // Verify ticket exists on-chain
    const eventId = Math.floor(ticketId / 1e18)
    const category = ticketId % 1e18
    
    const isUsed = await cackPassCore.isTicketUsed(ticketId)
    if (isUsed) {
      return NextResponse.json(
        { error: 'Ticket already used' },
        { status: 400 }
      )
    }
    
    // Check if ticket is valid for event
    const event = await Event.findOne({ onChainId: eventId })
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }
    
    // Record check-in
    const checkIn = new CheckIn({
      eventId: event._id,
      ticketId,
      scannerId: scanner._id,
      location,
      isVerified: true,
    })
    
    await checkIn.save()
    
    return NextResponse.json({
      success: true,
      message: 'Ticket verified successfully',
      ticketId,
      event: event.title,
      checkedInAt: new Date(),
    })
    
  } catch (error) {
    console.error('Scan error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}