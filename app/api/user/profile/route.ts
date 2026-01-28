// app/api/user/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { User, UserProfile } from '@/lib/database/models'
import { PrivyClient } from '@privy-io/server-auth'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

// GET - Fetch user profile
export async function GET(request: NextRequest) {
  try {
    const authToken = request.headers.get('authorization')?.split(' ')[1]
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verifiedClaims = await privy.verifyAuthToken(authToken)
    
    await connectDB()
    
    // Find user by privyId
    const user = await User.findOne({ privyId: verifiedClaims.userId })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user profile (optional detailed profile)
    const profile = await UserProfile.findOne({ userId: user._id })
    
    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        walletAddress: user.walletAddress,
        loginMethod: user.loginMethod,
        username: user.username,
        isOrganizer: user.isOrganizer,
        country: user.country,
        phoneNumber: user.phoneNumber,
        isProfileComplete: user.isProfileComplete,
        admin: user.admin,
      },
      detailedProfile: profile || null,
    })
    
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST - Create or update user profile
export async function POST(request: NextRequest) {
  try {
    const authToken = request.headers.get('authorization')?.split(' ')[1]
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verifiedClaims = await privy.verifyAuthToken(authToken)
    
    await connectDB()
    
    // Find user
    const user = await User.findOne({ privyId: verifiedClaims.userId })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Parse profile data
     // Parse profile data (optional detailed profile)
    const body = await request.json()
    const { fullName, bio, location, dateOfBirth, interests, profilePicture } = body
    
    // Find or create detailed profile
    let profile = await UserProfile.findOne({ userId: user._id })
    
    if (!profile) {
      profile = new UserProfile({
        userId: user._id,
        fullName: fullName || '',
        bio: bio || '',
        location: location || '',
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        interests: interests || [],
        profilePicture: profilePicture || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    } else {
      // Update existing profile
      profile.fullName = fullName || profile.fullName
      profile.bio = bio || profile.bio
      profile.location = location || profile.location
      profile.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : profile.dateOfBirth
      profile.interests = interests || profile.interests
      profile.profilePicture = profilePicture || profile.profilePicture
      profile.updatedAt = new Date()
    }
    
    await profile.save()
    
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: profile,
    })
    
  } catch (error) {
    console.error('Profile save error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to save profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}