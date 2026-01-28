// /app/api/auth/debug/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing authorization header' 
      }, { status: 401 })
    }

    const authToken = authHeader.split(' ')[1]
    const verifiedClaims = await privy.verifyAuthToken(authToken)
    
    const privyUser = await privy.getUser(verifiedClaims.userId)
    
    // Return raw Privy data for debugging
    return NextResponse.json({
      success: true,
      userId: verifiedClaims.userId,
      hasLinkedAccounts: !!privyUser.linkedAccounts,
      linkedAccounts: privyUser.linkedAccounts || [],
      linkedAccountsCount: privyUser.linkedAccounts?.length || 0,
      embeddedWallets: privyUser.linkedAccounts?.filter(
        (acc: any) => acc.type === 'wallet' && acc.walletClientType === 'privy'
      ) || [],
      rawPrivyUser: {
        // Only include safe data
        id: privyUser.id,
        email: privyUser.email,
        google: privyUser.google ? { email: privyUser.google.email, name: privyUser.google.name } : null,
        twitter: privyUser.twitter ? { username: privyUser.twitter.username } : null,
      }
    })
    
  } catch (error) {
    console.error('Debug error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}