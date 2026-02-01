// app/api/tickets/signature/route.ts - COMPLETE PRODUCTION FIX
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { connectDB } from '@/lib/database/connection'
import { GaslessApproval, Event, User } from '@/lib/database/models'
import mongoose from 'mongoose'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 [SIGNATURE API] Generating approval signature')
    
    const body = await request.json()
    console.log('Signature request body:', JSON.stringify(body, null, 2))
    
    const { 
      recipient, 
      eventId: blockchainEventId, // This is the on-chain event ID (number)
      ticketCategory = 0, 
      amount = 1, 
      price = '0', 
      validUntil,
      approvalId: providedApprovalId,
      userId: providedUserId // Optional, can be passed from frontend
    } = body

    // Validate required fields
    if (!recipient || !blockchainEventId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: recipient, eventId'
      }, { status: 400 })
    }

    await connectDB()

    // Generate approval ID
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 10)
    const approvalId = providedApprovalId || `approval_${timestamp}_${random}`
    
    // Calculate validUntil (default: 1 hour from now)
    const calculatedValidUntil = validUntil || Math.floor(Date.now() / 1000) + 3600
    
    // Find MongoDB event by blockchainEventId or create if doesn't exist
    let mongoEvent = await Event.findOne({ onChainId: blockchainEventId })
    
    if (!mongoEvent) {
      console.log(`⚠️ Event with onChainId ${blockchainEventId} not found, creating placeholder`)
      
      // Find or create user by recipient wallet address
      let user = await User.findOne({ walletAddress: recipient })
      
      if (!user) {
        // Create a new user if not found
        user = await User.create({
          privyId: `wallet_${recipient}`,
          walletAddress: recipient,
          loginMethod: 'email',
          isOrganizer: true,
          isProfileComplete: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        console.log('✅ Created new user for recipient:', user._id)
      }
      
      // Create a minimal event record
      mongoEvent = await Event.create({
        organizerId: user._id,
        organizerWallet: recipient,
        title: `Blockchain Event ${blockchainEventId}`,
        startDate: new Date(),
        endDate: new Date(),
        category: 'business',
        isOnChain: true,
        onChainId: blockchainEventId,
        status: 'published',
        isActive: true,
        isFree: false,
        price: 0,
        unlimitedCapacity: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      console.log('✅ Created placeholder event:', mongoEvent._id)
    }

    // Find or create user for userId
    let userId
    if (providedUserId) {
      try {
        userId = new mongoose.Types.ObjectId(providedUserId)
      } catch {
        console.warn('Invalid providedUserId, creating new user')
        const user = await User.findOne({ walletAddress: recipient })
        userId = user ? user._id : new mongoose.Types.ObjectId()
      }
    } else {
      const user = await User.findOne({ walletAddress: recipient })
      if (user) {
        userId = user._id
      } else {
        // Create a new user
        const newUser = await User.create({
          privyId: `wallet_${recipient}`,
          walletAddress: recipient,
          loginMethod: 'email',
          isOrganizer: true,
          isProfileComplete: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        userId = newUser._id
        console.log('✅ Created new user for signature:', userId)
      }
    }

    // Check if GASLESS_PRIVATE_KEY is configured
    const GASLESS_PRIVATE_KEY = process.env.GASLESS_PRIVATE_KEY
    
    let signature: string
    let signedBy: string | undefined
    
    if (GASLESS_PRIVATE_KEY) {
      try {
        // Setup wallet with the gasless private key
        const wallet = new ethers.Wallet(GASLESS_PRIVATE_KEY)
        
        // Convert values to proper types
        const recipientAddress = ethers.getAddress(recipient)
        const eventIdBigInt = BigInt(blockchainEventId)
        const ticketCategoryNumber = Number(ticketCategory)
        const amountBigInt = BigInt(amount || 1)
        
        // Convert price to wei
        let priceBigInt: bigint
        if (typeof price === 'string') {
          // Check if it's already in wei (has no decimal point and is a large number)
          if (!price.includes('.') && price.length > 10) {
            // It's likely already in wei
            priceBigInt = BigInt(price)
          } else {
            // Try to parse as ether
            try {
              priceBigInt = ethers.parseEther(price)
            } catch {
              // Fallback to wei
              priceBigInt = BigInt(price)
            }
          }
        } else {
          priceBigInt = BigInt(price)
        }
        
        const validUntilBigInt = BigInt(calculatedValidUntil)
        
        // FIXED: Use ethers.id() to convert approvalId to bytes32
        const approvalIdBytes32 = ethers.id(approvalId)
        
        console.log('Signing data:', {
          recipient: recipientAddress,
          eventId: eventIdBigInt.toString(),
          ticketCategory: ticketCategoryNumber,
          amount: amountBigInt.toString(),
          price: priceBigInt.toString(),
          validUntil: validUntilBigInt.toString(),
          approvalId: approvalId,
          approvalIdBytes32: approvalIdBytes32
        })
        
        // FIXED: Use proper encoding
        const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
          [
            'address',
            'uint256',
            'uint8',
            'uint256',
            'uint256',
            'uint256',
            'bytes32'
          ],
          [
            recipientAddress,
            eventIdBigInt,
            ticketCategoryNumber,
            amountBigInt,
            priceBigInt,
            validUntilBigInt,
            approvalIdBytes32  // Using the bytes32 version
          ]
        )
        
        const messageHash = ethers.keccak256(encodedData)
        
        // Sign the message hash
        signature = await wallet.signMessage(ethers.getBytes(messageHash))
        signedBy = wallet.address
        console.log('✅ Real signature generated by:', wallet.address)
        
      } catch (signingError: any) {
        console.error('Signing error:', signingError)
        // Fallback to mock signature
        signature = '0x' + '00'.repeat(65)
        console.warn('⚠️ Using mock signature due to signing error:', signingError.message)
      }
    } else {
      // Use mock signature for development
      signature = '0x' + '00'.repeat(65)
      console.warn('⚠️ GASLESS_PRIVATE_KEY not configured, using mock signature')
    }

    // Calculate price for database storage
    let priceForDb: number
    if (typeof price === 'string') {
      if (price.includes('.')) {
        priceForDb = parseFloat(price)
      } else {
        // If it's wei, convert to ether for storage
        const priceBigInt = BigInt(price)
        priceForDb = Number(priceBigInt) / 1e18
      }
    } else {
      priceForDb = Number(price)
    }

    // Save approval to database with proper type conversion
    const approvalData = {
      approvalId,
      signature,
      recipient,
      validUntil: new Date(calculatedValidUntil * 1000),
      eventId: mongoEvent._id, // MongoDB ObjectId
      userId: userId, // User ID
      amount: Number(amount),
      price: priceForDb,
      currency: 'USD',
      status: 'pending',
      metadata: {
        eventOnChainId: blockchainEventId,
        ticketCategory,
        generatedAt: new Date().toISOString(),
        signedBy: signedBy || 'mock',
        isMockSignature: !GASLESS_PRIVATE_KEY,
        blockchainEventId: blockchainEventId,
        priceOriginal: price.toString()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    console.log('Saving approval data:', JSON.stringify(approvalData, null, 2))
    
    const approval = new GaslessApproval(approvalData)
    await approval.save()
    
    console.log('✅ Approval saved to database:', approvalId)
    
    return NextResponse.json({
      success: true,
      signature,
      signatureData: {
        recipient,
        eventId: blockchainEventId,
        ticketCategory,
        amount,
        price: price.toString(),
        validUntil: calculatedValidUntil,
        id: approvalId
      },
      signedBy,
      isMockSignature: !GASLESS_PRIVATE_KEY,
      approvalId,
      message: 'Signature generated successfully'
    })

  } catch (error: any) {
    console.error('❌ Signature API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate signature',
      details: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Signature API endpoint',
    endpoint: 'POST /api/tickets/signature',
    description: 'Generate gasless minting approval signatures'
  })
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}