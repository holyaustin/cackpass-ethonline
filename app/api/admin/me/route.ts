// app/api/admin/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { User, AdminUser } from '@/lib/database/models'
import { SUPER_ADMIN_EMAIL, ALL_PERMISSIONS } from '@/lib/admin/permissions'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // ✅ Read wallet from query OR from header — no Privy call needed
    const { searchParams } = new URL(request.url)
    const wallet =
      searchParams.get('walletAddress') ||
      request.headers.get('x-wallet-address') ||
      ''

    if (!wallet) {
      return NextResponse.json({ isAdmin: false })
    }

    await connectDB()

    // ✅ Find the user by wallet address (case-insensitive)
    const user = await User.findOne({
      walletAddress: { $regex: new RegExp(`^${wallet}$`, 'i') },
    }).lean()

    if (!user || !user.email) {
      return NextResponse.json({ isAdmin: false })
    }

    const email = user.email.toLowerCase()

    // ✅ Super admin — hardcoded email
    if (email === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({
        isAdmin: true,
        isSuperAdmin: true,
        email: user.email,
        permissions: ALL_PERMISSIONS,
      })
    }

    // ✅ Regular admin — check the adminusers collection
    const admin = await AdminUser.findOne({ email, isActive: true }).lean()
    if (!admin) {
      return NextResponse.json({ isAdmin: false })
    }

    return NextResponse.json({
      isAdmin: true,
      isSuperAdmin: false,
      email: user.email,
      permissions: admin.permissions || [],
    })
  } catch (err: any) {
    console.error('[admin/me] error:', err)
    // Fail safe — never block the dashboard
    return NextResponse.json({ isAdmin: false })
  }
}