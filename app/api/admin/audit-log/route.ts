// app/api/admin/audit-log/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { AdminAuditLog } from '@/lib/database/models'
import { requireAdmin, AdminAuthError } from '@/lib/admin/auth'
import { PERMISSIONS } from '@/lib/admin/permissions'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request, PERMISSIONS.VIEW_AUDIT_LOG)
    await connectDB()
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50'), 200)
    const logs = await AdminAuditLog.find({}).sort({ createdAt: -1 }).limit(limit).lean()
    return NextResponse.json({ logs })
  } catch (err: any) {
    if (err instanceof AdminAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}