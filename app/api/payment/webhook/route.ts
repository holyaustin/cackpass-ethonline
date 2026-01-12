// app/api/payment/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { connectDB } from '@/lib/database/connection'
import { Order, TicketType, Event } from '@/lib/database/models'
import { cackPassCore } from '@/lib/contracts/client'
import { getSmartAccount } from '@/lib/services/biconomy'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-paystack-signature')
    
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
      
      // Mint tickets
      const ticketType = await TicketType.findById(order.ticketTypeId)
      const eventData = await Event.findById(order.eventId)
      
      if (!ticketType || !eventData) {
        return NextResponse.json({ error: 'Ticket data not found' }, { status: 404 })
      }
      
      // Gasless minting via Biconomy
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
      const signer = new ethers.Wallet(process.env.BACKEND_SIGNER_PRIVATE_KEY!, provider)
      const smartAccount = await getSmartAccount(signer)
      
      // Generate mint approval
      const approvalId = crypto.randomBytes(32).toString('hex')
      const validUntil = Math.floor(Date.now() / 1000) + 3600
      
      const mintApproval = {
        recipient: order.userId, // Should get wallet from user
        eventId: eventData.onChainId,
        ticketCategory: ticketType.onChainCategoryId,
        amount: order.quantity,
        price: ethers.parseEther(ticketType.price.toString()),
        validUntil,
        id: approvalId,
      }
      
      // Sign and execute mint
      // Implementation depends on your exact contract interface
      
      order.mintStatus = 'minted'
      await order.save()
      
      // Send confirmation email/SMS
      await sendConfirmation(order)
    }
    
    return NextResponse.json({ received: true })
    
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function sendConfirmation(order: any) {
  // Implement email/SMS sending
}