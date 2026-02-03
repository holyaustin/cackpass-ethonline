// /scripts/migrate-ticket-types-dry-run.js
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function dryRunMigration() {
  console.log('🔍 DRY RUN - Checking for missing ticket types...\n');

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const Event = mongoose.model('Event', new mongoose.Schema({}, { strict: false }), 'events');
    const TicketType = mongoose.model('TicketType', new mongoose.Schema({}, { strict: false }), 'tickettypes');

    // Find events without ticket types
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
          price: 1,
          currency: 1,
          ticketType: 1,
          capacity: 1,
          unlimitedCapacity: 1,
          createdAt: 1
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    console.log(`📊 Found ${eventsWithoutTickets.length} events without ticket types:\n`);

    eventsWithoutTickets.forEach((event, index) => {
      console.log(`${index + 1}. "${event.title}"`);
      console.log(`   ID: ${event._id}`);
      console.log(`   Type: ${event.isFree ? 'FREE' : 'PAID'}`);
      console.log(`   Price: ${event.currency || 'USD'} ${event.price || 0}`);
      console.log(`   Ticket Type: ${event.ticketType || 'Not specified'}`);
      console.log(`   Capacity: ${event.unlimitedCapacity ? 'Unlimited' : (event.capacity || 'Not specified')}`);
      console.log(`   Created: ${new Date(event.createdAt).toLocaleDateString()}`);
      console.log('');
    });

    // Show what would be created
    if (eventsWithoutTickets.length > 0) {
      console.log('📝 TICKET TYPES THAT WOULD BE CREATED:\n');
      
      eventsWithoutTickets.forEach(event => {
        const ticketTypeName = `${event.title} - ${event.ticketType || (event.isFree ? 'Free Admission' : 'General Admission')}`;
        const ticketTypeCategory = event.ticketType || (event.isFree ? 'FreeAdmission' : 'GeneralAdmission');
        const ticketTypePrice = event.isFree ? 0 : (event.price || 0);
        let maxSupply = 0;
        
        if (!event.isFree && !event.unlimitedCapacity && event.capacity) {
          maxSupply = parseInt(event.capacity) || 100;
        }

        console.log(`For "${event.title}":`);
        console.log(`   Name: ${ticketTypeName}`);
        console.log(`   Category: ${ticketTypeCategory}`);
        console.log(`   Price: ${event.currency || 'USD'} ${ticketTypePrice}`);
        console.log(`   Max Supply: ${maxSupply === 0 ? 'Unlimited' : maxSupply}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Dry run failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

dryRunMigration();