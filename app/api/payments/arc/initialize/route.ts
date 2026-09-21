import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { Payment, Order, Event, User, TicketType, DiscountCode } from '@/lib/database/models'
import mongoose from 'mongoose'
import { generatePaymentId } from '@/lib/arc/client'

const NGN_PER_USDC = Number(process.env.NEXT_PUBLIC_NGN_PER_USDC) || 1350
const PROCESSING_MARKUP_USDC = Number(process.env.NEXT_PUBLIC_PROCESSING_MARKUP_USDC) || 0.04

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📝 Arc Initialize Request:', body)

    const {
      eventId,
      ticketTypeId,
      quantity,
      amount,            // USDC (before markup)
      originalAmount,    // NGN
      email,
      userName,
      discountCode,
      discountPercent,
      discountAmount,
      isGuest,
    } = body

    // Validation
    if (!eventId || !ticketTypeId || !quantity || !amount || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    await connectDB()

    // Find or create user
    let user = await User.findOne({ email })
    if (!user) {
      user = await User.create({
        email,
        loginMethod: 'email',
        privyId: `guest-${Date.now()}`,
        isOrganizer: false,
        isProfileComplete: true,
      })
    }

    // Fetch event
    const event = await Event.findById(eventId).lean()
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Resolve ticket type
    let realTicketTypeId: mongoose.Types.ObjectId | null = null
    let ticketType: any = null
    let isVirtual = false
    const isVirtualTicket = ticketTypeId.toString().startsWith('virtual_')

    if (!isVirtualTicket && mongoose.Types.ObjectId.isValid(ticketTypeId)) {
      realTicketTypeId = new mongoose.Types.ObjectId(ticketTypeId)
      ticketType = await TicketType.findById(realTicketTypeId)
      if (!ticketType) {
        return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 })
      }
    } else {
      isVirtual = true
      realTicketTypeId = event._id as mongoose.Types.ObjectId
    }

    // Compute final amount
    let baseAmount = amount
    let discountInfo: any = null
    if (discountCode) {
      const discount = await DiscountCode.findOne({
        code: discountCode.toUpperCase(),
        eventId,
        isActive: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      })
      if (discount && discount.maxUses - discount.usedCount >= quantity) {
        const pct = discountPercent || discount.discountPercent
        const amt = (amount * pct) / 100
        baseAmount = amount - amt
        discountInfo = { code: discount.code, percent: pct, amount: amt }
      }
    }

    // Add processing markup (user pays this to fund backend gas)
    const totalWithMarkup = +(baseAmount + PROCESSING_MARKUP_USDC).toFixed(6)

    // Generate IDs
    const paymentId = generatePaymentId()
    const shortRef = paymentId.replace('0x', '').slice(0, 16)
    const fullReference = `CACK-${shortRef}`
    const batchId = null // set when anchored

    // Create Order + Payment in MongoDB (no on-chain write yet)
    const order = await Order.create({
      userId: user._id,
      eventId,
      ticketTypeId: realTicketTypeId,
      quantity,
      totalAmount: totalWithMarkup,
      originalAmount: originalAmount || amount,
      paymentMethod: 'arc_usdc',
      paymentStatus: 'pending',
      paymentReference: fullReference,
      customerEmail: email,
      customerName: userName || email.split('@')[0],
      metadata: {
        isVirtual,
        ticketName: ticketType?.name || 'General Admission',
        eventTitle: event.title,
        paymentId,             // bytes32 — needed by verify
        baseAmount,            // USDC amount for ticket
        processingMarkup: PROCESSING_MARKUP_USDC,
        discountCode: discountInfo?.code || null,
        discountPercent: discountInfo?.percent || null,
        discountAmount: discountInfo?.amount || null,
        isGuest: isGuest || false,
      },
    })

    await Payment.create({
      paymentMethod: 'arc_usdc',
      userId: user._id,
      eventId,
      amount: totalWithMarkup,
      originalAmount: originalAmount || amount,
      quantity,
      ticketTypeId: realTicketTypeId,
      paymentStatus: 'pending',
      paymentReference: fullReference,
      customerEmail: email,
      metadata: {
        orderId: order._id,
        paymentId,             // bytes32
        userName: userName || email.split('@')[0],
        userEmail: email,
        email,
        isVirtual,
        ticketName: ticketType?.name || 'General Admission',
        eventTitle: event.title,
        eventVenue: event.venue || 'Online Event',
        eventStartDate: event.startDate,
        eventEndDate: event.endDate,
        discountCode: discountInfo?.code || null,
        discountPercent: discountInfo?.percent || null,
        discountAmount: discountInfo?.amount || null,
        isGuest: isGuest || false,
        baseAmount,
        processingMarkup: PROCESSING_MARKUP_USDC,
        // on-chain write happens in verify
        registryPaymentId: null,
        registryTxHash: null,
        paymentTxHash: null,   // set after the USDC transfer
        anchorBatchId: null,
        merkleProof: [],
      },
    })

    return NextResponse.json({
      success: true,
      paymentId,
      reference: fullReference,
      amountUSDC: totalWithMarkup,
      baseAmountUSDC: baseAmount,
      processingMarkupUSDC: PROCESSING_MARKUP_USDC,
      treasuryAddress: process.env.NEXT_PUBLIC_TREASURY_WALLET,
      message: 'Send USDC to treasury to complete purchase.',
    })
  } catch (error: any) {
    console.error('Arc initialize error:', error)
    return NextResponse.json(
      { error: 'Payment initialization failed', details: error.message },
      { status: 500 }
    )
  }
}