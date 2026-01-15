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

    // Get or create user profile
    let profile = await UserProfile.findOne({ userId: user._id })
    
    if (!profile) {
      profile = new UserProfile({
        userId: user._id,
        walletAddress: user.walletAddress,
        fullName: '',
        bio: '',
        location: '',
        country: '',
        dateOfBirth: null,
        interests: [],
        profilePicture: '',
        isProfileComplete: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await profile.save()
    }

    return NextResponse.json({
      success: true,
      profile: {
        fullName: profile.fullName,
        bio: profile.bio,
        location: profile.location,
        country: profile.country,
        dateOfBirth: profile.dateOfBirth,
        interests: profile.interests,
        profilePicture: profile.profilePicture,
        isProfileComplete: profile.isProfileComplete,
        walletAddress: profile.walletAddress || user.walletAddress,
      },
      user: {
        id: user._id,
        email: user.email,
        walletAddress: user.walletAddress,
        loginMethod: user.loginMethod,
        username: user.username,
        organizer: user.organizer,
        admin: user.admin,
      }
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
    const body = await request.json()
    const { fullName, bio, location, country, dateOfBirth, interests, profilePicture } = body
    
    // Find existing profile or create new
    let profile = await UserProfile.findOne({ userId: user._id })
    
    if (!profile) {
      profile = new UserProfile({
        userId: user._id,
        walletAddress: user.walletAddress,
        fullName: fullName || '',
        bio: bio || '',
        location: location || '',
        country: country || '',
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        interests: interests || [],
        profilePicture: profilePicture || '',
        isProfileComplete: !!(fullName && profilePicture),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    } else {
      // Update existing profile
      profile.fullName = fullName || profile.fullName
      profile.bio = bio || profile.bio
      profile.location = location || profile.location
      profile.country = country || profile.country
      profile.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : profile.dateOfBirth
      profile.interests = interests || profile.interests
      profile.profilePicture = profilePicture || profile.profilePicture
      profile.isProfileComplete = !!(fullName && profilePicture)
      profile.updatedAt = new Date()
      
      // Sync wallet address
      if (user.walletAddress && !profile.walletAddress) {
        profile.walletAddress = user.walletAddress
      }
    }
    
    await profile.save()
    
    // Update user's username if full name is provided
    if (fullName && fullName !== user.username) {
      user.username = fullName
      user.updatedAt = new Date()
      await user.save()
    }
    
    return NextResponse.json({
      success: true,
      message: 'Profile saved successfully',
      profile: {
        fullName: profile.fullName,
        bio: profile.bio,
        location: profile.location,
        country: profile.country,
        dateOfBirth: profile.dateOfBirth,
        interests: profile.interests,
        profilePicture: profile.profilePicture,
        isProfileComplete: profile.isProfileComplete,
      },
      requiresProfileCompletion: !profile.isProfileComplete,
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