// scripts/test-mongodb-connection.js
const mongoose = require('mongoose')
require('dotenv').config({ path: '.env.local' })

async function testConnection() {
  console.log('🔌 Testing MongoDB Connection...\n')
  
  // Check if MONGODB_URI exists
  if (!process.env.MONGODB_URI) {
    console.error('❌ ERROR: MONGODB_URI not found in .env.local')
    console.log('\nPlease add this to your .env.local file:')
    console.log('MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname')
    return false
  }
  
  // Show masked URI (hide password)
  const maskedUri = process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')
  console.log(`📡 Connection string: ${maskedUri}`)
  
  try {
    // Set connection options
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
      connectTimeoutMS: 10000,
    }
    
    console.log('🔄 Connecting to MongoDB Atlas...')
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, options)
    
    // Check connection
    const db = mongoose.connection
    
    console.log('\n✅ SUCCESS! MongoDB Connected!')
    console.log(`📈 Connection state: ${db.readyState === 1 ? 'Connected' : 'Disconnected'}`)
    
    // FIXED: Safely access database name and connection details
    if (db.db) {
      console.log(`📊 Database: ${db.db.databaseName}`)
    } else {
      console.log(`📊 Database: Not available`)
    }
    
    // FIXED: Safely get username from connection string instead of options
    try {
      const uri = new URL(process.env.MONGODB_URI)
      const username = uri.username || 'Not specified'
      console.log(`👤 Username from URI: ${username}`)
    } catch (parseError) {
      console.log(`👤 Username: Could not parse from URI`)
    }
    
    // Get host information
    if (db.host) {
      console.log(`📍 Host: ${db.host}`)
    }
    
    if (db.port) {
      console.log(`📍 Port: ${db.port}`)
    }
    
    // List all collections (if database is accessible)
    try {
      if (db.db) {
        const collections = await db.db.listCollections().toArray()
        console.log(`\n📁 Collections in database (${collections.length}):`)
        collections.forEach((col, index) => {
          console.log(`  ${index + 1}. ${col.name}`)
        })
      } else {
        console.log('\n📁 Collections: Database not accessible')
      }
    } catch (collectionsError) {
      console.log(`\n📁 Collections: Could not list - ${collectionsError.message}`)
    }
    
    // Create a test document
    const TestModel = mongoose.model('Test', new mongoose.Schema({
      message: String,
      timestamp: { type: Date, default: Date.now }
    }))
    
    const testDoc = new TestModel({ message: 'Test connection from CackPass' })
    await testDoc.save()
    
    console.log('\n✅ Test document saved successfully!')
    console.log(`   Document ID: ${testDoc._id}`)
    console.log(`   Message: ${testDoc.message}`)
    console.log(`   Timestamp: ${testDoc.timestamp}`)
    
    // Clean up test document
    await TestModel.deleteOne({ _id: testDoc._id })
    console.log('\n🧹 Test document cleaned up')
    
    // Disconnect
    await mongoose.disconnect()
    console.log('\n🔌 Disconnected from MongoDB')
    
    return true
    
  } catch (error) {
    console.error('\n❌ CONNECTION FAILED:', error.message)
    
    // Provide specific troubleshooting based on error
    console.log('\n🔧 Troubleshooting steps:')
    
    if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.log('1. ❗ Check if your username/password is correct')
      console.log('2. Ensure the database user exists in MongoDB Atlas')
    } else if (error.message.includes('getaddrinfo') || error.message.includes('ENOTFOUND')) {
      console.log('1. ❗ Check your internet connection')
      console.log('2. Verify the cluster hostname is correct')
      console.log('3. Try pinging the cluster: "ping cackpass-cluster.5agv4fb.mongodb.net"')
    } else if (error.message.includes('timed out')) {
      console.log('1. ❗ Connection timeout - check firewall settings')
      console.log('2. Whitelist your IP in MongoDB Atlas Network Access')
      console.log('3. Try using 0.0.0.0/0 for all IPs (less secure)')
    } else if (error.message.includes('not authorized')) {
      console.log('1. ❗ User lacks permissions to access the database')
      console.log('2. Check user roles in MongoDB Atlas')
      console.log('3. Ensure user has readWrite permissions on the database')
    }
    
    console.log('\n📋 General checks:')
    console.log('1. Verify cluster is running in MongoDB Atlas dashboard')
    console.log('2. Check if you need to specify database name in connection string')
    console.log('3. Try connecting with MongoDB Compass to verify credentials')
    console.log('4. Check .env.local file for typos in MONGODB_URI')
    
    // Parse the URI to help debug
    try {
      const uri = new URL(process.env.MONGODB_URI)
      console.log('\n🔍 Parsed connection details:')
      console.log(`   Protocol: ${uri.protocol}`)
      console.log(`   Hostname: ${uri.hostname}`)
      console.log(`   Username: ${uri.username || 'none'}`)
      console.log(`   Pathname: ${uri.pathname || '/ (default)'}`)
    } catch (parseError) {
      console.log(`\n⚠️ Could not parse URI: ${parseError.message}`)
    }
    
    return false
  }
}

// Run test
if (require.main === module) {
  testConnection()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(err => {
      console.error('Unexpected error:', err)
      process.exit(1)
    })
}

module.exports = { testConnection }