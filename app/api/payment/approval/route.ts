// /app/api/payment/approval/route.ts - UPDATED WITH FREE EVENT HANDLING
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { CackPassCoreABI } from '@/lib/contracts/abis/CackPassCore'
import { connectDB } from '@/lib/database/connection'
import { User, Event, TicketType } from '@/lib/database/models'

// Helper function to serialize BigInt values
function serializeBigInt(obj: any): any {
  if (typeof obj === 'bigint') {
    return obj.toString()
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt)
  }
  if (obj !== null && typeof obj === 'object') {
    const newObj: any = {}
    for (const key in obj) {
      newObj[key] = serializeBigInt(obj[key])
    }
    return newObj
  }
  return obj
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, eventId, amount, price = 0, method } = body

    if (!walletAddress || !eventId || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    await connectDB()

    // Get event details
    const event = await Event.findById(eventId)
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Get user
    const user = await User.findOne({ walletAddress })
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Generate unique approval ID
    const approvalId = ethers.id(`${walletAddress}-${eventId}-${Date.now()}-${Math.random()}`)
    
    // In production, this would be signed by the backend private key
    // For now, we'll create a dummy signature
    const validUntil = Math.floor(Date.now() / 1000) + 3600 // Valid for 1 hour
    
    // Handle free events - price might be 0
    const priceValue = price || 0
    const priceInWei = ethers.parseEther(priceValue.toString())
    
    // Create signature data (matching contract's MintApproval struct)
    const signatureData = {
      recipient: walletAddress,
      eventId: event.onChainId || 1, // Use on-chain event ID if available
      ticketCategory: 0, // GeneralAdmission by default
      amount: Number(amount),
      price: priceInWei,
      validUntil: validUntil,
      id: approvalId
    }

    // In production, sign with backend private key
    const signature = '0x' + '00'.repeat(65) // Dummy signature for now

    // Store approval in database
    // This would be stored in a PaymentApproval collection in production

    return NextResponse.json(serializeBigInt({
      success: true,
      approvalId,
      signature,
      signatureData,
      validUntil,
      message: 'Payment approval generated'
    }))

  } catch (error: any) {
    console.error('Approval generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate approval: ' + error.message },
      { status: 500 }
    )
  }
}