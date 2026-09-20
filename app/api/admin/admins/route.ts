// app/api/admin/admins/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { AdminUser } from '@/lib/database/models'
import { requireAdmin, logAdminAction, AdminAuthError } from '@/lib/admin/auth'
import { PERMISSIONS, SUPER_ADMIN_EMAIL, ALL_PERMISSIONS, Permission } from '@/lib/admin/permissions'

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAdmin(request, PERMISSIONS.MANAGE_ADMINS)
    if (!ctx.isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin only' }, { status: 403 })
    }

    const { email, permissions } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const normalized = String(email).toLowerCase().trim()
    if (normalized === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { error: 'Cannot re-grant super admin' },
        { status: 400 }
      )
    }

    const cleanPerms: Permission[] = (permissions || [])
      .filter((p: string) => (ALL_PERMISSIONS as string[]).includes(p))

    await connectDB()
    const existing = await AdminUser.findOne({ email: normalized })
    if (existing) {
      existing.permissions = cleanPerms
      existing.isActive = true
      await existing.save()
      await logAdminAction(ctx, 'admin.update', normalized, { permissions: cleanPerms })
    } else {
      await AdminUser.create({
        email: normalized,
        permissions: cleanPerms,
        grantedBy: ctx.email,
      })
      await logAdminAction(ctx, 'admin.grant', normalized, { permissions: cleanPerms })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAdmin(request, PERMISSIONS.MANAGE_ADMINS)
    if (!ctx.isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin only' }, { status: 403 })
    }
    await connectDB()
    const admins = await AdminUser.find({}).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ admins })
  } catch (err: any) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await requireAdmin(request, PERMISSIONS.MANAGE_ADMINS)
    if (!ctx.isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')?.toLowerCase().trim()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    if (email === SUPER_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { error: 'Cannot revoke super admin' },
        { status: 400 }
      )
    }

    await connectDB()
    await AdminUser.deleteOne({ email })
    await logAdminAction(ctx, 'admin.revoke', email)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}