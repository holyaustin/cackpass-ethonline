// /scripts/migrate-ticket-types.js
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function migrateTicketTypes() {
  console.log('🚀 Starting ticket type migration...\n');

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get models
    const Event = mongoose.model('Event', new mongoose.Schema({}, { strict: false }), 'events');
    const TicketType = mongoose.model('TicketType', new mongoose.Schema({}, { strict: false }), 'tickettypes');

    // Find all active events
    const events = await Event.find({ isActive: true }).lean();
    console.log(`📊 Found ${events.length} active events\n`);

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // Process each event
    for (const event of events) {
      console.log(`\n📋 Processing: "${event.title}"`);
      console.log(`   ID: ${event._id}`);
      console.log(`   Type: ${event.isFree ? 'FREE' : 'PAID'}`);
      console.log(`   Price: ${event.currency || 'USD'} ${event.price || 0}`);

      // Check if ticket type already exists
      const existingTicketTypes = await TicketType.find({ eventId: event._id }).lean();
      
      if (existingTicketTypes.length > 0) {
        console.log(`   ⏭️  Skipping: Already has ${existingTicketTypes.length} ticket type(s)`);
        skippedCount++;
        continue;
      }

      // Determine ticket type properties
      const ticketTypeName = `${event.title} - ${event.ticketType || (event.isFree ? 'Free Admission' : 'General Admission')}`;
      const ticketTypeCategory = event.ticketType || (event.isFree ? 'FreeAdmission' : 'GeneralAdmission');
      const ticketTypePrice = event.isFree ? 0 : (event.price || 0);
      
      // Calculate max supply
      let maxSupply = 0; // 0 = unlimited
      if (!event.isFree && !event.unlimitedCapacity && event.capacity) {
        maxSupply = parseInt(event.capacity) || 100;
      }

      // Create ticket type document
      const ticketTypeData = {
        eventId: event._id,
        name: ticketTypeName,
        description: `Ticket for ${event.title}`,
        category: ticketTypeCategory,
        price: ticketTypePrice,
        maxSupply: maxSupply,
        currentSupply: 0,
        isActive: true,
        createdAt: event.createdAt || new Date(),
        updatedAt: new Date()
      };

      // Add metadata if available
      if (event.metadataURI) {
        ticketTypeData.metadataURI = event.metadataURI;
      }

      // Save ticket type
      const ticketType = new TicketType(ticketTypeData);
      await ticketType.save();

      console.log(`   ✅ Created ticket type: ${ticketTypeName}`);
      console.log(`      Category: ${ticketTypeCategory}`);
      console.log(`      Price: ${event.currency || 'USD'} ${ticketTypePrice}`);
      console.log(`      Max Supply: ${maxSupply === 0 ? 'Unlimited' : maxSupply}`);

      createdCount++;
    }

    // Summary
    console.log('\n🎉 MIGRATION COMPLETE');
    console.log('====================');
    console.log(`Total Events Processed: ${events.length}`);
    console.log(`Ticket Types Created: ${createdCount}`);
    console.log(`Events Already Had Tickets: ${skippedCount}`);
    console.log(`Events Updated: ${updatedCount}`);

    // Find any remaining events without ticket types
    console.log('\n🔍 Checking for remaining issues...');
    const eventsWithoutTickets = await Event.aggregate([
      {
        $lookup: {
          from: 'tickettypes',
          localField: '_id',
          foreignField: 'eventId',
          as: 'ticketTypes'
        }
      },
      {
        $match: {
          ticketTypes: { $size: 0 },
          isActive: true
        }
      },
      {
        $project: {
          title: 1,
          _id: 1,
          isFree: 1,
          price: 1
        }
      }
    ]);

    if (eventsWithoutTickets.length > 0) {
      console.log(`⚠️  WARNING: ${eventsWithoutTickets.length} events still without ticket types:`);
      eventsWithoutTickets.forEach(e => {
        console.log(`   - "${e.title}" (${e._id}) - ${e.isFree ? 'Free' : 'Paid'}`);
      });
    } else {
      console.log('✅ All events now have ticket types!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run migration
migrateTicketTypes();