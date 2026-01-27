// scripts/test-event-creation.js
const mongoose = require('mongoose')

// Test event data matching frontend structure
const testFreeEvent = {
  title: 'Test Free Concert',
  description: 'A test free concert event',
  category: 'music',
  location: 'Test Venue, Lagos',
  startDate: '2024-12-25',
  startTime: '18:00',
  endDate: '2024-12-25',
  endTime: '22:00',
  isFree: true,
  unlimitedCapacity: true,
  organizerWallet: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  currency: 'USD',
  status: 'published',
  organizerId: new mongoose.Types.ObjectId() // Use actual user ID in production
}

const testPaidEvent = {
  title: 'VIP Tech Conference',
  description: 'Annual tech conference with VIP access',
  category: 'business',
  location: 'Virtual Conference',
  startDate: '2024-12-26',
  startTime: '09:00',
  endDate: '2024-12-26',
  endTime: '17:00',
  isFree: false,
  priceAmount: '99.99',
  currency: 'USD',
  ticketType: 'VIPPremium',
  unlimitedCapacity: false,
  capacity: '200',
  organizerWallet: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  isVirtual: true,
  transactionHash: '0x1234567890abcdef',
  isOnChain: true,
  imageCid: 'QmTestImage123',
  metadataCid: 'QmTestMetadata456',
  status: 'published',
  organizerId: new mongoose.Types.ObjectId()
}

async function testDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test')
    
    // Load models
    const { Event, TicketType } = require('@/lib/database/models')
    
    console.log('Testing Event creation...')
    
    // Test 1: Create free event
    console.log('\n1. Creating free event...')
    const freeEvent = new Event(testFreeEvent)
    await freeEvent.save()
    console.log('✅ Free event created:', {
      id: freeEvent._id,
      title: freeEvent.title,
      isFree: freeEvent.isFree,
      isOnChain: freeEvent.isOnChain
    })
    
    // Test 2: Create paid event
    console.log('\n2. Creating paid event...')
    const paidEvent = new Event(testPaidEvent)
    await paidEvent.save()
    console.log('✅ Paid event created:', {
      id: paidEvent._id,
      title: paidEvent.title,
      isFree: paidEvent.isFree,
      isOnChain: paidEvent.isOnChain,
      ticketType: paidEvent.ticketType
    })
    
    // Test 3: Create TicketType for paid event
    console.log('\n3. Creating TicketType for paid event...')
    const ticketType = new TicketType({
      eventId: paidEvent._id,
      name: `${paidEvent.title} - ${paidEvent.ticketType}`,
      description: `Ticket for ${paidEvent.title}`,
      category: paidEvent.ticketType,
      price: paidEvent.price,
      maxSupply: paidEvent.capacity,
      currentSupply: 0,
      isActive: true
    })
    await ticketType.save()
    console.log('✅ TicketType created:', {
      name: ticketType.name,
      category: ticketType.category,
      price: ticketType.price,
      maxSupply: ticketType.maxSupply
    })
    
    // Test 4: Query events
    console.log('\n4. Querying all events...')
    const events = await Event.find({}).sort({ createdAt: -1 })
    console.log(`✅ Found ${events.length} events:`)
    events.forEach(event => {
      console.log(`  - ${event.title} (${event.isFree ? 'Free' : 'Paid'})`)
    })
    
    console.log('\n✅ All tests passed!')
    
    // Cleanup (optional)
    console.log('\nCleaning up test data...')
    await Event.deleteMany({ title: { $in: ['Test Free Concert', 'VIP Tech Conference'] } })
    await TicketType.deleteMany({ name: /Test Free Concert|VIP Tech Conference/ })
    console.log('✅ Cleanup complete')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

// Run tests
if (require.main === module) {
  // Set environment variable for testing
  if (!process.env.MONGODB_URI) {
    console.warn('MONGODB_URI not set. Using local MongoDB...')
    process.env.MONGODB_URI = 'mongodb://localhost:27017/ticketing-test'
  }
  
  testDatabase()
}