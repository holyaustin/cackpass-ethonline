// app/api/events/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { Event, TicketType } from '@/lib/database/models'
import { pinata } from '@/lib/services/ipfs'
import { cackPassCore } from '@/lib/contracts/client'
import { getSmartAccount } from '@/lib/services/biconomy'
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
    
    // Upload banner to IPFS
    let bannerIpfsHash = ''
    if (bannerImage) {
      const uploadResult = await pinata.pinFileToIPFS(bannerImage)
      bannerIpfsHash = uploadResult.IpfsHash
    }
    
    // Create metadata JSON
    const metadata = {
      name: title,
      description,
      image: `ipfs://${bannerIpfsHash}`,
      attributes: [
        { trait_type: 'Venue', value: venue },
        { trait_type: 'Start Date', value: startDate },
        { trait_type: 'End Date', value: endDate },
      ],
    }
    
    // Upload metadata to IPFS
    const metadataResult = await pinata.pinJSONToIPFS(metadata)
    const metadataURI = `ipfs://${metadataResult.IpfsHash}`
    
    // Create event in contract
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
    const signer = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY!, provider)
    const smartAccount = await getSmartAccount(signer)
    
    const tx = await cackPassCore.connect(smartAccount).createEvent(
      title,
      metadataURI,
      Math.floor(new Date(startDate).getTime() / 1000),
      Math.floor(new Date(endDate).getTime() / 1000)
    )
    
    const receipt = await tx.wait()
    const eventCreatedLog = receipt.logs.find(
      (log: any) => log.fragment?.name === 'EventCreated'
    )
    const eventId = eventCreatedLog?.args.eventId.toNumber()
    
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
      // Add ticket type to contract
      const addTx = await cackPassCore.connect(smartAccount).addTicketType(
        eventId,
        ticketType.category,
        ticketType.maxSupply,
        ethers.parseEther(ticketType.price.toString())
      )
      await addTx.wait()
      
      // Save to database
      const dbTicketType = new TicketType({
        eventId: event._id,
        name: ticketType.name,
        description: ticketType.description,
        category: ticketType.category,
        price: ticketType.price,
        maxSupply: ticketType.maxSupply,
        metadataURI: ticketType.metadataURI,
      })
      
      await dbTicketType.save()
    }
    
    return NextResponse.json({
      success: true,
      eventId: event._id,
      onChainEventId: eventId,
    })
    
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    )
  }
}