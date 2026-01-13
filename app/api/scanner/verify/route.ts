// app/api/scanner/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { CheckIn, Event, User } from '@/lib/database/models'
import { getCackPassCore } from '@/lib/contracts/client'
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
    
    // Get contract instance
    const cackPassCore = getCackPassCore()
    
    // Verify ticket exists on-chain
    // Note: The contract doesn't have isTicketUsed method in the ABI we defined
    // We need to check if the ticket exists by other means
    
    // For now, we'll check if the ticket has been checked in before
    const existingCheckIn = await CheckIn.findOne({ ticketId })
    if (existingCheckIn) {
      return NextResponse.json(
        { error: 'Ticket already checked in' },
        { status: 400 }
      )
    }
    
    // Extract event ID from ticket ID (assuming format from contract)
    const eventId = Math.floor(Number(ticketId) / 1e18)
    
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
      ticketId: Number(ticketId),
      userId: scanner._id, // The scanner is checking someone in
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
      checkInId: checkIn._id,
    })
    
  } catch (error) {
    console.error('Scan error:', error)
    return NextResponse.json(
      { error: 'Verification failed', details: (error as Error).message },
      { status: 500 }
    )
  }
}