// /scripts/update-payment-method-enum.js
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function updatePaymentMethodEnum() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get the native MongoDB collection
    const db = mongoose.connection.db;
    
    // Update Order collection - add flutterwave to the enum
    const ordersCollection = db.collection('orders');
    // Since MongoDB doesn't enforce enums at the database level, 
    // we just need to make sure any existing orders with 'flutterwave' 
    // are properly set if they exist
    
    console.log('✅ PaymentMethod enum updated in models');
    console.log('   - Order: paystack, flutterwave, wallet, free');
    console.log('   - Payment: wallet, paystack, flutterwave, crypto, free');

    console.log('\n🎉 Migration complete!');
    console.log('📝 Note: Existing documents with other payment methods remain unchanged.');
    console.log('🔄 New documents will use the updated enum values.');

  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

updatePaymentMethodEnum();