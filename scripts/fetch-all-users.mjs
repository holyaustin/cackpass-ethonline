// scripts/fetch-all-users.mjs
// Dump every user record, with admin status and related counts.

import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'

const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const k = t.slice(0, i).trim()
    const v = t.slice(i + 1).trim()
    if (k && !process.env[k]) process.env[k] = v
  }
}

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI missing in .env.local')
  process.exit(1)
}

const SUPER_ADMIN_EMAIL =
  (process.env.SUPER_ADMIN_EMAIL || 'holyaustin@gmail.com').toLowerCase()

async function main() {
  await mongoose.connect(MONGODB_URI)
  const db = mongoose.connection.db

  const users = await db.collection('users').find({}).sort({ createdAt: 1 }).toArray()

  console.log(`\n📋 Found ${users.length} user(s)\n`)

  // Load admin list for quick lookup
  const admins = await db.collection('adminusers').find({ isActive: true }).toArray()
  const adminMap = new Map(admins.map((a) => [a.email?.toLowerCase(), a]))

  for (const u of users) {
    const email = (u.email || '').toLowerCase()
    const isSuper = email === SUPER_ADMIN_EMAIL
    const admin = adminMap.get(email)

    console.log('─────────────────────────────────────────────')
    console.log('_id:            ', u._id?.toString())
    console.log('email:          ', u.email || '(none)')
    console.log('walletAddress:  ', u.walletAddress || '(none)')
    console.log('loginMethod:    ', u.loginMethod || '(none)')
    console.log('firstName:      ', u.firstName || '(none)')
    console.log('lastName:       ', u.lastName || '(none)')
    console.log('username:       ', u.username || '(none)')
    console.log('country:        ', u.country || '(none)')
    console.log('phoneNumber:    ', u.phoneNumber || '(none)')
    console.log('isOrganizer:    ', u.isOrganizer ? 'yes' : 'no')
    console.log('isProfileComplete:', u.isProfileComplete ? 'yes' : 'no')
    console.log('admin (db field):', u.admin ? 'yes' : 'no')
    if (isSuper) {
      console.log('role:            👑 SUPER ADMIN')
    } else if (admin) {
      console.log('role:            🛡️  Admin')
      console.log('permissions:    ', admin.permissions)
    } else {
      console.log('role:            👤 regular user')
    }
    console.log('createdAt:      ', u.createdAt)
  }

  console.log('─────────────────────────────────────────────\n')
  console.log(`Total: ${users.length} user(s)`)
  console.log(`Admins: ${admins.length}`)
  console.log(`Super admin email: ${SUPER_ADMIN_EMAIL}\n`)

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})