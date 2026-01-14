import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { User, UserProfile } from '@/lib/database/models'
import { PrivyClient } from '@privy-io/server-auth'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

// Helper function to determine login method from Privy user
function getLoginMethodFromPrivyUser(privyUser: any): string {
  if (privyUser.email?.address) return 'email'
  if (privyUser.google?.email) return 'google'
  if (privyUser.twitter?.username) return 'twitter'
  // Note: TikTok and Instagram are not natively supported by Privy
  // For now, we'll default to 'email' if using custom auth
  return 'email' // Default fallback
}

// Helper function to get username from Privy user
function getUsernameFromPrivyUser(privyUser: any): string {
  if (privyUser.email?.address) {
    return privyUser.email.address.split('@')[0]
  }
  if (privyUser.google?.name) return privyUser.google.name
  if (privyUser.twitter?.username) return `@${privyUser.twitter.username}`
  if (privyUser.google?.email) return privyUser.google.email.split('@')[0]
  return 'user'
}

export async function GET(request: NextRequest) {
  try {
    const authToken = request.headers.get('authorization')?.split(' ')[1]
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verifiedClaims = await privy.verifyAuthToken(authToken)
    
    await connectDB()
    
    // Find user by privyId
    let user = await User.findOne({ privyId: verifiedClaims.userId })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user profile
    const profile = await UserProfile.findOne({ userId: user._id })

    return NextResponse.json({
      success: true,
      profile: profile || null,
      user: {
        id: user._id,
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
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authToken = request.headers.get('authorization')?.split(' ')[1]
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const verifiedClaims = await privy.verifyAuthToken(authToken)
    
    await connectDB()
    
    // Find or create user
    let user = await User.findOne({ privyId: verifiedClaims.userId })
    
    if (!user) {
      // Get user info from Privy
      const privyUser = await privy.getUser(verifiedClaims.userId)
      
      // Determine login method and username
      const loginMethod = getLoginMethodFromPrivyUser(privyUser)
      const username = getUsernameFromPrivyUser(privyUser)
      
      // Get embedded wallet address (created automatically by Privy)
      const walletAddress = privyUser.wallet?.address || null
      
      user = new User({
        privyId: verifiedClaims.userId,
        walletAddress: walletAddress,
        loginMethod: loginMethod,
        username: username,
        organizer: false,
        admin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      
      await user.save()
      
      // Create empty profile for new user
      const userProfile = new UserProfile({
        userId: user._id,
        walletAddress: walletAddress, // Store wallet address in profile too
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
    }
    
    // Parse profile data from request
    const body = await request.json()
    const { profile } = body
    
    // Find user profile
    let userProfile = await UserProfile.findOne({ userId: user._id })
    
    if (!userProfile) {
      userProfile = new UserProfile({
        userId: user._id,
        walletAddress: user.walletAddress, // Copy wallet address from user
        fullName: profile.fullName || '',
        bio: profile.bio || '',
        location: profile.location || '',
        country: profile.country || '',
        dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : null,
        interests: profile.interests || [],
        profilePicture: profile.profilePicture || '',
        isProfileComplete: !!(profile.fullName && profile.profilePicture),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    } else {
      // Update existing profile
      userProfile.fullName = profile.fullName || userProfile.fullName
      userProfile.bio = profile.bio || userProfile.bio
      userProfile.location = profile.location || userProfile.location
      userProfile.country = profile.country || userProfile.country
      userProfile.dateOfBirth = profile.dateOfBirth ? new Date(profile.dateOfBirth) : userProfile.dateOfBirth
      userProfile.interests = profile.interests || userProfile.interests
      userProfile.profilePicture = profile.profilePicture || userProfile.profilePicture
      userProfile.isProfileComplete = !!(profile.fullName && profile.profilePicture)
      userProfile.updatedAt = new Date()
      
      // Ensure wallet address is synced
      if (user.walletAddress && !userProfile.walletAddress) {
        userProfile.walletAddress = user.walletAddress
      }
    }
    
    await userProfile.save()
    
    // Update user's username if provided in profile (optional)
    if (profile.fullName && profile.fullName !== user.username) {
      user.username = profile.fullName
      user.updatedAt = new Date()
      await user.save()
    }
    
    return NextResponse.json({
      success: true,
      message: 'Profile saved successfully',
      profile: userProfile,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        loginMethod: user.loginMethod,
        username: user.username,
        organizer: user.organizer,
        admin: user.admin,
      },
      requiresProfileCompletion: !userProfile.isProfileComplete,
    })
    
  } catch (error) {
    console.error('Profile save error:', error)
    return NextResponse.json(
      { error: 'Failed to save profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}