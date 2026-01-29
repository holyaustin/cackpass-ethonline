// app/api/auth/user/route.ts - UPDATED (remove problematic import)
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { User } from '@/lib/database/models'
import { PrivyClient } from '@privy-io/server-auth'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

// Type guard for wallet accounts
function isWalletAccount(account: any): account is { type: 'wallet'; address: string } {
  return account.type === 'wallet' && 'address' in account && typeof account.address === 'string'
}

// Type guard for OAuth accounts
function isOAuthAccount(account: any): account is { type: 'oauth'; provider: string; email?: string; name?: string; username?: string } {
  return account.type === 'oauth' && 'provider' in account
}

// Type guard for email accounts
function isEmailAccount(account: any): account is { type: 'email'; address: string } {
  return account.type === 'email' && 'address' in account
}

// Helper function to extract email from Privy user
function extractEmailFromPrivyUser(privyUser: any): string {
  const linkedAccounts = privyUser.linkedAccounts || []
  let email = ''
  
  console.log('📧 Extracting email from Privy user:', {
    userId: privyUser.id,
    linkedAccountsCount: linkedAccounts.length
  })
  
  // 1. Check email linked accounts first
  for (const account of linkedAccounts) {
    if (isEmailAccount(account)) {
      email = account.address
      console.log('✅ Found email from email account:', email)
      break
    }
    
    if (isOAuthAccount(account) && account.email) {
      email = account.email
      console.log('✅ Found email from OAuth account:', email, 'provider:', account.provider)
      break
    }
  }
  
  // 2. Check for verified emails
  if (!email && privyUser.email) {
    if (typeof privyUser.email === 'object' && privyUser.email.address) {
      email = privyUser.email.address
      console.log('✅ Found email from email object:', email)
    } else if (typeof privyUser.email === 'string') {
      email = privyUser.email
      console.log('✅ Found email from string:', email)
    }
  }
  
  // 3. Check for any email in the user object
  if (!email && privyUser.emailAddresses && Array.isArray(privyUser.emailAddresses)) {
    const emailObj = privyUser.emailAddresses.find((e: any) => e && e.address)
    if (emailObj) {
      email = emailObj.address
      console.log('✅ Found email from emailAddresses:', email)
    }
  }
  
  console.log('📧 Final extracted email:', email || 'No email found')
  return email || ''
}

// Helper function to detect login method
function detectLoginMethod(privyUser: any): 'email' | 'google' | 'twitter' {
  const linkedAccounts = privyUser.linkedAccounts || []
  
  console.log('🔍 Checking linked accounts for login method:', {
    userId: privyUser.id,
    totalAccounts: linkedAccounts.length
  })
  
  // Check for Google OAuth
  const googleAccount = linkedAccounts.find(
    (account: any) => isOAuthAccount(account) && account.provider === 'google'
  )
  if (googleAccount) {
    console.log('✅ Login method detected: google')
    return 'google'
  }
  
  // Check for Twitter OAuth
  const twitterAccount = linkedAccounts.find(
    (account: any) => isOAuthAccount(account) && account.provider === 'twitter'
  )
  if (twitterAccount) {
    console.log('✅ Login method detected: twitter')
    return 'twitter'
  }
  
  // Check for Email
  const emailAccount = linkedAccounts.find(isEmailAccount)
  if (emailAccount) {
    console.log('✅ Login method detected: email')
    return 'email'
  }
  
  console.log('❌ No login method found, defaulting to email')
  return 'email'
}

// Helper to get wallet address
function getWalletAddressFromPrivyUser(privyUser: any): string | null {
  const linkedAccounts = privyUser.linkedAccounts || []
  const walletAccount = linkedAccounts.find(isWalletAccount)
  return walletAccount?.address || null
}

// GET endpoint - Get user by wallet address
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

    // Try to get wallet from token if not provided
    let finalWalletAddress = walletAddress
    if (!finalWalletAddress && token) {
      try {
        const verifiedClaims = await privy.verifyAuthToken(token)
        const privyUser = await privy.getUser(verifiedClaims.userId)
        const walletAddressFromUser = getWalletAddressFromPrivyUser(privyUser)
        
        if (walletAddressFromUser) {
          finalWalletAddress = walletAddressFromUser
          console.log('✅ Found wallet address from token:', finalWalletAddress)
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

    await connectDB()
    
    // First, try to find user by wallet address
    let user = await User.findOne({ walletAddress: finalWalletAddress })
    
    // If user exists and has email, return it
    if (user && user.email) {
      console.log('✅ Found existing user with email:', user.email)
      return NextResponse.json({
        success: true,
        user: formatUserResponse(user),
        needsProfileCompletion: !user.isProfileComplete,
      })
    }

    // If we have a token, try to get more info from Privy
    if (token) {
      try {
        const verifiedClaims = await privy.verifyAuthToken(token)
        console.log('✅ Token verified for user:', verifiedClaims.userId)
        
        const privyUser = await privy.getUser(verifiedClaims.userId)
        const loginMethod = detectLoginMethod(privyUser)
        const email = extractEmailFromPrivyUser(privyUser)
        
        console.log('📊 User info from Privy:', {
          hasEmail: !!email,
          loginMethod,
          email
        })

        // Try to find by privyId first
        let userByPrivyId = await User.findOne({ privyId: verifiedClaims.userId })
        if (userByPrivyId) {
          // Update wallet address if needed
          if (!userByPrivyId.walletAddress) {
            userByPrivyId.walletAddress = finalWalletAddress
            await userByPrivyId.save()
          }
          return NextResponse.json({
            success: true,
            user: formatUserResponse(userByPrivyId),
            needsProfileCompletion: !userByPrivyId.isProfileComplete,
          })
        }

        // If user exists by wallet but no email, update with Privy info
        if (user && !user.email && email) {
          console.log('🔄 Updating existing user with email from Privy:', email)
          user.email = email
          user.loginMethod = loginMethod
          user.privyId = verifiedClaims.userId
          await user.save()
          
          return NextResponse.json({
            success: true,
            user: formatUserResponse(user),
            needsProfileCompletion: !user.isProfileComplete,
          })
        }

        // Create new user if none exists
        if (!user) {
          console.log('🆕 Creating new user with Privy info:', {
            hasEmail: !!email,
            loginMethod
          })
          
          const username = email ? email.split('@')[0] : `user_${finalWalletAddress.slice(2, 8)}`
          
          user = new User({
            privyId: verifiedClaims.userId,
            walletAddress: finalWalletAddress,
            loginMethod: loginMethod,
            email: email || '',
            firstName: '',
            lastName: '',
            username: username,
            isOrganizer: false,
            country: '',
            phoneNumber: '',
            isProfileComplete: false,
            admin: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          
          await user.save()
        }
        
      } catch (error) {
        console.log('❌ Error getting Privy user data:', error)
        // Continue with existing user or create basic one
      }
    }

    // If still no user, create a basic one
    if (!user) {
      console.log('🆕 Creating basic user without Privy data')
      user = new User({
        privyId: `wallet-${finalWalletAddress}`,
        walletAddress: finalWalletAddress,
        loginMethod: 'email',
        email: '',
        firstName: '',
        lastName: '',
        username: `user_${finalWalletAddress.slice(2, 8)}`,
        isOrganizer: false,
        country: '',
        phoneNumber: '',
        isProfileComplete: false,
        admin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await user.save()
    }

    return NextResponse.json({
      success: true,
      user: formatUserResponse(user),
      needsProfileCompletion: !user.isProfileComplete,
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

// POST endpoint - Update profile by wallet address (FIXED - handles missing email from frontend)
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const walletAddress = searchParams.get('walletAddress')
    
    console.log('📝 Profile update request for wallet:', walletAddress)
    
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
    console.log('📦 Request body:', body)
    
    const { 
      isOrganizer, 
      country, 
      phoneNumber, 
      email, // This might not be sent from the frontend
      firstName, 
      lastName,
      username 
    } = body
    
    // Validate required fields
    const errors: string[] = []
    
    if (typeof isOrganizer !== 'boolean') {
      errors.push('isOrganizer must be a boolean')
    }
    
    if (!country || country.trim() === '') {
      errors.push('country is required')
    }
    
    if (!phoneNumber || phoneNumber.trim() === '') {
      errors.push('phoneNumber is required')
    }
    
    // Check if email is required but not provided
    let finalEmail = email || user.email
    if (!finalEmail || finalEmail.trim() === '') {
      errors.push('email is required. Please add email field to your request')
    }
    
    if (errors.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: errors.join(', ') 
      }, { status: 400 })
    }
    
    // Validate email format if provided
    if (finalEmail && finalEmail.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(finalEmail)) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid email format' 
        }, { status: 400 })
      }
    }
    
    // Validate phone number (basic validation)
    const cleanedPhone = phoneNumber.replace(/\D/g, '')
    if (cleanedPhone.length < 8) {
      return NextResponse.json({ 
        success: false, 
        error: 'Phone number is too short' 
      }, { status: 400 })
    }
    
    // Check if email is already used by another user (if it's being changed)
    if (finalEmail && finalEmail !== user.email) {
      const existingUser = await User.findOne({ 
        email: finalEmail, 
        _id: { $ne: user._id } 
      })
      
      if (existingUser) {
        return NextResponse.json({ 
          success: false, 
          error: 'Email is already in use by another account' 
        }, { status: 400 })
      }
    }
    
    // Update user fields
    user.isOrganizer = isOrganizer
    user.country = country.trim()
    user.phoneNumber = phoneNumber.trim()
    user.isProfileComplete = true
    
    // Update email if provided, otherwise keep existing
    if (finalEmail && finalEmail.trim() !== '') {
      user.email = finalEmail.trim()
    }
    
    // Optional fields
    if (firstName && firstName.trim() !== '') {
      user.firstName = firstName.trim()
    }
    
    if (lastName && lastName.trim() !== '') {
      user.lastName = lastName.trim()
    }
    
    if (username && username.trim() !== '') {
      user.username = username.trim()
    }
    
    user.updatedAt = new Date()
    
    await user.save()
    
    console.log('✅ Profile updated successfully for user:', user._id, {
      hasEmail: !!user.email,
      isProfileComplete: user.isProfileComplete
    })
    
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
        username: user.username,
        isProfileComplete: user.isProfileComplete,
        loginMethod: user.loginMethod,
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

// Helper function to format user response
function formatUserResponse(user: any) {
  return {
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
  }
}