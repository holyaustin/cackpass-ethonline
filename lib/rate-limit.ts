// lib/rate-limit.ts

// Simple in-memory rate limiting for production
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(
  identifier: string, 
  limit: number = 10, 
  windowMs: number = 60000
): { isAllowed: boolean; remaining: number; resetIn: number } {
  const key = `rate-limit:${identifier}`
  const now = Date.now()
  
  let entry = rateLimitStore.get(key)
  
  if (!entry || now > entry.resetTime) {
    // New window
    entry = { count: 1, resetTime: now + windowMs }
  } else if (entry.count >= limit) {
    // Rate limited
    return {
      isAllowed: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetTime - now) / 1000)
    }
  } else {
    // Increment count
    entry.count++
  }
  
  rateLimitStore.set(key, entry)
  
  // Cleanup old entries (optional, for memory management)
  setTimeout(() => {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime + 60000) { // 1 minute after reset
        rateLimitStore.delete(k)
      }
    }
  }, 30000)
  
  return {
    isAllowed: true,
    remaining: limit - entry.count,
    resetIn: Math.ceil((entry.resetTime - now) / 1000)
  }
}