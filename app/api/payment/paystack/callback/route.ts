import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { Payment, Order } from '@/lib/database/models'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const reference = searchParams.get('reference')
    const status = searchParams.get('status')

    if (!reference) {
      return NextResponse.json(
        { success: false, error: 'Missing payment reference' },
        { status: 400 }
      )
    }

    await connectDB()

    // Find payment by reference
    const payment = await Payment.findOne({ paymentReference: reference })
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Update payment status
    if (status === 'success') {
      payment.paymentStatus = 'completed'
    } else {
      payment.paymentStatus = 'failed'
    }
    
    payment.updatedAt = new Date()
    await payment.save()

    // Update order status
    const order = await Order.findOne({ paymentReference: reference })
    if (order) {
      order.paymentStatus = payment.paymentStatus
      order.updatedAt = new Date()
      await order.save()
    }

    // Redirect to success/failure page
    const redirectUrl = status === 'success' 
      ? `/payment/success?reference=${reference}`
      : `/payment/failed?reference=${reference}`

    return NextResponse.redirect(new URL(redirectUrl, request.url))

  } catch (error: any) {
    console.error('Paystack callback error:', error)
    return NextResponse.json(
      { success: false, error: 'Callback processing failed' },
      { status: 500 }
    )
  }
}