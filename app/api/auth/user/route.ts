// app/api/auth/user/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { User, UserProfile } from '@/lib/database/models'
import { PrivyClient } from '@privy-io/server-auth'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing or invalid authorization header' 
      }, { status: 401 })
    }

    const authToken = authHeader.split(' ')[1]
    
    // Verify token with Privy
    let verifiedClaims
    try {
      verifiedClaims = await privy.verifyAuthToken(authToken)
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid authentication token' 
      }, { status: 401 })
    }
    
    // Connect to database
    await connectDB()
    
    // Find or create user
    let user = await User.findOne({ privyId: verifiedClaims.userId })
    
    if (!user) {
      // Get user details from Privy
      const privyUser = await privy.getUser(verifiedClaims.userId)
      
      // Determine login method
      let loginMethod = 'email'
      if (privyUser.google?.email) loginMethod = 'google'
      if (privyUser.twitter?.username) loginMethod = 'twitter'
      
      // Get username
      let username = 'user'
      if (privyUser.email?.address) {
        username = privyUser.email.address.split('@')[0]
      } else if (privyUser.google?.name) {
        username = privyUser.google.name
      } else if (privyUser.twitter?.username) {
        username = `@${privyUser.twitter.username}`
      }
      
      // Create new user
      user = new User({
        privyId: verifiedClaims.userId,
        walletAddress: privyUser.wallet?.address || null,
        loginMethod,
        username,
        organizer: false,
        admin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      
      await user.save()
      
      // Create empty profile
      const userProfile = new UserProfile({
        userId: user._id,
        walletAddress: privyUser.wallet?.address || null,
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
      
      await userProfile.save()
    } else {
      // Update wallet address if not set
      if (!user.walletAddress) {
        const privyUser = await privy.getUser(verifiedClaims.userId)
        if (privyUser.wallet?.address) {
          user.walletAddress = privyUser.wallet.address
          await user.save()
          
          // Also update profile wallet address
          const profile = await UserProfile.findOne({ userId: user._id })
          if (profile && !profile.walletAddress) {
            profile.walletAddress = privyUser.wallet.address
            await profile.save()
          }
        }
      }
    }
    
    // Get user profile
    const profile = await UserProfile.findOne({ userId: user._id })
    
    // Check if profile needs completion
    const needsProfileCompletion = !profile?.isProfileComplete
    
    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        privyId: user.privyId,
        walletAddress: user.walletAddress,
        loginMethod: user.loginMethod,
        username: user.username,
        organizer: user.organizer,
        admin: user.admin,
      },
      profile: profile || null,
      needsProfileCompletion,
      hasWallet: !!user.walletAddress,
      message: needsProfileCompletion 
        ? 'Please complete your profile' 
        : 'User authenticated successfully',
    })
    
  } catch (error) {
    console.error('Auth error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST endpoint to update user profile
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const authToken = authHeader.split(' ')[1]
    const verifiedClaims = await privy.verifyAuthToken(authToken)
    
    await connectDB()
    
    // Find user
    const user = await User.findOne({ privyId: verifiedClaims.userId })
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 })
    }
    
    // Parse request body
    const body = await request.json()
    const { profile } = body
    
    if (!profile) {
      return NextResponse.json({ 
        success: false, 
        error: 'Profile data is required' 
      }, { status: 400 })
    }
    
    // Find or create profile
    let userProfile = await UserProfile.findOne({ userId: user._id })
    
    if (!userProfile) {
      userProfile = new UserProfile({
        userId: user._id,
        walletAddress: user.walletAddress,
        ...profile,
        isProfileComplete: !!(profile.fullName && profile.profilePicture),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    } else {
      // Update existing profile
      Object.assign(userProfile, profile, {
        isProfileComplete: !!(profile.fullName && profile.profilePicture),
        updatedAt: new Date(),
      })
      
      // Ensure wallet address is synced
      if (user.walletAddress && !userProfile.walletAddress) {
        userProfile.walletAddress = user.walletAddress
      }
    }
    
    await userProfile.save()
    
    // Update username if full name is provided
    if (profile.fullName && profile.fullName !== user.username) {
      user.username = profile.fullName
      user.updatedAt = new Date()
      await user.save()
    }
    
    return NextResponse.json({
      success: true,
      profile: userProfile,
      message: 'Profile saved successfully',
      needsProfileCompletion: !userProfile.isProfileComplete,
    })
    
  } catch (error) {
    console.error('Profile update error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}