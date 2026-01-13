// app/api/events/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { connectDB } from '@/lib/database/connection'
import { Event, TicketType } from '@/lib/database/models'
import { uploadJSONToIPFS, uploadFileToIPFS } from '@/lib/services/ipfs'
import { getCackPassCore } from '@/lib/contracts/client'
import { createSmartAccount, executeContractCall } from '@/lib/services/biconomy'
import { PrivyClient } from '@privy-io/server-auth'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    // Verify auth with Privy
    const authToken = request.headers.get('authorization')?.split(' ')[1]
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const verifiedClaims = await privy.verifyAuthToken(authToken)
    const userId = verifiedClaims.userId
    
    // Parse request body
    const body = await request.json()
    const {
      title,
      description,
      venue,
      location,
      startDate,
      endDate,
      isFree,
      ticketTypes,
      bannerImage,
    } = body
    
    // Upload banner to IPFS if provided as base64
    let bannerIpfsHash = ''
    if (bannerImage && bannerImage.startsWith('data:image')) {
      const base64Data = bannerImage.split(',')[1]
      const buffer = Buffer.from(base64Data, 'base64')
      const uploadResult = await uploadFileToIPFS(buffer, `${title}-banner`)
      bannerIpfsHash = uploadResult.IpfsHash
    }
    
    // Create metadata JSON
    const metadata = {
      name: title,
      description,
      image: bannerIpfsHash ? `ipfs://${bannerIpfsHash}` : '',
      attributes: [
        { trait_type: 'Venue', value: venue },
        { trait_type: 'Start Date', value: startDate },
        { trait_type: 'End Date', value: endDate },
        { trait_type: 'Is Free', value: isFree },
      ],
    }
    
    // Upload metadata to IPFS
    const metadataResult = await uploadJSONToIPFS(metadata, `${title}-metadata`)
    const metadataURI = `ipfs://${metadataResult.IpfsHash}`
    
    // Convert dates to timestamps
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000)
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000)
    
    // Get contract instance
    const cackPassCore = getCackPassCore()
    
    // Create signer for gasless transaction
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
    const signer = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider)
    
    // Create event in contract (gasless)
    const createEventTx = await executeContractCall(
      cackPassCore,
      'createEvent',
      [title, metadataURI, startTimestamp, endTimestamp],
      signer
    )
    
    // Get event ID from transaction receipt
    const receipt = await createEventTx.receipt.wait()
    
    // Parse logs to get event ID (simplified - in production, parse event logs)
    // For now, we'll simulate getting an event ID
    const eventId = Math.floor(Math.random() * 1000) + 1 // Replace with actual event ID from logs
    
    // Create event in database
    const event = new Event({
      organizerId: userId,
      title,
      description,
      venue,
      location,
      startDate,
      endDate,
      bannerImage: bannerIpfsHash,
      metadataURI,
      isFree,
      onChainId: eventId,
    })
    
    await event.save()
    
    // Create ticket types
    for (const ticketType of ticketTypes) {
      // Add ticket type to contract (gasless)
      await executeContractCall(
        cackPassCore,
        'addTicketType',
        [
          eventId,
          ticketType.category || 0, // Default to GeneralAdmission
          ticketType.maxSupply,
          ethers.parseEther(ticketType.price?.toString() || '0')
        ],
        signer
      )
      
      // Save to database
      const dbTicketType = new TicketType({
        eventId: event._id,
        name: ticketType.name,
        description: ticketType.description,
        category: ticketType.category || 'GeneralAdmission',
        price: ticketType.price || 0,
        maxSupply: ticketType.maxSupply,
        metadataURI: ticketType.metadataURI || '',
      })
      
      await dbTicketType.save()
    }
    
    return NextResponse.json({
      success: true,
      eventId: event._id,
      onChainEventId: eventId,
      message: 'Event created successfully with gasless transaction',
    })
    
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { error: 'Failed to create event', details: (error as Error).message },
      { status: 500 }
    )
  }
}