import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { Payment, User, Event } from '@/lib/database/models'
import mongoose from 'mongoose'

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

// Helper function to generate unique payment reference
function generatePaymentReference(paymentMethod: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 10)
  const prefix = paymentMethod === 'wallet' ? 'WALLET' : paymentMethod === 'paystack' ? 'PAYSTACK' : 'PAY'
  return `${prefix}_${timestamp}_${random}`.toUpperCase()
}

// Helper to find user by wallet address
async function findUserByWalletAddress(walletAddress: string) {
  if (!walletAddress) return null
  
  // Try to find user by wallet address
  const user = await User.findOne({ 
    $or: [
      { walletAddress: walletAddress.toLowerCase() },
      { walletAddress: walletAddress },
      { 'linkedAccounts.address': walletAddress.toLowerCase() },
      { 'linkedAccounts.address': walletAddress }
    ]
  })
  
  return user
}

export async function POST(request: NextRequest) {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const body = await request.json()
    console.log('Payment process request body:', body)
    
    const {
      paymentMethod, // Changed from 'method' to 'paymentMethod'
      approvalId,
      signature,
      walletAddress,
      amount,
      currency = 'USD',
      eventId,
      quantity = 1,
      ticketTypeId,
      signatureData,
      validUntil
    } = body

    // Validate required fields - UPDATED to use paymentMethod
    if (!paymentMethod || !eventId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: paymentMethod and eventId are required' },
        { status: 400 }
      )
    }

    // For wallet payments, require walletAddress
    if ((paymentMethod === 'wallet' || paymentMethod === 'crypto') && !walletAddress) {
      return NextResponse.json(
        { success: false, error: 'walletAddress is required for wallet/crypto payments' },
        { status: 400 }
      )
    }

    // For wallet payments with approval, require approvalId and signature
    if (paymentMethod === 'wallet' && (!approvalId || !signature)) {
      return NextResponse.json(
        { success: false, error: 'approvalId and signature are required for wallet payments' },
        { status: 400 }
      )
    }

    await connectDB()

    // Find or validate event
    let event
    if (mongoose.Types.ObjectId.isValid(eventId)) {
      event = await Event.findById(eventId).session(session)
    } else {
      // Try to find by other means if needed
      event = await Event.findOne({ 
        $or: [
          { _id: eventId },
          { onChainId: parseInt(eventId) }
        ]
      }).session(session)
    }
    
    if (!event) {
      await session.abortTransaction()
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Find user by wallet address
    let user = null
    if (walletAddress) {
      user = await findUserByWalletAddress(walletAddress)
    }

    // Generate payment reference
    const paymentReference = generatePaymentReference(paymentMethod)

    // Create payment record with all required fields
    const paymentData: any = {
      paymentMethod, // Changed from 'method' to 'paymentMethod'
      paymentReference,
      walletAddress: walletAddress || null,
      eventId: event._id,
      amount: Number(amount) || 0,
      currency,
      quantity: Number(quantity) || 1,
      ticketTypeId: ticketTypeId || null,
      paymentStatus: paymentMethod === 'wallet' ? 'pending' : 'processing',
      approvalId: approvalId || null,
      signature: signature || null,
      signatureData: signatureData || null,
      validUntil: validUntil ? new Date(validUntil * 1000) : null, // Convert Unix timestamp to Date
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Add userId if user found
    if (user) {
      paymentData.userId = user._id
    }

    const payment = new Payment(paymentData)
    await payment.save({ session })

    // Generate payment ID (using MongoDB _id)
    const paymentId = payment._id.toString()

    // If it's a wallet payment with approval, we can mark it as completed
    if (paymentMethod === 'wallet' && approvalId && signature) {
      payment.paymentStatus = 'completed'
      await payment.save({ session })
    }

    await session.commitTransaction()

    return NextResponse.json(serializeBigInt({
      success: true,
      paymentId,
      paymentReference,
      message: 'Payment processed successfully',
      payment: {
        id: payment._id,
        status: payment.paymentStatus,
        amount: payment.amount,
        currency: payment.currency,
        reference: payment.paymentReference
      }
    }))

  } catch (error: any) {
    await session.abortTransaction()
    console.error('Payment processing error:', error)
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const errors: any = {}
      for (const field in error.errors) {
        errors[field] = error.errors[field].message
      }
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payment validation failed',
          details: errors
        },
        { status: 400 }
      )
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Duplicate payment reference',
          details: 'Please try again'
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process payment',
        details: error.message 
      },
      { status: 500 }
    )
  } finally {
    session.endSession()
  }
}

// Optional: Add GET endpoint to check payment status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const paymentId = searchParams.get('paymentId')
    const paymentReference = searchParams.get('paymentReference')
    const walletAddress = searchParams.get('walletAddress')
    
    if (!paymentId && !paymentReference && !walletAddress) {
      return NextResponse.json({
        success: false,
        error: 'Provide paymentId, paymentReference, or walletAddress query parameter'
      }, { status: 400 })
    }
    
    await connectDB()
    
    let query = {}
    if (paymentId) {
      query = { _id: paymentId }
    } else if (paymentReference) {
      query = { paymentReference }
    } else if (walletAddress) {
      query = { walletAddress }
    }
    
    const payments = await Payment.find(query)
      .populate('eventId', 'title startDate venue')
      .populate('userId', 'walletAddress email firstName')
      .populate('ticketTypeId', 'name price')
      .sort({ createdAt: -1 })
      .limit(10)
    
    return NextResponse.json({
      success: true,
      payments: payments.map(payment => ({
        _id: payment._id,
        paymentMethod: payment.paymentMethod,
        status: payment.paymentStatus,
        amount: payment.amount,
        currency: payment.currency,
        reference: payment.paymentReference,
        event: payment.eventId,
        user: payment.userId,
        ticketType: payment.ticketTypeId,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
      }))
    })
    
  } catch (error: any) {
    console.error('Get payments error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch payments'
    }, { status: 500 })
  }
}


