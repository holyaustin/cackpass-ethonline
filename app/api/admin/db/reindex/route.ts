// app/api/admin/db/reindex/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/database/connection'
import { requireAdmin, logAdminAction, AdminAuthError } from '@/lib/admin/auth'
import { PERMISSIONS } from '@/lib/admin/permissions'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireAdmin(request, PERMISSIONS.REINDEX_DB)
    await connectDB()

    // Touch a well-known collection to force index sync
    // (Your mongoose schemas already declare indexes — this just ensures they're built)
    const mongoose = require('mongoose')
    const collections = ['payments', 'orders', 'mytickets', 'adminusers', 'adminauditlogs']
    const summaries: string[] = []

    for (const name of collections) {
      try {
        const model = mongoose.connection.collection(name)
        await model.createIndexes()
        summaries.push(`${name}: ok`)
      } catch (e: any) {
        summaries.push(`${name}: ${e.message}`)
      }
    }

    const summary = summaries.join(', ')
    await logAdminAction(ctx, 'db.reindex', 'all', { summary })
    return NextResponse.json({ success: true, summary })
  } catch (err: any) {
    if (err instanceof AdminAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}