// scripts/fetch-user.mjs
// Fetch a user record by wallet address.
// Usage: node scripts/fetch-user.mjs <walletAddress>

import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'

// ─── Load .env.local ─────────────────────────────────────────
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

const wallet = (process.argv[2] || '').trim()
if (!wallet) {
  console.error('Usage: node scripts/fetch-user.mjs <walletAddress>')
  process.exit(1)
}

// ─── Query ───────────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGODB_URI)
  const db = mongoose.connection.db

  console.log(`\n🔍 Looking up wallet: ${wallet}\n`)

  // Match case-insensitively (MongoDB stores the exact case you saved)
  const user = await db.collection('users').findOne({
    walletAddress: { $regex: new RegExp(`^${wallet}$`, 'i') },
  })

  if (!user) {
    console.log('❌ No user found for this wallet.\n')
    await mongoose.disconnect()
    process.exit(0)
  }

  console.log('✅ User found:\n')
  console.log('─── User record ─────────────────────────────')
  console.log(JSON.stringify(user, null, 2))

  // ─── Admin check ──────────────────────────────────────────
  const email = (user.email || '').toLowerCase()
  const SUPER_ADMIN_EMAIL =
    (process.env.SUPER_ADMIN_EMAIL || 'holyaustin@gmail.com').toLowerCase()

  console.log('\n─── Admin status ────────────────────────────')

  if (email === SUPER_ADMIN_EMAIL) {
    console.log('👑 SUPER ADMIN (hardcoded, cannot be revoked)')
  } else {
    const admin = await db.collection('adminusers').findOne({
      email,
      isActive: true,
    })

    if (admin) {
      console.log('🛡️  Admin')
      console.log('   Permissions:', admin.permissions || [])
      console.log('   Granted by:', admin.grantedBy)
      console.log('   Granted at:', admin.grantedAt)
    } else {
      console.log('👤 Not an admin')
      console.log(`   (checked email: ${email || 'none'})`)
    }
  }

  // ─── Related data ─────────────────────────────────────────
  console.log('\n─── Related data ────────────────────────────')

  const ticketCount = await db
    .collection('mytickets')
    .countDocuments({ userId: user._id })

  const paymentCount = await db
    .collection('payments')
    .countDocuments({ userId: user._id })

  console.log(`   Tickets:      ${ticketCount}`)
  console.log(`   Payments:     ${paymentCount}`)

  console.log('\n─────────────────────────────────────────────\n')

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})