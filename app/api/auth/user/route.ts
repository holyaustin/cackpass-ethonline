// app/api/auth/user/route.ts - COMPLETE FIX
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { User, UserProfile } from '@/lib/database/models'
import { PrivyClient } from '@privy-io/server-auth'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

// Helper function to extract embedded wallet from linked accounts
function getEmbeddedWalletAddress(privyUser: any): string | null {
  if (!privyUser.linkedAccounts || !Array.isArray(privyUser.linkedAccounts)) {
    return null
  }

  // Find the embedded wallet (wallet with client type 'privy')
  const embeddedWallet = privyUser.linkedAccounts.find(
    (account: any) => 
      account.type === 'wallet' && 
      account.walletClientType === 'privy'
  )

  return embeddedWallet?.address || null
}

// Helper function to get user details from Privy
function getUserDetailsFromPrivy(privyUser: any) {
  let loginMethod = 'email'
  let firstName = ''
  let lastName = ''
  let email = ''
  let username = ''

  // Determine login method and extract user info
  if (privyUser.google?.email) {
    loginMethod = 'google'
    email = privyUser.google.email || ''
    
    // Parse name from Google
    const names = privyUser.google.name?.split(' ') || []
    firstName = names[0] || ''
    lastName = names.slice(1).join(' ') || ''
    username = firstName || email.split('@')[0] || ''
  } 
  else if (privyUser.twitter?.username) {
    loginMethod = 'twitter'
    firstName = privyUser.twitter.username || ''
    username = `@${firstName}`
  }
  else if (privyUser.email?.address) {
    loginMethod = 'email'
    email = privyUser.email.address || ''
    firstName = email.split('@')[0] || ''
    username = firstName
  }

  return { loginMethod, firstName, lastName, email, username }
}

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
      
      // Extract user details
      const { loginMethod, firstName, lastName, email, username } = getUserDetailsFromPrivy(privyUser)
      
      // Get embedded wallet address
      const embeddedWalletAddress = getEmbeddedWalletAddress(privyUser)
      
      // Create new user with minimal required fields
      user = new User({
        privyId: verifiedClaims.userId,
        walletAddress: embeddedWalletAddress, // Store the embedded wallet address
        loginMethod: loginMethod,
        email: email,
        firstName: firstName,
        lastName: lastName,
        username: username,
        isOrganizer: false, // Default false, user will set this
        country: '',
        phoneNumber: '',
        isProfileComplete: false, // Will be true after they set organizer, country, phone
        admin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      
      await user.save()
      
      // Log the wallet address for debugging
      console.log('New user created with embedded wallet:', {
        userId: verifiedClaims.userId,
        walletAddress: embeddedWalletAddress,
        hasLinkedAccounts: !!privyUser.linkedAccounts,
        linkedAccountsCount: privyUser.linkedAccounts?.length || 0
      })
    } else {
      // For existing user, check if we need to update wallet address
      if (!user.walletAddress) {
        const privyUser = await privy.getUser(verifiedClaims.userId)
        const embeddedWalletAddress = getEmbeddedWalletAddress(privyUser)
        
        if (embeddedWalletAddress) {
          user.walletAddress = embeddedWalletAddress
          user.updatedAt = new Date()
          await user.save()
          
          console.log('Updated existing user with embedded wallet:', {
            userId: verifiedClaims.userId,
            walletAddress: embeddedWalletAddress
          })
        }
      }
    }
    
    // Check if profile needs completion (just organizer, country, phone)
    const needsProfileCompletion = !user.isProfileComplete
    
    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        privyId: user.privyId,
        walletAddress: user.walletAddress,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        loginMethod: user.loginMethod,
        username: user.username,
        isOrganizer: user.isOrganizer,
        country: user.country,
        phoneNumber: user.phoneNumber,
        isProfileComplete: user.isProfileComplete,
        admin: user.admin,
      },
      needsProfileCompletion,
      message: needsProfileCompletion 
        ? 'Please complete your basic profile information' 
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
    const { isOrganizer, country, phoneNumber } = body
    
    // Validate required fields
    if (typeof isOrganizer !== 'boolean' || !country || !phoneNumber) {
      return NextResponse.json({ 
        success: false, 
        error: 'isOrganizer, country, and phoneNumber are required' 
      }, { status: 400 })
    }
    
    // Validate phone number format (basic validation)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    if (!phoneRegex.test(phoneNumber.replace(/\D/g, ''))) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid phone number format' 
      }, { status: 400 })
    }
    
    // Update user with basic profile info
    user.isOrganizer = isOrganizer
    user.country = country
    user.phoneNumber = phoneNumber
    user.isProfileComplete = true // Mark as complete after these fields
    user.updatedAt = new Date()
    
    await user.save()
    
    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        isOrganizer: user.isOrganizer,
        country: user.country,
        phoneNumber: user.phoneNumber,
        isProfileComplete: user.isProfileComplete,
      },
      message: 'Basic profile completed successfully',
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

// New endpoint to sync wallet (in case wallet is created after initial login)
export async function PUT(request: NextRequest) {
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
    
    // Get latest user data from Privy
    const privyUser = await privy.getUser(verifiedClaims.userId)
    const embeddedWalletAddress = getEmbeddedWalletAddress(privyUser)
    
    if (embeddedWalletAddress && embeddedWalletAddress !== user.walletAddress) {
      user.walletAddress = embeddedWalletAddress
      user.updatedAt = new Date()
      await user.save()
      
      console.log('Wallet address updated via sync:', {
        userId: verifiedClaims.userId,
        oldAddress: user.walletAddress,
        newAddress: embeddedWalletAddress
      })
    }
    
    return NextResponse.json({
      success: true,
      user: {
        walletAddress: user.walletAddress,
        hasWallet: !!user.walletAddress,
        updated: !!embeddedWalletAddress && embeddedWalletAddress !== user.walletAddress
      }
    })
    
  } catch (error) {
    console.error('Wallet sync error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to sync wallet'
      },
      { status: 500 }
    )
  }
}