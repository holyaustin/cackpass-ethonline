// app/api/users/[id]/route.ts - FIXED
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { User } from '@/lib/database/models'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB()
    
    // Await the params promise
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }
    
    const user = await User.findById(id)
      .select('-privyId -admin -isProfileComplete -updatedAt')
      .lean()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }
    
    const formattedUser = {
      ...user,
      _id: user._id.toString(),
      createdAt: user.createdAt?.toISOString()
    }
    
    return NextResponse.json({
      success: true,
      user: formattedUser
    })
    
  } catch (error: any) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}