// app/api/auth/user/route.ts - SIMPLE LOGIN METHOD FIX (TypeScript fixed)
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { User } from '@/lib/database/models'
import { PrivyClient } from '@privy-io/server-auth'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

// SIMPLE Helper function to detect login method from Privy user
function detectLoginMethod(privyUser: any): 'email' | 'google' | 'twitter' {
  // Check root properties (most reliable)
  if (privyUser.google?.email) {
    console.log('✅ Login method detected: google')
    return 'google'
  }
  
  if (privyUser.twitter?.username) {
    console.log('✅ Login method detected: twitter')
    return 'twitter'
  }
  
  if (privyUser.email?.address) {
    console.log('✅ Login method detected: email')
    return 'email'
  }
  
  // Fallback to email as default
  console.log('⚠️ No login method found, defaulting to email')
  return 'email'
}

// SIMPLE Helper function to extract basic user info - FIXED TYPE
function getBasicUserInfo(privyUser: any, loginMethod: string): {
  email: string
  firstName: string
  lastName: string
  username: string
} {
  let email = ''
  let firstName = ''
  let lastName = ''
  let username = 'user'
  
  switch (loginMethod) {
    case 'google':
      email = privyUser.google?.email || ''
      const googleName = privyUser.google?.name || ''
      if (googleName) {
        const nameParts = googleName.split(' ')
        firstName = nameParts[0] || ''
        lastName = nameParts.slice(1).join(' ') || ''
      }
      username = email.split('@')[0] || 'user'
      break
      
    case 'twitter':
      const twitterUsername = privyUser.twitter?.username || ''
      firstName = twitterUsername
      username = `@${twitterUsername}`
      break
      
    case 'email':
      email = privyUser.email?.address || ''
      username = email.split('@')[0] || 'user'
      firstName = username
      break
  }
  
  return {
    email: email,
    firstName: firstName,
    lastName: lastName,
    username
  }
}

// Helper function to create or update user from wallet
async function findOrCreateUserByWallet(walletAddress: string, token?: string) {
  await connectDB()
  
  // First, try to find user by wallet address
  let user = await User.findOne({ walletAddress })
  
  // If user found, update token if provided
  if (user && token) {
    // If we have a token, we can verify and get privyId
    try {
      const verifiedClaims = await privy.verifyAuthToken(token)
      if (verifiedClaims.userId && user.privyId !== verifiedClaims.userId) {
        user.privyId = verifiedClaims.userId
        user.updatedAt = new Date()
        await user.save()
      }
    } catch (error) {
      console.log('Token verification failed, but user found by wallet')
    }
  }
  
  // If user not found but we have token, try to find by token
  if (!user && token) {
    try {
      const verifiedClaims = await privy.verifyAuthToken(token)
      user = await User.findOne({ privyId: verifiedClaims.userId })
      
      // If found by privyId, update wallet address
      if (user && !user.walletAddress) {
        user.walletAddress = walletAddress
        user.updatedAt = new Date()
        await user.save()
      }
    } catch (error) {
      console.log('Cannot verify token or find user by privyId')
    }
  }
  
  // If still no user, create new one
  if (!user) {
    let privyId = `wallet-${walletAddress}`
    let loginMethod: 'email' | 'google' | 'twitter' = 'email'
    let userInfo = {
      email: '',
      firstName: '',
      lastName: '',
      username: `user_${walletAddress.slice(2, 8)}`
    }
    
    // Try to get privyId and user data from token if available
    if (token) {
      try {
        const verifiedClaims = await privy.verifyAuthToken(token)
        privyId = verifiedClaims.userId
        
        // Get user data from Privy
        const privyUser = await privy.getUser(verifiedClaims.userId)
        
        // Detect login method
        loginMethod = detectLoginMethod(privyUser)
        
        // Get basic user info
        userInfo = getBasicUserInfo(privyUser, loginMethod)
        
      } catch (error) {
        console.log('Using wallet-based privyId and default info')
      }
    }
    
    user = new User({
      privyId: privyId,
      walletAddress: walletAddress,
      loginMethod: loginMethod, // Use detected login method
      email: userInfo.email,
      firstName: userInfo.firstName,
      lastName: userInfo.lastName,
      username: userInfo.username,
      isOrganizer: false,
      country: '',
      phoneNumber: '',
      isProfileComplete: false,
      admin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    
    await user.save()
    console.log('New user created with login method:', loginMethod)
  }
  
  return user
}

// GET endpoint - Get user by wallet address (primary) or token
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const walletAddress = searchParams.get('walletAddress')
    const authHeader = request.headers.get('authorization')

    if (!walletAddress && !authHeader) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provide walletAddress query param or authorization header',
        },
        { status: 400 }
      )
    }

    let token: string | undefined
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1]
    }

    // If no wallet address in query but we have token, try to get wallet from Privy
    let finalWalletAddress = walletAddress
    if (!finalWalletAddress && token) {
      try {
        const verifiedClaims = await privy.verifyAuthToken(token)
        const privyUser = await privy.getUser(verifiedClaims.userId)

        // Find a linked wallet account from the user's linkedAccounts
        const linkedWallet = privyUser.linkedAccounts?.find(
          (account: any) => account.type === 'wallet' || account.type === 'smart_wallet'
        )

        // Safely extract the address from the found wallet object
        if (linkedWallet && 'address' in linkedWallet) {
          finalWalletAddress = linkedWallet.address as string
        } else {
          console.log('No linked wallet found for user:', verifiedClaims.userId)
        }
      } catch (error) {
        console.log('Cannot get wallet from token:', error)
      }
    }

    if (!finalWalletAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not determine wallet address',
        },
        { status: 400 }
      )
    }

    const user = await findOrCreateUserByWallet(finalWalletAddress, token)
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
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      needsProfileCompletion,
      isNewUser:
        !user.isProfileComplete &&
        user.createdAt > new Date(Date.now() - 5 * 60 * 1000),
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

// POST endpoint - Update profile by wallet address (UNCHANGED)
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const walletAddress = searchParams.get('walletAddress')
    
    if (!walletAddress) {
      return NextResponse.json({ 
        success: false, 
        error: 'walletAddress query param is required' 
      }, { status: 400 })
    }
    
    await connectDB()
    
    // Find user by wallet address
    const user = await User.findOne({ walletAddress })
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 })
    }
    
    // Parse request body
    const body = await request.json()
    const { isOrganizer, country, phoneNumber, email, firstName, lastName } = body
    
    // Validate required fields for basic profile
    if (typeof isOrganizer !== 'boolean' || !country || !phoneNumber) {
      return NextResponse.json({ 
        success: false, 
        error: 'isOrganizer, country, and phoneNumber are required' 
      }, { status: 400 })
    }
    
    // Validate phone number format
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    if (!phoneRegex.test(phoneNumber.replace(/\D/g, ''))) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid phone number format' 
      }, { status: 400 })
    }
    
    // Update user
    user.isOrganizer = isOrganizer
    user.country = country
    user.phoneNumber = phoneNumber
    user.isProfileComplete = true
    
    // Optional fields
    if (email) user.email = email
    if (firstName) user.firstName = firstName
    if (lastName) user.lastName = lastName
    
    user.updatedAt = new Date()
    
    await user.save()
    
    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        isOrganizer: user.isOrganizer,
        country: user.country,
        phoneNumber: user.phoneNumber,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isProfileComplete: user.isProfileComplete,
      },
      message: 'Profile updated successfully',
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