// scripts/fix-event-locations.js
const { MongoClient } = require('mongodb');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function fixEventLocations() {
  // Get MongoDB URI from environment variables
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env.local file');
    console.log('\nPlease check your .env.local file and ensure it contains:');
    console.log('MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database');
    process.exit(1);
  }

  console.log('✅ Found MongoDB connection string');
  
  const client = new MongoClient(uri, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000
  });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const events = db.collection('events');

    // Fix 1: Events with location.address but missing venue
    const result1 = await events.updateMany(
      { 
        venue: { $exists: false }, 
        'location.address': { $exists: true, $ne: null } 
      },
      [
        { $set: { venue: '$location.address' } }
      ]
    );
    console.log(`✅ Fixed ${result1.modifiedCount} events with location.address`);

    // Fix 2: Events with location as string (old format)
    const result2 = await events.updateMany(
      { 
        venue: { $exists: false }, 
        location: { $type: 'string' } 
      },
      [
        { 
          $set: { 
            venue: '$location',
            'location.address': '$location' 
          } 
        }
      ]
    );
    console.log(`✅ Fixed ${result2.modifiedCount} events with string location`);

    // Fix 3: Events with neither venue nor location
    const result3 = await events.updateMany(
      { 
        venue: { $exists: false },
        'location.address': { $exists: false }
      },
      {
        $set: { 
          venue: 'Location to be announced',
          'location.address': 'Location to be announced'
        }
      }
    );
    console.log(`✅ Fixed ${result3.modifiedCount} events with no location data`);

    // Show summary
    const totalFixed = result1.modifiedCount + result2.modifiedCount + result3.modifiedCount;
    console.log(`\n📊 Summary:`);
    console.log(`   Total events fixed: ${totalFixed}`);
    
    // Verify no events are still missing venue
    const stillMissing = await events.countDocuments({ venue: { $exists: false } });
    if (stillMissing === 0) {
      console.log(`\n🎉 All events now have venue field!`);
    } else {
      console.log(`\n⚠️  ${stillMissing} events still missing venue field`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixEventLocations().catch(console.error);