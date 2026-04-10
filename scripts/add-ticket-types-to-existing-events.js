/**
 * Database Migration Script - Add Ticket Types to Existing Events
 * 
 * Run with: node scripts/add-ticket-types-to-existing-events.js
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

// Define schemas
const TicketTypeSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  name: { type: String, required: true },
  description: String,
  category: { 
    type: String, 
    enum: ['GeneralAdmission', 'ReservedSeating', 'VIPPremium', 'Others'],
    default: 'GeneralAdmission'
  },
  price: { type: Number, default: 0 },
  maxSupply: { type: Number, required: true },
  currentSupply: { type: Number, default: 0 },
  metadataURI: String,
  isActive: { type: Boolean, default: true },
  onChainCategoryId: Number,
}, { timestamps: true });

const EventSchema = new mongoose.Schema({
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizerWallet: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  venue: String,
  location: { address: String, lat: Number, lng: Number },
  isVirtual: { type: Boolean, default: false },
  virtualOptions: {
    zoomMeeting: { type: Boolean, default: false },
    googleMeet: { type: Boolean, default: false },
    hasVirtualLink: { type: Boolean, default: false },
    virtualLink: { type: String, default: '' }
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  startDateTime: { type: Date },
  endDateTime: { type: Date },
  category: { type: String, required: true },
  customCategory: { type: String },
  bannerImage: String,
  imageCid: String,
  metadataURI: String,
  metadataCid: String,
  isFree: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  ticketType: { 
    type: String, 
    enum: ['GeneralAdmission', 'ReservedSeating', 'VIPPremium', 'Others'],
    default: 'GeneralAdmission'
  },
  unlimitedCapacity: { type: Boolean, default: true },
  capacity: { type: Number },
  onChainId: { type: Number },
  isOnChain: { type: Boolean, default: false },
  transactionHash: { type: String },
  gaslessWallet: { type: String },
  ticketId: { type: Number },
  status: { 
    type: String, 
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'published'
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Create models if they don't exist
const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);
const TicketType = mongoose.models.TicketType || mongoose.model('TicketType', TicketTypeSchema);

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

async function addMissingTicketTypes() {
  try {
    console.log('🔌 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database');

    // Find all events
    const allEvents = await Event.find({});
    console.log(`📋 Found ${allEvents.length} total events`);

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const event of allEvents) {
      try {
        // Check if event already has ticket types
        const existingTicketTypes = await TicketType.find({ eventId: event._id });
        
        if (existingTicketTypes.length > 0) {
          console.log(`⏭️ Event "${event.title}" already has ${existingTicketTypes.length} ticket types, skipping...`);
          skippedCount++;
          continue;
        }

        console.log(`\n🎫 Creating ticket types for event: "${event.title}" (ID: ${event._id})`);
        console.log(`   - isFree: ${event.isFree}`);
        console.log(`   - price: ${event.price}`);
        console.log(`   - capacity: ${event.capacity || 'unlimited'}`);
        console.log(`   - ticketType: ${event.ticketType}`);

        // Determine ticket type name based on event's ticketType field
        let ticketTypeName = '';
        let category = '';
        let onChainCategoryId = 0;

        switch (event.ticketType) {
          case 'GeneralAdmission':
            ticketTypeName = 'General Admission';
            category = 'GeneralAdmission';
            onChainCategoryId = 0;
            break;
          case 'ReservedSeating':
            ticketTypeName = 'Reserved Seating';
            category = 'ReservedSeating';
            onChainCategoryId = 1;
            break;
          case 'VIPPremium':
            ticketTypeName = 'VIP Premium';
            category = 'VIPPremium';
            onChainCategoryId = 2;
            break;
          case 'Others':
            ticketTypeName = event.title;
            category = 'Others';
            onChainCategoryId = 3;
            break;
          default:
            ticketTypeName = 'General Admission';
            category = 'GeneralAdmission';
            onChainCategoryId = 0;
        }

        // Create ticket type
        const ticketTypeData = {
          eventId: event._id,
          name: ticketTypeName,
          description: `Ticket for ${event.title}`,
          category: category,
          price: event.isFree ? 0 : event.price,
          maxSupply: event.unlimitedCapacity ? 0 : (event.capacity || 100),
          currentSupply: 0,
          isActive: true,
          onChainCategoryId: onChainCategoryId,
        };

        console.log(`   📝 Creating ticket type: ${ticketTypeName} - $${ticketTypeData.price}`);

        const ticketType = new TicketType(ticketTypeData);
        await ticketType.save();
        
        console.log(`   ✅ Created ticket type: ${ticketType.name} (ID: ${ticketType._id})`);
        createdCount++;
        
      } catch (eventError) {
        console.error(`❌ Error processing event "${event.title}":`, eventError.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY:');
    console.log(`   - Total events processed: ${allEvents.length}`);
    console.log(`   - Ticket types created: ${createdCount}`);
    console.log(`   - Events skipped (already have tickets): ${skippedCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log('='.repeat(50));
    
    if (createdCount > 0) {
      console.log('\n✨ Migration completed successfully!');
      console.log('🔄 Refresh your event page to see the ticket options.');
    } else {
      console.log('\n⚠️ No new ticket types were created.');
    }
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Error adding ticket types:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
addMissingTicketTypes();