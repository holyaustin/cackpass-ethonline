// /app/api/transactions/route.ts - NEW FILE
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { Order, User, Event, TicketType } from '@/lib/database/models'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const search = searchParams.get('search') || ''
    const walletAddress = searchParams.get('walletAddress')
    
    if (!walletAddress) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'walletAddress query param is required' 
        },
        { status: 400 }
      )
    }
    
    const skip = (page - 1) * limit
    
    // Find user by wallet address
    const user = await User.findOne({ walletAddress })
    if (!user) {
      return NextResponse.json({
        success: true,
        transactions: [],
        pagination: {
          page: 1,
          totalPages: 0,
          totalItems: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      })
    }
    
    // Build query
    let query: any = { userId: user._id }
    
    // Status filter
    if (status && status !== 'all') {
      query.paymentStatus = status
    }
    
    // Search filter
    if (search) {
      // We'll search after populating event and ticketType
      // This is a simplified approach - in production, you might want to use MongoDB text search
    }
    
    // Execute query with pagination
    const [transactions, total] = await Promise.all([
      Order.find(query)
        .populate({
          path: 'eventId',
          select: 'title venue imageCid',
          model: Event
        })
        .populate({
          path: 'ticketTypeId',
          select: 'name category price',
          model: TicketType
        })
        .populate({
          path: 'userId',
          select: 'walletAddress email',
          model: User
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query)
    ])
    
    // Apply search filter after population if needed
    let filteredTransactions = transactions
    if (search) {
      const searchLower = search.toLowerCase()
      filteredTransactions = transactions.filter(tx => {
        const eventTitle = tx.eventId?.title?.toLowerCase() || ''
        const ticketTypeName = tx.ticketTypeId?.name?.toLowerCase() || ''
        const paymentRef = tx.paymentReference?.toLowerCase() || ''
        const txId = tx._id.toString().toLowerCase()
        
        return (
          eventTitle.includes(searchLower) ||
          ticketTypeName.includes(searchLower) ||
          paymentRef.includes(searchLower) ||
          txId.includes(searchLower)
        )
      })
    }
    
    const totalPages = Math.ceil(total / limit)
    
    // Format dates for client
    const formattedTransactions = filteredTransactions.map(tx => ({
      ...tx,
      _id: tx._id.toString(),
      createdAt: tx.createdAt?.toISOString(),
      updatedAt: tx.updatedAt?.toISOString(),
      eventId: tx.eventId?._id?.toString(),
      ticketTypeId: tx.ticketTypeId?._id?.toString(),
      userId: tx.userId?._id?.toString(),
      event: tx.eventId ? {
        _id: tx.eventId._id.toString(),
        title: tx.eventId.title,
        venue: tx.eventId.venue,
        imageCid: tx.eventId.imageCid
      } : undefined,
      ticketType: tx.ticketTypeId ? {
        _id: tx.ticketTypeId._id.toString(),
        name: tx.ticketTypeId.name,
        category: tx.ticketTypeId.category,
        price: tx.ticketTypeId.price
      } : undefined,
      user: tx.userId ? {
        _id: tx.userId._id.toString(),
        walletAddress: tx.userId.walletAddress,
        email: tx.userId.email
      } : undefined
    }))
    
    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      pagination: {
        page,
        totalPages,
        totalItems: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })
    
  } catch (error: any) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch transactions',
        details: error.message 
      },
      { status: 500 }
    )
  }
}