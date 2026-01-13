// app/api/events/create/route.ts - UPDATED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { connectDB } from '@/lib/database/connection'
import { Event, TicketType, User } from '@/lib/database/models'
import { uploadBase64ImageToIPFS, uploadJSONToIPFS } from '@/lib/services/ipfs'
import { getCackPassCore } from '@/lib/contracts/client'
import { executeContractCall } from '@/lib/services/biconomy'
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
    
    // Get user from database
    const user = await User.findOne({ privyId: userId })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
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
      merkleRoot, // For whitelist/presale
      maxTicketsPerUser, // Limit per user
      allowResale, // Enable secondary market
      resaleRoyalty, // Royalty percentage for secondary sales
      isActive = true,
    } = body
    
    // Validate required fields
    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Title, start date, and end date are required' },
        { status: 400 }
      )
    }
    
    // Upload banner to IPFS if provided
    let bannerIpfsHash = ''
    let bannerGatewayUrl = ''
    
    if (bannerImage && bannerImage.startsWith('data:image')) {
      try {
        const bannerResult = await uploadBase64ImageToIPFS(
          bannerImage,
          `${title}-banner-${Date.now()}.png`
        )
        bannerIpfsHash = bannerResult.cid
        bannerGatewayUrl = bannerResult.gatewayUrl
      } catch (error) {
        console.error('Failed to upload banner:', error)
        // Continue without banner if upload fails
      }
    }
    
    // Create event metadata JSON
    const metadata = {
      name: title,
      description,
      image: bannerIpfsHash ? `ipfs://${bannerIpfsHash}` : '',
      external_url: `${process.env.NEXT_PUBLIC_APP_URL}/events`,
      attributes: [
        { trait_type: 'Venue', value: venue || 'TBA' },
        { trait_type: 'Start Date', value: startDate },
        { trait_type: 'End Date', value: endDate },
        { trait_type: 'Is Free', value: isFree ? 'Yes' : 'No' },
        { trait_type: 'Category', value: 'Event' },
        { trait_type: 'Allow Resale', value: allowResale ? 'Yes' : 'No' },
      ],
    }
    
    // Upload metadata to IPFS
    const metadataResult = await uploadJSONToIPFS(metadata, `${title}-metadata`)
    const metadataURI = `ipfs://${metadataResult.cid}`
    
    // Convert dates to timestamps
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000)
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000)
    
    // Get contract instance
    const cackPassCore = getCackPassCore()
    
    // Create signer for gasless transaction
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL!)
    const signer = new ethers.Wallet(process.env.BACKEND_SIGNER_PRIVATE_KEY!, provider)
    
    // Create event in contract (gasless)
    const createEventResult = await executeContractCall(
      cackPassCore,
      'createEvent',
      [title, metadataURI, startTimestamp, endTimestamp],
      signer
    )
    
    // In real implementation, you would parse the transaction receipt
    // to get the actual eventId from the EventCreated event logs
    // For now, we'll use a sequential ID
    const existingEvents = await Event.countDocuments()
    const onChainEventId = existingEvents + 1
    
    // Create event in database
    const event = new Event({
      organizerId: user._id,
      title,
      description,
      venue: venue || 'Online',
      location: location || { lat: 0, lng: 0 },
      startDate,
      endDate,
      bannerImage: bannerIpfsHash,
      bannerUrl: bannerGatewayUrl,
      metadataURI,
      metadataGatewayUrl: metadataResult.gatewayUrl,
      isFree: isFree || false,
      onChainId: onChainEventId,
      isActive,
      merkleRoot: merkleRoot || null,
      maxTicketsPerUser: maxTicketsPerUser || 0, // 0 = unlimited
      allowResale: allowResale !== false, // Default to true
      resaleRoyalty: resaleRoyalty || 0, // Default 0%
      createdAt: new Date(),
    })
    
    await event.save()
    
    // Create ticket types in contract and database
    const createdTicketTypes = []
    
    for (const [index, ticketType] of (ticketTypes || []).entries()) {
      // Validate ticket type
      if (!ticketType.name || ticketType.maxSupply <= 0) {
        continue // Skip invalid ticket types
      }
      
      // Map category to contract enum (0 = GeneralAdmission, 1 = ReservedSeating, etc.)
      const categoryMap: Record<string, number> = {
        'GeneralAdmission': 0,
        'ReservedSeating': 1,
        'VIPPremium': 2,
        'Others': 3,
      }
      
      const contractCategory = categoryMap[ticketType.category] || 0
      
      // Add ticket type to contract (gasless)
      try {
        await executeContractCall(
          cackPassCore,
          'addTicketType',
          [
            onChainEventId,
            contractCategory,
            ticketType.maxSupply,
            ethers.parseEther(ticketType.price?.toString() || '0')
          ],
          signer
        )
      } catch (error) {
        console.error(`Failed to add ticket type ${ticketType.name}:`, error)
        continue
      }
      
      // Create metadata for ticket type
      const ticketMetadata = {
        name: ticketType.name,
        description: ticketType.description || `${ticketType.name} ticket for ${title}`,
        image: bannerIpfsHash ? `ipfs://${bannerIpfsHash}` : '',
        attributes: [
          { trait_type: 'Event', value: title },
          { trait_type: 'Category', value: ticketType.category || 'GeneralAdmission' },
          { trait_type: 'Price', value: ticketType.price || 0 },
          { trait_type: 'Max Supply', value: ticketType.maxSupply },
        ],
      }
      
      // Upload ticket metadata to IPFS
      let ticketMetadataURI = ''
      try {
        const ticketMetadataResult = await uploadJSONToIPFS(
          ticketMetadata,
          `${title}-${ticketType.name}-metadata`
        )
        ticketMetadataURI = `ipfs://${ticketMetadataResult.cid}`
      } catch (error) {
        console.error('Failed to upload ticket metadata:', error)
      }
      
      // Save to database
      const dbTicketType = new TicketType({
        eventId: event._id,
        name: ticketType.name,
        description: ticketType.description,
        category: ticketType.category || 'GeneralAdmission',
        price: ticketType.price || 0,
        maxSupply: ticketType.maxSupply,
        currentSupply: 0,
        metadataURI: ticketMetadataURI,
        onChainCategoryId: contractCategory,
        isActive: ticketType.isActive !== false,
        createdAt: new Date(),
      })
      
      await dbTicketType.save()
      createdTicketTypes.push({
        id: dbTicketType._id,
        name: dbTicketType.name,
        onChainCategoryId: dbTicketType.onChainCategoryId,
      })
    }
    
    // If merkleRoot provided, set it on contract
    if (merkleRoot) {
      try {
        await executeContractCall(
          cackPassCore,
          'setEventMerkleRoot',
          [onChainEventId, merkleRoot],
          signer
        )
      } catch (error) {
        console.error('Failed to set merkle root:', error)
      }
    }
    
    return NextResponse.json({
      success: true,
      eventId: event._id,
      onChainEventId,
      bannerUrl: bannerGatewayUrl,
      metadataUrl: metadataResult.gatewayUrl,
      ticketTypes: createdTicketTypes,
      message: 'Event created successfully with gasless transaction',
    })
    
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create event', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}