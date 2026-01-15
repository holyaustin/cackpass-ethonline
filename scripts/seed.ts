// scripts/seed.ts
import 'dotenv/config'
import { connectDB } from '@/lib/database/connection'
import { User, UserProfile, Event, TicketType } from '@/lib/database/models'
import mongoose from 'mongoose'

async function seedDatabase() {
  try {
    console.log('🔧 Starting database seed...')
    
    // Connect to database
    await connectDB()
    console.log('✅ Connected to database')

    // Clear existing data (optional - be careful in production!)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🧹 Clearing existing data...')
      await User.deleteMany({})
      await UserProfile.deleteMany({})
      await Event.deleteMany({})
      await TicketType.deleteMany({})
      console.log('✅ Existing data cleared')
    }

    // Create admin user from environment variables
    const adminEmail = process.env.SEED_ADMIN_EMAIL
    const adminName = process.env.SEED_ADMIN_NAME || 'Admin User'
    
    if (!adminEmail) {
      console.warn('⚠️  SEED_ADMIN_EMAIL not set in environment variables')
      console.warn('⚠️  Skipping admin user creation')
    } else {
      console.log('👤 Creating admin user...')
      
      // Generate a unique privyId for seed admin
      const privyId = `seed-admin-${Date.now()}`
      
      const adminUser = await User.create({
        privyId,
        walletAddress: process.env.SEED_ADMIN_WALLET || null,
        loginMethod: 'email',
        username: adminName.toLowerCase().replace(/\s+/g, '-'),
        organizer: true,
        admin: true,
        email: adminEmail,
        name: adminName,
      })
      
      // Create admin profile
      await UserProfile.create({
        userId: adminUser._id,
        walletAddress: process.env.SEED_ADMIN_WALLET || null,
        fullName: adminName,
        bio: 'System administrator account',
        location: 'Remote',
        country: 'Global',
        profilePicture: '',
        isProfileComplete: true,
      })
      
      console.log(`✅ Admin user created: ${adminEmail}`)
    }

    // Create sample events (optional)
    if (process.env.SEED_SAMPLE_DATA === 'true') {
      console.log('🎪 Creating sample events...')
      
      // Create a sample organizer user
      const organizer = await User.create({
        privyId: `sample-organizer-${Date.now()}`,
        walletAddress: null,
        loginMethod: 'email',
        username: 'sample-organizer',
        organizer: true,
        admin: false,
        email: 'organizer@example.com',
        name: 'Sample Organizer',
      })
      
      // Create sample event
      const sampleEvent = await Event.create({
        organizerId: organizer._id,
        title: 'Sample Tech Conference 2024',
        description: 'A sample technology conference for demonstration purposes.',
        venue: 'Virtual Event',
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        endDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000), // 31 days from now
        bannerImage: '',
        metadataURI: '',
        isActive: true,
        isFree: false,
        onChainId: 1,
      })
      
      // Create sample ticket types
      await TicketType.create([
        {
          eventId: sampleEvent._id,
          name: 'General Admission',
          description: 'Standard access to all conference sessions',
          category: 'GeneralAdmission',
          price: 99,
          maxSupply: 1000,
          currentSupply: 0,
          isActive: true,
          onChainCategoryId: 0,
        },
        {
          eventId: sampleEvent._id,
          name: 'VIP Pass',
          description: 'VIP access with premium benefits',
          category: 'VIPPremium',
          price: 299,
          maxSupply: 100,
          currentSupply: 0,
          isActive: true,
          onChainCategoryId: 2,
        },
      ])
      
      console.log('✅ Sample event created: Sample Tech Conference 2024')
    }

    console.log('🎉 Database seed completed successfully!')
    
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

// Run seed
seedDatabase()