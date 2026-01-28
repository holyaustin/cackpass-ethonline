// app/middleware/auth.ts

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require authentication
const publicRoutes = ['/', '/events', '/api/public', '/api/auth']

// Auth routes that require authentication
const authRoutes = ['/dashboard', '/profile', '/organizer', '/api/private']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow public routes without auth
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next()
  }
  
  // Check if route requires auth
  const requiresAuth = authRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )
  
  if (!requiresAuth) {
    return NextResponse.next()
  }
  
  // Get auth token from cookie
  const token = request.cookies.get('privy-token')?.value
  
  if (!token) {
    // Redirect to home if no token
    const url = new URL('/', request.url)
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }
  
  // Verify token and check user status
  try {
    const response = await fetch(`${request.nextUrl.origin}/api/auth/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store',
    })
    
    if (!response.ok) {
      // Token invalid, clear cookie and redirect
      const response = NextResponse.redirect(new URL('/', request.url))
      response.cookies.delete('privy-token')
      return response
    }
    
    const data = await response.json()
    
    // Handle profile completion redirects
    // Handle profile completion redirects
    if (data.needsProfileCompletion && !pathname.startsWith('/profile')) {
      return NextResponse.redirect(new URL('/profile', request.url));
    }

    // Don't redirect from profile if it needs completion
    if (!data.needsProfileCompletion && pathname === '/profile') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    return NextResponse.next()
    
  } catch (error) {
    console.error('Auth middleware error:', error)
    
    // Redirect to home on error
    const response = NextResponse.redirect(new URL('/', request.url))
    response.cookies.delete('privy-token')
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api/auth (auth endpoints)
     * 2. /_next/static (static files)
     * 3. /_next/image (image optimization files)
     * 4. /favicon.ico (favicon file)
     * 5. /public (public assets)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
}