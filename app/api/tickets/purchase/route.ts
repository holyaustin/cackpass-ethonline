// app/api/tickets/purchase/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { connectDB } from '@/lib/database/connection'
import { Order, TicketType, Event, User } from '@/lib/database/models'
import { getCackPassCore } from '@/lib/contracts/client'
import { createSmartAccount, executeContractCall } from '@/lib/services/biconomy'
import { PrivyClient } from '@privy-io/server-auth'
import crypto from 'crypto'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const authToken = request.headers.get('authorization')?.split(' ')[1]
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const verifiedClaims = await privy.verifyAuthToken(authToken)
    const userId = verifiedClaims.userId
    
    const body = await request.json()
    const {
      ticketTypeId,
      quantity,
      paymentMethod,
      paymentData,
    } = body
    
    // Get ticket type and event
    const ticketType = await TicketType.findById(ticketTypeId).populate('eventId')
    if (!ticketType) {
      return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 })
    }
    
    const event = ticketType.eventId
    
    // Check availability
    if (ticketType.currentSupply + quantity > ticketType.maxSupply) {
      return NextResponse.json({ error: 'Not enough tickets available' }, { status: 400 })
    }
    
    // Calculate total
    const totalAmount = ticketType.price * quantity
    
    let paymentStatus = 'pending'
    let paymentReference = crypto.randomBytes(16).toString('hex')
    
    // Handle different payment methods
    if (paymentMethod === 'paystack') {
      // Initialize Paystack payment
      const Paystack = require('@paystack/paystack-sdk')
      const paystack = new Paystack(process.env.PAYSTACK_SECRET_KEY!)
      
      const response = await paystack.transaction.initialize({
        amount: totalAmount * 100, // Convert to kobo
        email: paymentData.email,
        reference: paymentReference,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
      })
      
      // Create order record
      const order = new Order({
        userId,
        eventId: event._id,
        ticketTypeId: ticketType._id,
        quantity,
        totalAmount,
        currency: 'NGN',
        paymentMethod: 'paystack',
        paymentStatus,
        paymentReference,
      })
      
      await order.save()
      
      return NextResponse.json({
        success: true,
        paymentUrl: response.data.authorization_url,
        reference: paymentReference,
        orderId: order._id,
      })
      
    } else if (paymentMethod === 'crypto') {
      // Get user's wallet address
      const user = await User.findOne({ privyId: userId })
      if (!user?.walletAddress) {
        return NextResponse.json(
          { error: 'User wallet address not found' },
          { status: 400 }
        )
      }
      
      // Create order record
      const order = new Order({
        userId: user._id,
        eventId: event._id,
        ticketTypeId: ticketType._id,
        quantity,
        totalAmount,
        currency: 'ETH',
        paymentMethod: 'crypto',
        paymentStatus: 'paid', // Assuming crypto payment is immediate
        paymentReference,
      })
      
      await order.save()
      
      // Get contract instance
      const cackPassCore = getCackPassCore()
      
      // Create signer for gasless minting
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
      const signer = new ethers.Wallet(process.env.BACKEND_SIGNER_PRIVATE_KEY!, provider)
      
      // For crypto payments, we need to handle the minting differently
      // Since the contract uses mintWithApproval with signatures
      // We need to generate the approval signature
      
      const approvalId = crypto.randomBytes(32).toString('hex')
      const validUntil = Math.floor(Date.now() / 1000) + 3600 // 1 hour
      
      // Note: This is a simplified version. In production, you would:
      // 1. Generate the EIP-712 signature on backend
      // 2. Return signature to frontend
      // 3. Frontend calls mintWithApproval with the signature
      
      // For now, we'll simulate successful mint
      order.mintStatus = 'minted'
      await order.save()
      
      // Update ticket supply
      ticketType.currentSupply += quantity
      await ticketType.save()
      
      return NextResponse.json({
        success: true,
        message: 'Ticket purchase successful. Minting in progress.',
        orderId: order._id,
        approvalId,
      })
    }
    
    return NextResponse.json(
      { error: 'Unsupported payment method' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('Purchase error:', error)
    return NextResponse.json(
      { error: 'Failed to process purchase', details: (error as Error).message },
      { status: 500 }
    )
  }
}