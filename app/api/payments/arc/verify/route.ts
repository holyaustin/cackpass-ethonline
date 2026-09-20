// app/api/payments/arc/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import {
  Payment,
  Order,
  MyTicket,
  Event,
  User,
  TicketType,
} from '@/lib/database/models'
import {
  recordPaymentOnChain,
  confirmPaymentOnChain,
  computeOrderHash,
  paymentIdToBytes32,
  eventIdToBytes32,
} from '@/lib/arc/client'
import { ethers } from 'ethers'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ─────────────────────────────────────────────────────────────
// Arc USDC ERC-20 wrapper
// ─────────────────────────────────────────────────────────────
const ARC_USDC_ADDRESS = '0x3600000000000000000000000000000000000000'

// keccak256("Transfer(address,address,uint256)")
const ERC20_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

// ─────────────────────────────────────────────────────────────
// Provider with retry / fallback
// ─────────────────────────────────────────────────────────────
async function getArcProvider(): Promise<ethers.JsonRpcProvider> {
  const rpcUrls = [
    process.env.NEXT_PUBLIC_ARC_RPC_URL,
    'https://rpc.testnet.arc.network',
    'https://arc-testnet.drpc.org',
  ].filter(Boolean) as string[]

  for (const url of rpcUrls) {
    try {
      const provider = new ethers.JsonRpcProvider(url)
      await Promise.race([
        provider.getBlockNumber(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000)
        ),
      ])
      console.log(`✅ Connected to Arc RPC: ${url}`)
      return provider
    } catch (err: any) {
      console.warn(`⚠️ RPC failed: ${url} — ${err.message}`)
    }
  }
  throw new Error('All Arc RPC endpoints unreachable')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')
    const usdcTxHash = searchParams.get('transaction_id')

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
    }

    await connectDB()

    // ─────────────────────────────────────────────────
    // 1. Load the MongoDB Payment
    // ─────────────────────────────────────────────────
    const payment = await Payment.findOne({ paymentReference: reference })
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.paymentStatus === 'completed') {
      const tickets = await MyTicket.find({ orderId: payment.metadata?.orderId })
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        tickets: tickets.map((t: any) => ({
          ticketId: t.ticketNumber,
          ticketNumber: t.ticketNumber,
        })),
        amount: payment.amount,
        currency: 'USDC',
        userEmail: payment.customerEmail,
        emailSent: payment.metadata?.emailSent === true,
        reference,
      })
    }

    if (!usdcTxHash) {
      return NextResponse.json({ error: 'Missing transaction_id' }, { status: 400 })
    }

    // ─────────────────────────────────────────────────
    // 2. Fetch tx + receipt
    // ─────────────────────────────────────────────────
    const provider = await getArcProvider()

    const tx = await provider.getTransaction(usdcTxHash)
    if (!tx) {
      return NextResponse.json(
        { error: 'USDC transaction not found' },
        { status: 404 }
      )
    }

    const receipt = await provider.getTransactionReceipt(usdcTxHash)
    if (!receipt || receipt.status !== 1) {
      return NextResponse.json(
        { error: 'USDC transaction failed on-chain' },
        { status: 400 }
      )
    }

    const treasury = process.env.NEXT_PUBLIC_TREASURY_WALLET?.toLowerCase()
    if (!treasury) {
      return NextResponse.json(
        { error: 'Treasury wallet not configured' },
        { status: 500 }
      )
    }

    // ─────────────────────────────────────────────────
    // 3. Detect the USDC transfer shape
    //    (A) native:  tx.to === treasury, tx.value > 0
    //    (B) erc20:   tx.to === USDC contract, Transfer log credits treasury
    // ─────────────────────────────────────────────────
    const toAddr = tx.to?.toLowerCase()
    let receivedAmountWei: bigint | null = null
    let transferType: 'native' | 'erc20' | 'unknown' = 'unknown'

    // Shape A — native
    if (toAddr === treasury && tx.value > 0n) {
      receivedAmountWei = tx.value
      transferType = 'native'
    }

    // Shape B — ERC-20 wrapper
    if (receivedAmountWei === null && toAddr === ARC_USDC_ADDRESS.toLowerCase()) {
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== ARC_USDC_ADDRESS.toLowerCase()) continue
        if (log.topics[0] !== ERC20_TRANSFER_TOPIC) continue

        const toPadded = log.topics[2]
        const toAddress = ethers
          .getAddress('0x' + toPadded.slice(26))
          .toLowerCase()

        if (toAddress === treasury) {
          receivedAmountWei = BigInt(log.data)
          transferType = 'erc20'
          break
        }
      }
    }

    console.log('🔍 USDC tx verification:', {
      hash: usdcTxHash,
      from: tx.from,
      to: tx.to,
      value: tx.value.toString(),
      valueFormatted: ethers.formatUnits(tx.value, 18),
      treasuryExpected: treasury,
      detectedTransferType: transferType,
      receivedWei: receivedAmountWei?.toString() ?? 'null',
      logCount: receipt.logs.length,
    })

    if (receivedAmountWei === null) {
      return NextResponse.json(
        {
          error:
            'No USDC transfer to the treasury found in this transaction.',
          txTo: tx.to,
          treasuryExpected: treasury,
          transferType,
        },
        { status: 400 }
      )
    }

    // ─────────────────────────────────────────────────
    // 4. Amount check — decimals depend on transfer shape
    // ─────────────────────────────────────────────────
    const decimals = transferType === 'native' ? 18 : 6
    const sentAmountStr = ethers.formatUnits(receivedAmountWei, decimals)
    const sentAmount = parseFloat(sentAmountStr)
    const expectedAmount = parseFloat(payment.amount.toString())

    console.log(
      `💰 Amount check: received=${sentAmountStr} (decimals=${decimals}), ` +
      `expected=${payment.amount}`
    )

    if (Math.abs(sentAmount - expectedAmount) > 0.001) {
      return NextResponse.json(
        {
          error: 'Amount mismatch',
          sent: sentAmountStr,
          expected: payment.amount.toString(),
        },
        { status: 400 }
      )
    }

    console.log(
      `✅ USDC verified (${transferType}): ${sentAmountStr} USDC ` +
      `from ${tx.from} to treasury`
    )

    // ─────────────────────────────────────────────────
    // 5. Build orderHash & write to registry
    // ─────────────────────────────────────────────────
    const order = await Order.findById(payment.metadata?.orderId)
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const paymentId: string = payment.metadata?.paymentId
    if (!paymentId) {
      return NextResponse.json(
        { error: 'Missing paymentId in metadata' },
        { status: 400 }
      )
    }

    const eventIdStr: string = payment.eventId.toString()

    const orderHash = computeOrderHash({
      orderId: order._id.toString(),
      payer: tx.from,
      eventId: eventIdStr,
      ticketTypeId: payment.ticketTypeId?.toString() || '',
      quantity: payment.quantity,
      amount: payment.amount.toString(),
      paymentReference: reference,
    })

    const registryResult = await recordPaymentOnChain({
      paymentId: paymentIdToBytes32(paymentId),
      payer: tx.from,
      amount: payment.amount.toString(),
      paymentReference: reference,
      eventId: eventIdToBytes32(eventIdStr),
      ticketQuantity: payment.quantity,
      orderHash,
      paymentTxHash: usdcTxHash,
    })

    if (!registryResult.success) {
      payment.metadata = {
        ...payment.metadata,
        paymentTxHash: usdcTxHash,
        orderHash,
        registryError: registryResult.error,
      }
      await payment.save()

      return NextResponse.json(
        { error: 'Registry write failed', details: registryResult.error },
        { status: 500 }
      )
    }

    // ─────────────────────────────────────────────────
    // 6. Persist on-chain info
    // ─────────────────────────────────────────────────
    payment.metadata = {
      ...payment.metadata,
      paymentTxHash: usdcTxHash,
      orderHash,
      registryTxHash: registryResult.txHash,
      registryPaymentId: paymentId,
      transferType,
    }
    await payment.save()

    await confirmPaymentOnChain(paymentIdToBytes32(paymentId))

    // ─────────────────────────────────────────────────
    // 7. Create tickets in MongoDB
    // ─────────────────────────────────────────────────
    let tickets: any[] = []
    const existingTickets = await MyTicket.find({ orderId: order._id })
    if (existingTickets.length > 0) {
      tickets = existingTickets
    } else {
      for (let i = 0; i < payment.quantity; i++) {
        const t = await MyTicket.create({
          orderId: order._id,
          userId: payment.userId,
          eventId: payment.eventId,
          ticketTypeId: payment.ticketTypeId,
          ticketNumber: `${reference}-${i + 1}`,
          status: 'active',
          customerEmail: payment.customerEmail,
          customerName: payment.metadata?.userName,
          metadata: {
            arcPayment: true,
            registryPaymentId: paymentId,
            paymentTxHash: usdcTxHash,
          },
        })
        tickets.push(t)
      }
    }

    payment.paymentStatus = 'completed'
    await payment.save()

    order.paymentStatus = 'paid'
    await order.save()

    await Event.updateOne(
      { _id: payment.eventId },
      { $inc: { ticketsSold: payment.quantity } }
    )

    // ─────────────────────────────────────────────────
    // 8. Send email — MUST include `email` field
    // ─────────────────────────────────────────────────
    let emailSent = false
    try {
      const customerEmail =
        payment.customerEmail ||
        payment.metadata?.userEmail ||
        payment.metadata?.email

      if (!customerEmail) {
        console.warn('No customer email on payment — skipping email send')
      } else {
        const event = await Event.findById(payment.eventId)
        const ticketType = payment.ticketTypeId
          ? await TicketType.findById(payment.ticketTypeId)
          : null

        const emailRes = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/email/ticket-confirmation`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: customerEmail,
              name:
                payment.metadata?.userName ||
                customerEmail.split('@')[0],
              eventTitle: event?.title || payment.metadata?.eventTitle,
              eventDate: event?.startDate?.toISOString(),
              venue: event?.venue || 'Online Event',
              ticketCount: payment.quantity,
              ticketType:
                ticketType?.name ||
                payment.metadata?.ticketName ||
                'General Admission',
              amount: payment.amount,
              reference,
            }),
          }
        )

        if (!emailRes.ok) {
          const errText = await emailRes.text()
          console.error('Email API error:', emailRes.status, errText)
        } else {
          emailSent = true
          payment.metadata = { ...payment.metadata, emailSent: true }
          await payment.save()
        }
      }
    } catch (e) {
      console.error('Email failed:', e)
    }

    return NextResponse.json({
      success: true,
      tickets: tickets.map((t) => ({
        ticketId: t.ticketNumber,
        ticketNumber: t.ticketNumber,
      })),
      emailSent,
      amount: payment.amount,
      currency: 'USDC',
      userEmail: payment.customerEmail,
      transactionHash: usdcTxHash,
      reference,
      registryTxHash: registryResult.txHash,
    })
  } catch (error: any) {
    console.error('Arc verify error:', error)
    return NextResponse.json(
      { error: error?.message || 'Verification failed' },
      { status: 500 }
    )
  }
}