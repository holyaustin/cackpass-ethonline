// /app/api/user/profile/route.ts - COMPLETE FIXED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { User, UserProfile } from '@/lib/database/models'

// GET - Fetch user profile by wallet address
export async function GET(request: NextRequest) {
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

    // Get user profile (optional detailed profile)
    const profile = await UserProfile.findOne({ userId: user._id })
    
    // Combine data from User and UserProfile tables
    const combinedData = {
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
      detailedProfile: profile ? {
        fullName: profile.fullName,
        bio: profile.bio,
        location: profile.location,
        dateOfBirth: profile.dateOfBirth,
        interests: profile.interests,
        profilePicture: profile.profilePicture,
      } : null,
    }
    
    return NextResponse.json(combinedData)
    
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

// POST - Create or update user profile (NO AUTH TOKEN NEEDED)
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
    
    // Parse profile data
    const body = await request.json()
    console.log('📦 Profile update request body:', body)
    
    const { 
      firstName, 
      lastName, 
      bio, 
      location, 
      dateOfBirth, 
      interests, 
      profilePicture,
      country,
      phoneNumber,
      isOrganizer,
      username
    } = body
    
    // Update MAIN User table with essential information
    const userUpdates: any = {}
    
    if (firstName !== undefined) userUpdates.firstName = firstName
    if (lastName !== undefined) userUpdates.lastName = lastName
    if (country !== undefined) userUpdates.country = country
    if (phoneNumber !== undefined) userUpdates.phoneNumber = phoneNumber
    if (isOrganizer !== undefined) userUpdates.isOrganizer = isOrganizer
    if (username !== undefined) userUpdates.username = username
    
    // Mark profile as complete if we're updating with required info
    if (firstName && lastName && country && phoneNumber) {
      userUpdates.isProfileComplete = true
    }
    
    // Only update if there are changes
    if (Object.keys(userUpdates).length > 0) {
      Object.assign(user, userUpdates)
      user.updatedAt = new Date()
      await user.save()
      console.log('✅ Updated User table:', Object.keys(userUpdates))
    }
    
    // Create or update UserProfile table with detailed information
    let profile = await UserProfile.findOne({ userId: user._id })
    
    if (!profile) {
      profile = new UserProfile({
        userId: user._id,
        fullName: firstName && lastName ? `${firstName} ${lastName}`.trim() : '',
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
      if (firstName && lastName) {
        profile.fullName = `${firstName} ${lastName}`.trim()
      }
      if (bio !== undefined) profile.bio = bio
      if (location !== undefined) profile.location = location
      if (dateOfBirth !== undefined) profile.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null
      if (interests !== undefined) profile.interests = interests
      if (profilePicture !== undefined) profile.profilePicture = profilePicture
      profile.updatedAt = new Date()
    }
    
    await profile.save()
    console.log('✅ Updated UserProfile table')
    
    // Return combined response
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
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
      detailedProfile: {
        fullName: profile.fullName,
        bio: profile.bio,
        location: profile.location,
        dateOfBirth: profile.dateOfBirth,
        interests: profile.interests,
        profilePicture: profile.profilePicture,
      }
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