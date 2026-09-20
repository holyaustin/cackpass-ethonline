// app/api/admin/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { resolveAdminContext } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const ctx = await resolveAdminContext(request)
  if (!ctx) {
    return NextResponse.json({ isAdmin: false })
  }
  return NextResponse.json({
    isAdmin: true,
    email: ctx.email,
    isSuperAdmin: ctx.isSuperAdmin,
    permissions: ctx.permissions,
  })
}