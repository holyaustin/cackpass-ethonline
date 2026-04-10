/**
 * Database Migration Script - Add ticketsSold field to existing events
 * 
 * Run with: node scripts/add-tickets-sold-field.js
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
    console.log('📝 Loaded environment variables from .env.local');
  }
}

// Load env variables
loadEnv();

// Get MongoDB URI from environment
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  console.error('Please ensure you have a .env.local file with MONGODB_URI defined');
  console.error('Example: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database');
  process.exit(1);
}

console.log(`🔗 Using MongoDB URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

async function connectDB() {
  try {
    if (mongoose.connection.readyState === 0) {
      console.log('🔌 Connecting to MongoDB...');
      await mongoose.connect(MONGODB_URI);
      console.log('✅ Connected to MongoDB');
    }
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
}

async function addTicketsSoldField() {
  try {
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database');

    // Get the native MongoDB collection directly to check actual fields
    const db = mongoose.connection.db;
    const eventsCollection = db.collection('events');
    
    // Find all events
    const allEvents = await eventsCollection.find({}).toArray();
    console.log(`📋 Found ${allEvents.length} total events in database`);

    let updatedCount = 0;
    let alreadyHaveField = 0;

    for (const event of allEvents) {
      // Check if ticketsSold field actually exists in the document
      const hasTicketsSold = event.hasOwnProperty('ticketsSold');
      
      if (hasTicketsSold) {
        console.log(`⏭️ Event "${event.title}" already has ticketsSold field in database: ${event.ticketsSold}`);
        alreadyHaveField++;
        continue;
      }

      console.log(`\n📝 Adding ticketsSold field to event: "${event.title}" (ID: ${event._id})`);
      console.log(`   - capacity: ${event.capacity || 'unlimited'}`);
      console.log(`   - unlimitedCapacity: ${event.unlimitedCapacity}`);
      
      // Add ticketsSold field with default value 0 using native MongoDB update
      await eventsCollection.updateOne(
        { _id: event._id },
        { $set: { ticketsSold: 0 } }
      );
      
      console.log(`   ✅ Added ticketsSold: 0`);
      updatedCount++;
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY:');
    console.log(`   - Total events processed: ${allEvents.length}`);
    console.log(`   - Events updated with ticketsSold field: ${updatedCount}`);
    console.log(`   - Events already had ticketsSold field: ${alreadyHaveField}`);
    console.log('='.repeat(50));
    
    // Verify the update by fetching events again
    console.log('\n🔍 Verifying updates...');
    const verifyEvents = await eventsCollection.find({}).toArray();
    for (const event of verifyEvents) {
      console.log(`   - "${event.title}": ticketsSold = ${event.ticketsSold !== undefined ? event.ticketsSold : 'NOT SET'}`);
    }
    
    if (updatedCount > 0) {
      console.log('\n✨ Migration completed successfully!');
      console.log('🔄 The ticketsSold field has been added to all events.');
    } else {
      console.log('\n⚠️ No events needed updating. All events already have ticketsSold field.');
    }
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Error adding ticketsSold field:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
addTicketsSoldField();