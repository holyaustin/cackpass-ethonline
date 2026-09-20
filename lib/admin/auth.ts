// lib/admin/auth.ts
import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { User, AdminUser, AdminAuditLog } from '@/lib/database/models'
import { SUPER_ADMIN_EMAIL, ALL_PERMISSIONS, Permission } from './permissions'

export type AdminContext = {
  email: string
  isSuperAdmin: boolean
  permissions: Permission[]
  walletAddress: string
  ip: string
  userAgent: string
}

/**
 * Resolve admin context from wallet address (?walletAddress=... or x-wallet-address header).
 * Same pattern as the rest of the app.
 */
export async function resolveAdminContext(
  request: NextRequest
): Promise<AdminContext | null> {
  const { searchParams } = new URL(request.url)
  const wallet =
    searchParams.get('walletAddress') ||
    request.headers.get('x-wallet-address') ||
    ''

  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) return null

  await connectDB()

  const user = await User.findOne({
    walletAddress: { $regex: new RegExp(`^${wallet}$`, 'i') },
  }).lean()

  if (!user?.email) return null

  const email = String(user.email).toLowerCase()

  // Super admin — hardcoded, always full permissions
  if (email === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return {
      email,
      isSuperAdmin: true,
      permissions: ALL_PERMISSIONS,
      walletAddress: wallet,
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') || '',
    }
  }

  // Regular admin
  const admin = await AdminUser.findOne({ email, isActive: true }).lean()
  if (!admin) return null

  return {
    email,
    isSuperAdmin: false,
    permissions: (admin.permissions || []) as Permission[],
    walletAddress: wallet,
    ip: getClientIp(request),
    userAgent: request.headers.get('user-agent') || '',
  }
}

export async function requireAdmin(
  request: NextRequest,
  permission: Permission
): Promise<AdminContext> {
  const ctx = await resolveAdminContext(request)
  if (!ctx) throw new AdminAuthError('Unauthorized', 401)
  if (!ctx.permissions.includes(permission)) {
    throw new AdminAuthError('Forbidden: missing permission', 403)
  }
  return ctx
}

export async function logAdminAction(
  ctx: AdminContext,
  action: string,
  target: string,
  details: Record<string, any> = {},
  success: boolean = true,
  error: string = ''
): Promise<void> {
  try {
    await connectDB()
    await AdminAuditLog.create({
      actorEmail: ctx.email,
      action,
      target,
      details,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      success,
      error,
    })
  } catch (err) {
    console.error('Failed to write audit log:', err)
  }
}

export class AdminAuthError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    ''
  )
}