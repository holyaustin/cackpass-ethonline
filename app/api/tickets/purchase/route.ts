// app/api/tickets/purchase/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { Order, TicketType, Event } from '@/lib/database/models'
import { cackPassCore } from '@/lib/contracts/client'
import { getSmartAccount } from '@/lib/services/biconomy'
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
      paymentData, // Payment provider specific data
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
      const paystack = new Paystack(process.env.PAYSTACK_SECRET_KEY)
      
      const response = await paystack.transaction.initialize({
        amount: totalAmount * 100, // Convert to kobo
        email: paymentData.email,
        reference: paymentReference,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
      })
      
      return NextResponse.json({
        success: true,
        paymentUrl: response.data.authorization_url,
        reference: paymentReference,
      })
      
    } else if (paymentMethod === 'crypto') {
      // Generate EIP-712 signature for gasless minting
      const approvalId = crypto.randomBytes(32).toString('hex')
      const validUntil = Math.floor(Date.now() / 1000) + 3600 // 1 hour
      
      const mintApproval = {
        recipient: paymentData.walletAddress,
        eventId: event.onChainId,
        ticketCategory: ticketType.onChainCategoryId,
        amount: quantity,
        price: ethers.parseEther(ticketType.price.toString()),
        validUntil,
        id: approvalId,
      }
      
      // Sign with backend signer
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
      const signer = new ethers.Wallet(process.env.BACKEND_SIGNER_PRIVATE_KEY!, provider)
      
      const