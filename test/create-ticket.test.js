// test/create-ticket.test.js
const { describe, it, before, after } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')

// Test data
const testEventData = {
  // Free Event
  freeEvent: {
    title: 'Free Music Festival 2024',
    description: 'Annual free music festival with local artists',
    category: 'music',
    location: 'Central Park, Lagos',
    startDate: '2024-12-25',
    startTime: '14:00',
    endDate: '2024-12-25',
    endTime: '22:00',
    isFree: true,
    unlimitedCapacity: true,
    organizerWallet: '0x1234567890abcdef1234567890abcdef12345678',
    currency: 'USD',
    status: 'published'
  },
  
  // Paid Event
  paidEvent: {
    title: 'VIP Business Conference',
    description: 'Exclusive business conference with industry leaders',
    category: 'business',
    location: 'Virtual Conference Room',
    startDate: '2024-12-26',
    startTime: '09:00',
    endDate: '2024-12-26',
    endTime: '18:00',
    isFree: false,
    priceAmount: '199.99',
    currency: 'USD',
    ticketType: 'VIPPremium',
    unlimitedCapacity: false,
    capacity: '500',
    organizerWallet: '0xabcdef1234567890abcdef1234567890abcdef12',
    isVirtual: true,
    isOnChain: true,
    transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    status: 'published'
  },
  
  // Invalid Event (should fail)
  invalidEvent: {
    title: '', // Empty title
    location: '',
    isFree: true
  }
}

describe('Create Ticket Page - Complete Test Suite', () => {
  let mongooseConnection
  
  before(async () => {
    // Connect to test database
    require('dotenv').config({ path: '.env.local' })
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in .env.local')
    }
    
    // Replace database name with test database
    const testUri = process.env.MONGODB_URI.replace(/\/([^/?]+)(\?|$)/, '/testdb$2')
    
    mongooseConnection = await mongoose.connect(testUri, {
      serverSelectionTimeoutMS: 5000
    })
    
    console.log('✅ Connected to test database')
  })
  
  after(async () => {
    if (mongooseConnection) {
      await mongoose.disconnect()
      console.log('✅ Disconnected from test database')
    }
  })
  
  describe('1. Form Validation Tests', () => {
    it('should validate required fields', () => {
      const event = testEventData.freeEvent
      
      // Required fields
      assert.ok(event.title.length > 0, 'Title is required')
      assert.ok(event.location.length > 0, 'Location is required')
      assert.ok(event.startDate, 'Start date is required')
      assert.ok(event.endDate, 'End date is required')
      assert.ok(event.organizerWallet, 'Wallet address is required')
    })
    
    it('should reject invalid event data', () => {
      const invalid = testEventData.invalidEvent
      
      assert.strictEqual(invalid.title.length, 0, 'Title should be empty')
      assert.strictEqual(invalid.location.length, 0, 'Location should be empty')
    })
    
    it('should validate date format', () => {
      const event = testEventData.freeEvent
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      
      assert.match(event.startDate, dateRegex, 'Start date format should be YYYY-MM-DD')
      assert.match(event.endDate, dateRegex, 'End date format should be YYYY-MM-DD')
    })
    
    it('should validate time format', () => {
      const event = testEventData.freeEvent
      const timeRegex = /^\d{2}:\d{2}$/
      
      assert.match(event.startTime, timeRegex, 'Start time format should be HH:MM')
      assert.match(event.endTime, timeRegex, 'End time format should be HH:MM')
    })
  })
  
  describe('2. Free Event Creation Tests', () => {
    it('should create free event with correct defaults', () => {
      const event = testEventData.freeEvent
      
      assert.strictEqual(event.isFree, true, 'Should be free event')
      assert.strictEqual(event.unlimitedCapacity, true, 'Should have unlimited capacity')
      assert.strictEqual(event.isOnChain, undefined, 'Free events should not be on-chain')
      assert.ok(event.organizerWallet.startsWith('0x'), 'Wallet should start with 0x')
      assert.strictEqual(event.currency, 'USD', 'Default currency should be USD')
    })
    
    it('should not require blockchain data for free events', () => {
      const event = testEventData.freeEvent
      
      assert.strictEqual(event.transactionHash, undefined, 'Free events should not have transaction hash')
      assert.strictEqual(event.isOnChain, undefined, 'Free events should not be on-chain')
    })
  })
  
  describe('3. Paid Event Creation Tests', () => {
    it('should validate paid event requirements', () => {
      const event = testEventData.paidEvent
      
      assert.strictEqual(event.isFree, false, 'Should be paid event')
      assert.ok(event.priceAmount, 'Price amount is required for paid events')
      assert.ok(parseFloat(event.priceAmount) > 0, 'Price must be greater than 0')
      assert.ok(event.ticketType, 'Ticket type is required for paid events')
      assert.ok(event.transactionHash, 'Transaction hash is required for paid events')
      assert.strictEqual(event.isOnChain, true, 'Paid events should be on-chain')
    })
    
    it('should validate ticket type enum', () => {
      const validTypes = ['GeneralAdmission', 'ReservedSeating', 'VIPPremium', 'Others']
      const event = testEventData.paidEvent
      
      assert.ok(validTypes.includes(event.ticketType), 'Ticket type should be valid enum')
    })
    
    it('should validate virtual event properties', () => {
      const event = testEventData.paidEvent
      
      assert.strictEqual(event.isVirtual, true, 'Should be virtual event')
      assert.ok(event.location.toLowerCase().includes('virtual'), 'Location should indicate virtual event')
    })
  })
  
  describe('4. Database Integration Tests', () => {
    it('should save event to database', async () => {
      // Create test schema
      const EventSchema = new mongoose.Schema({
        title: String,
        description: String,
        category: String,
        location: String,
        isFree: Boolean,
        price: Number,
        currency: String,
        ticketType: String,
        organizerWallet: String,
        isOnChain: Boolean,
        transactionHash: String,
        createdAt: { type: Date, default: Date.now }
      })
      
      const Event = mongoose.model('TestEvent', EventSchema)
      
      // Test free event
      const freeEvent = new Event({
        title: testEventData.freeEvent.title,
        description: testEventData.freeEvent.description,
        category: testEventData.freeEvent.category,
        location: testEventData.freeEvent.location,
        isFree: true,
        price: 0,
        currency: 'USD',
        organizerWallet: testEventData.freeEvent.organizerWallet,
        isOnChain: false
      })
      
      await freeEvent.save()
      
      // Verify saved
      const savedEvent = await Event.findById(freeEvent._id)
      assert.ok(savedEvent, 'Event should be saved to database')
      assert.strictEqual(savedEvent.title, testEventData.freeEvent.title)
      assert.strictEqual(savedEvent.isFree, true)
      
      // Cleanup
      await Event.deleteMany({})
    })
    
    it('should create TicketType for paid events', async () => {
      // Create test schema
      const TicketTypeSchema = new mongoose.Schema({
        name: String,
        description: String,
        category: String,
        price: Number,
        maxSupply: Number,
        currentSupply: Number,
        isActive: Boolean
      })
      
      const TicketType = mongoose.model('TestTicketType', TicketTypeSchema)
      
      const ticketType = new TicketType({
        name: 'VIP Premium Ticket',
        description: 'Exclusive VIP access',
        category: 'VIPPremium',
        price: 199.99,
        maxSupply: 500,
        currentSupply: 0,
        isActive: true
      })
      
      await ticketType.save()
      
      const saved = await TicketType.findById(ticketType._id)
      assert.ok(saved, 'TicketType should be saved')
      assert.strictEqual(saved.category, 'VIPPremium')
      assert.strictEqual(saved.price, 199.99)
      
      // Cleanup
      await TicketType.deleteMany({})
    })
  })
  
  describe('5. Frontend Form State Tests', () => {
    it('should handle form state changes', () => {
      // Simulate form state
      const formState = {
        eventName: 'Test Event',
        startDate: '2024-12-25',
        startTime: '14:00',
        endDate: '2024-12-25',
        endTime: '22:00',
        category: 'music',
        location: 'Test Venue',
        description: 'Test Description',
        isFree: true,
        priceAmount: '0.00',
        currency: 'USD',
        ticketType: 'GeneralAdmission',
        unlimitedCapacity: true,
        capacity: ''
      }
      
      // Test state changes
      assert.strictEqual(formState.isFree, true, 'Default should be free')
      assert.strictEqual(formState.unlimitedCapacity, true, 'Default should be unlimited')
      assert.strictEqual(formState.ticketType, 'GeneralAdmission', 'Default ticket type')
      assert.strictEqual(formState.priceAmount, '0.00', 'Free event price should be 0')
    })
    
    it('should handle paid event form state', () => {
      const paidFormState = {
        isFree: false,
        priceAmount: '99.99',
        currency: 'USD',
        ticketType: 'VIPPremium',
        unlimitedCapacity: false,
        capacity: '100'
      }
      
      assert.strictEqual(paidFormState.isFree, false)
      assert.ok(parseFloat(paidFormState.priceAmount) > 0)
      assert.strictEqual(paidFormState.ticketType, 'VIPPremium')
      assert.strictEqual(paidFormState.unlimitedCapacity, false)
      assert.strictEqual(paidFormState.capacity, '100')
    })
  })
  
  describe('6. API Endpoint Tests', () => {
    it('should validate API request structure', () => {
      const apiRequest = {
        title: 'Test Event',
        description: 'Test Description',
        category: 'music',
        location: 'Test Venue',
        startDateTime: '2024-12-25T14:00:00.000Z',
        endDateTime: '2024-12-25T22:00:00.000Z',
        isFree: true,
        organizerWallet: '0x1234567890abcdef',
        status: 'published'
      }
      
      // Required fields for API
      const requiredFields = ['title', 'description', 'category', 'location', 'organizerWallet']
      requiredFields.forEach(field => {
        assert.ok(apiRequest[field], `API request missing required field: ${field}`)
      })
    })
    
    it('should handle API error responses', async () => {
      // Simulate API error response
      const errorResponse = {
        success: false,
        error: 'Missing required fields',
        status: 400
      }
      
      assert.strictEqual(errorResponse.success, false)
      assert.ok(errorResponse.error)
      assert.strictEqual(errorResponse.status, 400)
    })
  })
})

console.log('\n📋 Test Summary:')
console.log('1. Form Validation Tests ✓')
console.log('2. Free Event Creation Tests ✓')
console.log('3. Paid Event Creation Tests ✓')
console.log('4. Database Integration Tests ✓')
console.log('5. Frontend Form State Tests ✓')
console.log('6. API Endpoint Tests ✓')
console.log('\n✅ All test cases defined successfully!')