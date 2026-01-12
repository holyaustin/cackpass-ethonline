// app/api/auth/user/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { User } from '@/lib/database/models'
import { PrivyClient } from '@privy-io/server-auth'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export async function GET(request: NextRequest) {
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
      // Create new user
      const privyUser = await privy.getUser(verifiedClaims.userId)
      
      user = new User({
        privyId: verifiedClaims.userId,
        walletAddress: privyUser.wallet?.address,
        email: privyUser.email?.address,
        phone: privyUser.phone?.number,
        name: privyUser.google?.name || privyUser.twitter?.name || 'User',
      })
      
      await user.save()
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        walletAddress: user.walletAddress,
        role: user.role,
      }
    })
    
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    )
  }
}