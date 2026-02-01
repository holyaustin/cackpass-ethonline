import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { User, Event, Order, Payment } from '@/lib/database/models'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const body = await request.json()
    const { 
      method, 
      walletAddress, 
      amount, 
      currency, 
      eventId,
      quantity,
      approvalId,
      signature 
    } = body

    if (!walletAddress || !eventId || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    await connectDB()

    // Get user
    const user = await User.findOne({ walletAddress }).session(session)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Get event
    const event = await Event.findById(eventId).session(session)
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Generate payment reference
    const paymentReference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase()

    // Create payment record
    const payment = new Payment({
      userId: user._id,
      eventId: event._id,
      amount: amount,
      currency: currency || 'USD',
      paymentMethod: method,
      paymentStatus: method === 'wallet' ? 'completed' : 'pending',
      paymentReference: paymentReference,
      approvalId: approvalId,
      metadata: {
        quantity,
        eventTitle: event.title,
        userEmail: user.email,
        walletAddress
      },
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await payment.save({ session })

    // Create order record
    const order = new Order({
      userId: user._id,
      eventId: event._id,
      quantity: quantity,
      totalAmount: amount,
      currency: currency || 'USD',
      paymentMethod: method,
      paymentStatus: method === 'wallet' ? 'completed' : 'pending',
      paymentReference: paymentReference,
      mintStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await order.save({ session })

    await session.commitTransaction()

    return NextResponse.json({
      success: true,
      paymentId: payment._id.toString(),
      orderId: order._id.toString(),
      paymentReference,
      message: 'Payment processed successfully'
    })

  } catch (error: any) {
    await session.abortTransaction()
    console.error('Payment processing error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Payment processing failed',
        details: error.message 
      },
      { status: 500 }
    )
  } finally {
    session.endSession()
  }
}