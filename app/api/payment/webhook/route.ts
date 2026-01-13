// app/api/payment/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import crypto from 'crypto'
import { connectDB } from '@/lib/database/connection'
import { Order, TicketType, Event, User } from '@/lib/database/models'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-paystack-signature')
    
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }
    
    // Verify Paystack webhook signature
    const expectedSignature = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest('hex')
    
    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
    
    const event = JSON.parse(body)
    
    if (event.event === 'charge.success') {
      const { reference, amount, customer } = event.data
      
      await connectDB()
      
      // Find order
      const order = await Order.findOne({ paymentReference: reference })
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }
      
      // Update order status
      order.paymentStatus = 'paid'
      order.paymentData = event.data
      await order.save()
      
      // Get user to find wallet address
      const user = await User.findById(order.userId)
      
      if (!user?.walletAddress) {
        // User doesn't have wallet, we need to handle this
        console.warn(`User ${user?._id} doesn't have wallet address for minting`)
        
        // Send email/SMS notification that ticket will be minted when wallet is connected
        await sendConfirmation(order, user)
        
        return NextResponse.json({ 
          received: true,
          message: 'Payment successful. User needs to connect wallet for minting.'
        })
      }
      
      // Get ticket type and event
      const ticketType = await TicketType.findById(order.ticketTypeId)
      const eventData = await Event.findById(order.eventId)
      
      if (!ticketType || !eventData) {
        return NextResponse.json({ error: 'Ticket data not found' }, { status: 404 })
      }
      
      // Update ticket supply
      ticketType.currentSupply += order.quantity
      await ticketType.save()
      
      // Mark as minted (for now, we'll handle actual minting separately)
      order.mintStatus = 'pending_mint' // Special status for pending blockchain mint
      await order.save()
      
      // Send confirmation
      await sendConfirmation(order, user)
      
      // Note: Actual blockchain minting would be handled by a separate service/queue
      // that processes pending_mint orders and calls the contract
    }
    
    return NextResponse.json({ received: true })
    
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', details: (error as Error).message },
      { status: 500 }
    )
  }
}

async function sendConfirmation(order: any, user: any) {
  // Implement email/SMS sending
  console.log(`Sending confirmation to ${user?.email} for order ${order._id}`)
  // Use your preferred email service (SendGrid, AWS SES, etc.)
  // or SMS service (Twilio, etc.)
}