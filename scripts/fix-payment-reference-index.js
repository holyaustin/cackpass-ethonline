// scripts/fix-payment-reference-index.js
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables
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

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found');
  process.exit(1);
}

async function fixIndexes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // ============================================
    // FIX 1: payments collection
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('🔧 FIXING: payments.paymentReference_1');
    console.log('='.repeat(60));

    const paymentsCollection = db.collection('payments');

    // Show current indexes
    console.log('\n📋 Current indexes:');
    const paymentIndexes = await paymentsCollection.indexes();
    paymentIndexes.forEach(idx => {
      console.log(`   - ${idx.name}`, {
        key: idx.key,
        unique: idx.unique || false,
        sparse: idx.sparse || false,
      });
    });

    // Count null paymentReferences
    const nullCount = await paymentsCollection.countDocuments({
      $or: [
        { paymentReference: null },
        { paymentReference: { $exists: false } },
      ],
    });
    console.log(`\n📊 Documents with null/missing paymentReference: ${nullCount}`);

    // Check if the current index is sparse
    const existingPRIndex = paymentIndexes.find(idx => idx.name === 'paymentReference_1');
    
    if (existingPRIndex) {
      console.log(`\n⚠️  Existing index:`, {
        name: existingPRIndex.name,
        unique: existingPRIndex.unique,
        sparse: existingPRIndex.sparse,
      });

      if (existingPRIndex.unique && !existingPRIndex.sparse && nullCount > 1) {
        console.log(`\n❌ PROBLEM FOUND: Index is unique but NOT sparse, and there are ${nullCount} null values`);
        console.log('   This causes the E11000 duplicate key error\n');
      }

      // Drop the old index
      console.log(`🗑️  Dropping index: ${existingPRIndex.name}...`);
      await paymentsCollection.dropIndex(existingPRIndex.name);
      console.log('   ✅ Dropped');
    }

    // Recreate with correct options
    console.log('\n🔨 Creating new index with sparse: true...');
    await paymentsCollection.createIndex(
      { paymentReference: 1 },
      { 
        unique: true, 
        sparse: true,
        name: 'paymentReference_1'
      }
    );
    console.log('   ✅ Created');

    // Verify
    const newIndexes = await paymentsCollection.indexes();
    const newPRIndex = newIndexes.find(idx => idx.name === 'paymentReference_1');
    console.log('\n✅ New index:', {
      name: newPRIndex.name,
      key: newPRIndex.key,
      unique: newPRIndex.unique,
      sparse: newPRIndex.sparse,
    });

    // ============================================
    // FIX 2: Check other collections for similar issues
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('🔍 CHECKING: other collections');
    console.log('='.repeat(60));

    const collectionsToCheck = [
      { name: 'orders', field: 'paymentReference' },
      { name: 'mytickets', field: 'ticketNumber' },
      { name: 'gaslessapprovals', field: 'approvalId' },
      { name: 'users', field: 'email' },
      { name: 'users', field: 'walletAddress' },
      { name: 'wallettransactions', field: 'transactionHash' },
    ];

    for (const { name, field } of collectionsToCheck) {
      try {
        const collection = db.collection(name);
        const indexes = await collection.indexes();
        
        const targetIndex = indexes.find(idx => 
          idx.key[field] === 1 && Object.keys(idx.key).length === 1
        );

        if (targetIndex && targetIndex.unique && !targetIndex.sparse) {
          // Count nulls for this field
          const fieldNullCount = await collection.countDocuments({
            $or: [
              { [field]: null },
              { [field]: { $exists: false } },
            ],
          });

          if (fieldNullCount > 1) {
            console.log(`\n⚠️  ${name}.${field}: ${fieldNullCount} nulls with non-sparse unique index`);
            console.log(`   Dropping and recreating as sparse...`);

            await collection.dropIndex(targetIndex.name);
            await collection.createIndex(
              { [field]: 1 },
              { unique: true, sparse: true, name: targetIndex.name }
            );
            console.log(`   ✅ Fixed ${name}.${field}`);
          } else {
            console.log(`   ✓ ${name}.${field}: OK (${fieldNullCount} nulls)`);
          }
        } else if (targetIndex) {
          console.log(`   ✓ ${name}.${field}: OK (already sparse or not unique)`);
        } else {
          console.log(`   ℹ️  ${name}.${field}: no index found`);
        }
      } catch (err) {
        if (err.code === 26) {
          // Collection doesn't exist
          console.log(`   ℹ️  ${name}: collection doesn't exist`);
        } else {
          console.log(`   ⚠️  ${name}.${field}: ${err.message}`);
        }
      }
    }

    // ============================================
    // FINAL SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL FIXES COMPLETE');
    console.log('='.repeat(60));
    console.log('\n📝 Summary:');
    console.log('   - payments.paymentReference_1 is now sparse');
    console.log('   - All other collections checked');
    console.log('\n🎉 Restart your dev server and retry the payment');

  } catch (error) {
    console.error('\n❌ Fix error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

fixIndexes();