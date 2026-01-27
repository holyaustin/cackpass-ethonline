// scripts/check-collections.js
const mongoose = require('mongoose')
require('dotenv').config({ path: '.env.local' })

async function checkCollections() {
  try {
    console.log('📊 Checking MongoDB Collections...\n')
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in .env.local')
    }
    
    await mongoose.connect(process.env.MONGODB_URI)
    const db = mongoose.connection
    
    console.log('✅ Connected to MongoDB\n')
    
    // Get all collections
    const collections = await db.db.listCollections().toArray()
    
    console.log(`Found ${collections.length} collections:\n`)
    
    // Show collection details
    for (const col of collections) {
      console.log(`📁 ${col.name}:`)
      
      // Get document count
      const count = await db.db.collection(col.name).countDocuments()
      console.log(`   📈 Documents: ${count}`)
      
      // Show first few documents if any
      if (count > 0) {
        const sample = await db.db.collection(col.name)
          .find({})
          .limit(2)
          .toArray()
        
        console.log('   📝 Sample documents:')
        sample.forEach((doc, i) => {
          console.log(`     ${i + 1}. ${JSON.stringify(doc).substring(0, 100)}...`)
        })
      }
      console.log('')
    }
    
    await mongoose.disconnect()
    console.log('✅ Done!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkCollections()