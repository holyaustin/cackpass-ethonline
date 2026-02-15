// scripts/update-event-locations.js
const { MongoClient } = require('mongodb');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Real locations in Nigerian cities
const LOCATIONS = {
  abuja: [
    'Transcorp Hilton Abuja, 1 Aguiyi Ironsi Street, Maitama, Abuja',
    'International Conference Centre, Abuja, 900 Herbert Macaulay Way, Abuja',
    'Sheraton Abuja Hotel, Ladi Kwali Road, Wuse, Abuja',
    'Jabi Lake Mall, 1 Jabi Dam Road, Jabi, Abuja',
    'Abuja Stadium Complex, Moshood Abiola Way, Area 3, Abuja',
    'NICON Luxury Abuja, 123 Obafemi Awolowo Way, Abuja',
    'Fraser Suites Abuja, 15 Durham Street, Wuse 2, Abuja',
    'The Wells Carlton Hotel, 6 Yakubu Gowon Crescent, Asokoro, Abuja',
    'Abuja City Gate, Umaru Musa Yar\'Adua Expressway, Abuja',
    'Grand Pela Hotel, 15 IBB Way, Wuse Zone 4, Abuja'
  ],
  lagos: [
    'Eko Convention Centre, Eko Hotels & Suites, Victoria Island, Lagos',
    'Landmark Convention Centre, Plot 2 & 3 Water Corporation Road, Victoria Island, Lagos',
    'Federal Palace Hotel, 6-8 Ahmadu Bello Way, Victoria Island, Lagos',
    'The Civic Centre, Ozumba Mbadiwe Street, Victoria Island, Lagos',
    'Tafawa Balewa Square, 1 Catholic Mission Street, Lagos Island, Lagos',
    'Lagos Continental Hotel, 52A Kofo Abayomi Street, Victoria Island, Lagos',
    'Radisson Blu Anchorage Hotel, 1A Ozumba Mbadiwe Avenue, Victoria Island, Lagos',
    'Oriental Hotel, 3 Lekki Phase 1, Lekki-Epe Expressway, Lagos',
    'Four Points by Sheraton, 10 Close Eko Court, Victoria Island, Lagos',
    'The Wheatbaker Hotel, 4 Olutoye Crescent, Ikoyi, Lagos'
  ],
  kano: [
    'Tahir Guest Palace, 122/124 Muhammadu Buhari Way, Kano',
    'Bristol Palace Hotel, 2/4 Niger Street, Kano',
    'Prince Hotel Kano, 41 Maganda Road, Off Zaria Road, Kano',
    'City Garden Hotel, 1A/1C Club Road, Kano',
    'Grand Central Hotel Kano, 42 Ibrahim Taiwo Road, Kano',
    'MSS Guest Palace, No. 1 Katsina Road, Kano',
    'Royal Tropicana Hotel, 1A Post Office Road, Kano',
    'A.A. Musa Hotel, No. 41 Maganda Road, Kano',
    'Dala Hotel, 1 Club Road, Kano',
    'Kano State Library Complex, Zoo Road, Kano'
  ],
  enugu: [
    'Nike Lake Resort, Nike Lake Road, Enugu',
    'Hotel Sunshine Enugu, 2 Akpakpa Avenue, Independence Layout, Enugu',
    'Golden Royale Hotel, 13 Kenyatta Street, Uwani, Enugu',
    'Madonna Hotel, 2 Eze Street, Independence Layout, Enugu',
    'Lerato Hotels Enugu, 7 Kenyatta Street, Uwani, Enugu',
    'Vinegard Hotel, 45/47 Market Road, Enugu',
    'De Ultimate Hotel, 64 Zik Avenue, Uwani, Enugu',
    'Celebrity Hotel, 30 Presidential Road, Independence Layout, Enugu',
    'Hotel Angel Suites, 1/3 Ogui Road, Enugu',
    'Best Western Plus Elomaz Hotel, 4 Edinburgh Road, Enugu'
  ]
};

// Virtual meeting links
const VIRTUAL_LINKS = [
  'https://meet.google.com/abc-defg-hij',
  'https://meet.google.com/xyz-pqrs-tuv',
  'https://meet.google.com/lmn-opqr-stu',
  'https://zoom.us/j/1234567890',
  'https://zoom.us/j/0987654321',
  'https://teams.microsoft.com/l/meetup-join/abc123',
  'https://teams.microsoft.com/l/meetup-join/xyz789',
  'https://us02web.zoom.us/j/876543210',
  'https://meet.google.com/ghi-jklm-nop',
  'https://meet.google.com/qrs-tuvw-xyz'
];

// Helper function to get random item from array
function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper function to get random city
function getRandomCity() {
  const cities = ['abuja', 'lagos', 'kano', 'enugu'];
  return getRandomItem(cities);
}

// Helper function to get venue based on city
function getRandomVenue(city) {
  return getRandomItem(LOCATIONS[city]);
}

// Helper function to get virtual meeting link
function getRandomVirtualLink() {
  return getRandomItem(VIRTUAL_LINKS);
}

async function updateEventLocations() {
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

    // Find events with placeholder location
    const placeholderEvents = await events.find({
      $or: [
        { venue: 'Location to be announced' },
        { 'location.address': 'Location to be announced' },
        { venue: { $regex: /^Location to be announced/i } },
        { 'location.address': { $regex: /^Location to be announced/i } }
      ]
    }).toArray();

    console.log(`\n📊 Found ${placeholderEvents.length} events with placeholder locations`);

    let updatedCount = 0;
    let virtualCount = 0;

    for (const event of placeholderEvents) {
      const isVirtual = event.isVirtual || false;
      const eventId = event._id;
      
      let newVenue;
      let newAddress;
      
      if (isVirtual) {
        // Virtual event - use Google Meet/Zoom links
        newVenue = 'Virtual Event';
        newAddress = getRandomVirtualLink();
        virtualCount++;
        console.log(`\n🎥 Processing VIRTUAL event: ${event.title || 'Untitled'}`);
      } else {
        // Physical event - use random Nigerian location
        const city = getRandomCity();
        newVenue = getRandomVenue(city);
        newAddress = newVenue; // Same for address
        console.log(`\n📍 Processing event: ${event.title || 'Untitled'} (${city})`);
      }

      // Update the event
      const result = await events.updateOne(
        { _id: eventId },
        {
          $set: {
            venue: newVenue,
            'location.address': newAddress,
            updatedAt: new Date()
          }
        }
      );

      if (result.modifiedCount > 0) {
        updatedCount++;
        console.log(`   ✅ Updated: ${newVenue.substring(0, 50)}...`);
      } else {
        console.log(`   ⚠️  No changes made`);
      }
    }

    // Summary
    console.log(`\n🎉 UPDATE COMPLETE!`);
    console.log(`   Total events processed: ${placeholderEvents.length}`);
    console.log(`   Successfully updated: ${updatedCount}`);
    console.log(`   Virtual events: ${virtualCount}`);
    console.log(`   Physical events: ${placeholderEvents.length - virtualCount}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the update
updateEventLocations().catch(console.error);