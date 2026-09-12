// scripts/cleanup-invalid-arc-payments.js
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load .env.local
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...rest] = trimmed.split('=');
        const value = rest.join('=');
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
    console.log('📝 Loaded environment variables from .env.local');
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

async function cleanup() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const paymentsCollection = db.collection('payments');

    // 1. Preview: count invalid arc_usdc payments
    const invalidFilter = {
      paymentMethod: 'arc_usdc',
      $or: [
        { paymentReference: { $exists: false } },
        { paymentReference: null },
        { paymentReference: '' },
      ],
    };

    const count = await paymentsCollection.countDocuments(invalidFilter);
    console.log(`\n📊 Found ${count} invalid arc_usdc payments`);

    if (count === 0) {
      console.log('✨ Nothing to clean up');
      return;
    }

    // 2. Show what will be deleted (first 10)
    console.log('\n📋 Sample records to be deleted:');
    const samples = await paymentsCollection
      .find(invalidFilter)
      .limit(10)
      .project({
        _id: 1,
        paymentReference: 1,
        paymentStatus: 1,
        'metadata.onChainPaymentId': 1,
        'metadata.transactionHash': 1,
        createdAt: 1,
      })
      .toArray();

    samples.forEach((doc, i) => {
      console.log(`  ${i + 1}. _id=${doc._id}`);
      console.log(`     reference=${doc.paymentReference}`);
      console.log(`     status=${doc.paymentStatus}`);
      console.log(`     createdAt=${doc.createdAt}`);
    });

    // 3. Delete
    console.log('\n🗑️  Deleting...');
    const result = await paymentsCollection.deleteMany(invalidFilter);
    console.log(`✅ Deleted ${result.deletedCount} invalid payments`);

    // 4. Verify
    const remaining = await paymentsCollection.countDocuments({
      paymentMethod: 'arc_usdc',
    });
    console.log(`\n📊 Remaining arc_usdc payments: ${remaining}`);

  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

cleanup();