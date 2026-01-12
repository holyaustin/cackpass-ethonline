// scripts/seed.ts
import { connectDB } from '@/lib/database/connection'
import { User, Event, TicketType } from '@/lib/database/models'

async function seedDatabase() {
  await connectDB()

  // Clear existing data
  await User.deleteMany({})
  await Event.deleteMany({})
  await TicketType.deleteMany({})

  // Create admin user
  const admin = await User.create({
    privyId: 'admin-seed',
    email: 'holyaustin@yahoo.com',
    name: 'Admin User',
    role: 'admin',
  })

  console.log('✅ Database seeded successfully')
  process.exit(0)
}

seedDatabase().catch(console.error)