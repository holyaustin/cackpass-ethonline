// /app/api/tickets/signature/route.ts - NEW FILE
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { CackPassCoreABI, TicketCategory } from '@/lib/contracts/abis/CackPassCore'

// Backend signer private key (should be stored securely)
const BACKEND_SIGNER_PRIVATE_KEY = process.env.BACKEND_SIGNER_PRIVATE_KEY
const CACKPASS_CORE_ADDRESS = process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS

// EIP-712 domain for CACKPass
const DOMAIN = {
  name: 'CACKPass',
  version: '1.0.0',
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '4202'),
  verifyingContract: CACKPASS_CORE_ADDRESS
}

// EIP-712 types for MintApproval
const TYPES = {
  MintApproval: [
    { name: 'recipient', type: 'address' },
    { name: 'eventId', type: 'uint256' },
    { name: 'ticketCategory', type: 'uint256' },
    { name: 'amount', type: 'uint256' },
    { name: 'price', type: 'uint256' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'id', type: 'bytes32' }
  ]
}

export async function POST(request: NextRequest) {
  try {
    if (!BACKEND_SIGNER_PRIVATE_KEY) {
      return NextResponse.json(
        { success: false, error: 'Backend signer not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { 
      recipient, 
      eventId, 
      ticketCategory, 
      amount, 
      price,
      validUntil,
      approvalId 
    } = body

    // Validate required fields
    if (!recipient || !eventId || ticketCategory === undefined || !amount || price === undefined || !validUntil || !approvalId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create signer
    const signer = new ethers.Wallet(BACKEND_SIGNER_PRIVATE_KEY)

    // Prepare approval data
    const approval = {
      recipient,
      eventId: Number(eventId),
      ticketCategory: Number(ticketCategory),
      amount: Number(amount),
      price: BigInt(price),
      validUntil: Number(validUntil),
      id: approvalId
    }

    // Sign the typed data
    const signature = await signer.signTypedData(DOMAIN, TYPES, approval)

    // Verify the signature (optional, for debugging)
    const recoveredAddress = ethers.verifyTypedData(DOMAIN, TYPES, approval, signature)

    return NextResponse.json({
      success: true,
      signature,
      signerAddress: signer.address,
      recoveredAddress,
      approvalId
    })

  } catch (error) {
    console.error('Signature generation error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate signature',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}