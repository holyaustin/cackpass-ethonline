// lib/admin/auth.ts
import { NextRequest } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import { connectDB } from '@/lib/database/connection'
import { AdminUser, AdminAuditLog } from '@/lib/database/models'
import { SUPER_ADMIN_EMAIL, ALL_PERMISSIONS, Permission } from './permissions'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export type AdminContext = {
  email: string
  isSuperAdmin: boolean
  permissions: Permission[]
  ip: string
  userAgent: string
}

/**
 * Resolve the caller's admin context.
 * Returns null if the caller is not an authenticated admin.
 */
export async function resolveAdminContext(
  request: NextRequest
): Promise<AdminContext | null> {
  // 1. Verify Privy auth token
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)

  let claims
  try {
    claims = await privy.verifyAuthToken(token)
  } catch {
    return null
  }

  // 2. Get the user's email from Privy
  let email = ''
  try {
    const privyUser = await privy.getUser(claims.userId)
    email = extractEmail(privyUser).toLowerCase()
  } catch {
    return null
  }
  if (!email) return null

  // 3. Super admin check (hardcoded, non-revocable)
  if (email === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return {
      email,
      isSuperAdmin: true,
      permissions: ALL_PERMISSIONS,
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') || '',
    }
  }

  // 4. Regular admin check — must exist in AdminUser with isActive
  await connectDB()
  const admin = await AdminUser.findOne({ email, isActive: true }).lean()
  if (!admin) return null

  return {
    email,
    isSuperAdmin: false,
    permissions: (admin.permissions || []) as Permission[],
    ip: getClientIp(request),
    userAgent: request.headers.get('user-agent') || '',
  }
}

/**
 * Assert the caller has a permission; throws a Response-like error if not.
 */
export async function requireAdmin(
  request: NextRequest,
  permission: Permission
): Promise<AdminContext> {
  const ctx = await resolveAdminContext(request)
  if (!ctx) {
    throw new AdminAuthError('Unauthorized', 401)
  }
  if (!ctx.permissions.includes(permission)) {
    throw new AdminAuthError('Forbidden: missing permission', 403)
  }
  return ctx
}

/**
 * Log an admin action (success or failure).
 */
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

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function extractEmail(privyUser: any): string {
  const linked = privyUser?.linkedAccounts || []
  for (const a of linked) {
    if (a.type === 'email' && a.address) return a.address
    if (a.type === 'oauth' && a.email) return a.email
  }
  if (privyUser?.email) {
    if (typeof privyUser.email === 'string') return privyUser.email
    if (privyUser.email.address) return privyUser.email.address
  }
  return ''
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    ''
  )
}