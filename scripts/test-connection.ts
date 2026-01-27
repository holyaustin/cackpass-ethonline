// scripts/test-connection.ts
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...')
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set ✓' : 'Not set ✗')
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set')
    }
    
    // Import connection dynamically
    const { connectDB } = await import('../lib/database/connection')
    const mongoose = await connectDB()
    
    console.log('✅ MongoDB connected successfully!')
    
    // FIXED: Check if connection and database exist before accessing
    if (mongoose.connection.readyState === 1) {
      // ReadyState 1 means connected
      const db = mongoose.connection.db
      
      if (db) {
        console.log(`Connected to database: ${db.databaseName}`)
      } else {
        console.log('Connected to MongoDB, but database object is not available')
      }
      
      // Additional connection info
      console.log(`Connection state: ${mongoose.connection.readyState}`)
      console.log(`Host: ${mongoose.connection.host}`)
      console.log(`Port: ${mongoose.connection.port}`)
      console.log(`Database name: ${mongoose.connection.name}`)
    } else {
      console.log(`Connection state: ${mongoose.connection.readyState} (not fully connected)`)
    }
    
    // Close connection
    await mongoose.disconnect()
    console.log('Connection closed.')
    
  } catch (error: any) {
    console.error('❌ MongoDB connection failed:', error.message)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  testConnection()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { testConnection }