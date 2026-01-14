import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('privy_token')?.value
  
  // If no token, allow access to public routes
  if (!token) {
    return NextResponse.next()
  }
  
  // Check if user needs to complete profile
  try {
    const response = await fetch(`${request.nextUrl.origin}/api/user/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    
    if (response.ok) {
      const data = await response.json()
      
      // If user exists but profile is incomplete, redirect to profile page
      if (data.user && !data.profile?.isProfileComplete && request.nextUrl.pathname !== '/profile') {
        return NextResponse.redirect(new URL('/profile', request.url))
      }
      
      // If profile is complete and user tries to access profile page, redirect to dashboard
      if (data.profile?.isProfileComplete && request.nextUrl.pathname === '/profile') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/organizer/:path*',
  ],
}