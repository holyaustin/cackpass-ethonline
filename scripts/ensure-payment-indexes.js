// scripts/ensure-payment-indexes.js
//
// Adds the indexes needed for the Arc registry + fiat anchoring flow.
// Safe to run multiple times — MongoDB skips existing indexes.
//
// Run: node scripts/ensure-payment-indexes.js

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// ─────────────────────────────────────────────────────────────
// Load .env.local (same pattern as other scripts in this repo)
// ─────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local not found at', envPath);
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
  console.log('📝 Loaded environment variables from .env.local');
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment');
  process.exit(1);
}

console.log(
  '🔗 Using MongoDB URI:',
  MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')
);

// ─────────────────────────────────────────────────────────────
// Indexes to ensure on the `payments` collection
// ─────────────────────────────────────────────────────────────
const PAYMENT_INDEXES = [
  // Existing core indexes (idempotent — safe to re-declare)
  {
    name: 'userId_1',
    key: { userId: 1 },
    options: {},
  },
  {
    name: 'eventId_1',
    key: { eventId: 1 },
    options: {},
  },
  {
    name: 'paymentReference_1',
    key: { paymentReference: 1 },
    options: { unique: true, sparse: true },
  },
  {
    name: 'paymentStatus_1',
    key: { paymentStatus: 1 },
    options: {},
  },
  {
    name: 'paymentMethod_1',
    key: { paymentMethod: 1 },
    options: {},
  },
  {
    name: 'createdAt_-1',
    key: { createdAt: -1 },
    options: {},
  },

  // ✅ NEW — Arc registry fields (sparse because most payments won't have them)
  {
    name: 'metadata_paymentTxHash_1',
    key: { 'metadata.paymentTxHash': 1 },
    options: { sparse: true },
  },
  {
    name: 'metadata_registryTxHash_1',
    key: { 'metadata.registryTxHash': 1 },
    options: { sparse: true },
  },
  {
    name: 'metadata_registryPaymentId_1',
    key: { 'metadata.registryPaymentId': 1 },
    options: { sparse: true },
  },
  {
    name: 'metadata_orderHash_1',
    key: { 'metadata.orderHash': 1 },
    options: { sparse: true },
  },

  // ✅ NEW — Fiat anchoring fields
  {
    name: 'metadata_anchorBatchId_1',
    key: { 'metadata.anchorBatchId': 1 },
    options: { sparse: true },
  },
  {
    name: 'metadata_anchorLabel_1',
    key: { 'metadata.anchorLabel': 1 },
    options: { sparse: true },
  },
  {
    name: 'metadata_anchoredAt_-1',
    key: { 'metadata.anchoredAt': -1 },
    options: { sparse: true },
  },

  // ✅ NEW — Compound index for the batcher's "find pending fiat records" query
  {
    name: 'anchor_pending_compound',
    key: {
      paymentMethod: 1,
      paymentStatus: 1,
      'metadata.anchorBatchId': 1,
    },
    options: {
      // no sparse — this is a full compound index the batcher depends on
    },
  },
];

// ─────────────────────────────────────────────────────────────
// Indexes to ensure on the `orders` collection (audit + lookups)
// ─────────────────────────────────────────────────────────────
const ORDER_INDEXES = [
  {
    name: 'paymentReference_1',
    key: { paymentReference: 1 },
    options: { sparse: true },
  },
  {
    name: 'metadata_paymentId_1',
    key: { 'metadata.paymentId': 1 },
    options: { sparse: true },
  },
];

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB connection not established');
  }

  const result = await ensureIndexesForCollection(db, 'payments', PAYMENT_INDEXES);
  console.log('');
  const result2 = await ensureIndexesForCollection(db, 'orders', ORDER_INDEXES);

  console.log('\n════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('════════════════════════════════════════════');
  console.log(`  payments: created ${result.created}, skipped ${result.skipped}, failed ${result.failed}`);
  console.log(`  orders:   created ${result2.created}, skipped ${result2.skipped}, failed ${result2.failed}`);
  console.log('════════════════════════════════════════════\n');

  // Show final state
  console.log('🔍 Final indexes on `payments`:');
  const paymentIndexes = await db.collection('payments').indexes();
  for (const idx of paymentIndexes) {
    console.log(`   • ${idx.name} → ${JSON.stringify(idx.key)}`);
  }

  console.log('\n🔍 Final indexes on `orders`:');
  const orderIndexes = await db.collection('orders').indexes();
  for (const idx of orderIndexes) {
    console.log(`   • ${idx.name} → ${JSON.stringify(idx.key)}`);
  }

  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB');
}

async function ensureIndexesForCollection(db, collectionName, indexes) {
  console.log(`\n════════════════════════════════════════════`);
  console.log(`📦 Collection: ${collectionName}`);
  console.log(`════════════════════════════════════════════`);

  const collection = db.collection(collectionName);

  // Get existing indexes
  let existing = [];
  try {
    existing = await collection.indexes();
  } catch (err) {
    if (err.code === 26) {
      console.log(`⚠️  Collection ${collectionName} does not exist yet — will create on first insert.`);
      return { created: 0, skipped: 0, failed: 0 };
    }
    throw err;
  }

  const existingNames = new Set(existing.map((i) => i.name));

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const idx of indexes) {
    if (existingNames.has(idx.name)) {
      console.log(`⏭️  Skipping existing index: ${idx.name}`);
      skipped++;
      continue;
    }

    try {
      await collection.createIndex(idx.key, {
        ...idx.options,
        name: idx.name,
      });
      console.log(`✅ Created index: ${idx.name}`);
      created++;
    } catch (err) {
      console.error(`❌ Failed to create ${idx.name}: ${err.message}`);
      failed++;
    }
  }

  return { created, skipped, failed };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });