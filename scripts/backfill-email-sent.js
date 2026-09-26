// scripts/backfill-email-sent.js
//
// Backfill metadata.emailSent=true for tickets that were created
// before the flag was being written.
//
// Signal we use: an Order for the same orderId has paymentStatus 'paid'
// OR the ticket has a qrCode set. Either one means the email route ran.
//
// Run dry:     node scripts/backfill-email-sent.js
// Run commit:  CONFIRM_BACKFILL=yes node scripts/backfill-email-sent.js

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local not found');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;
  const tickets = db.collection('mytickets');
  const orders = db.collection('orders');

  // Count missing
  const missing = await tickets.countDocuments({
    $or: [
      { 'metadata.emailSent': { $exists: false } },
      { 'metadata.emailSent': null },
    ],
  });
  console.log(`📊 Tickets missing metadata.emailSent: ${missing}`);

  if (missing === 0) {
    console.log('✅ Nothing to backfill');
    await mongoose.disconnect();
    return;
  }

  // ── Determine which of the missing should be flipped ──
  // Approach:
  //   1. Get all pending tickets that have an orderId
  //   2. Look up their orders
  //   3. If the order's paymentStatus is 'paid', mark the ticket as sent
  //
  // This is conservative: we only backfill when we're confident the
  // ticket was part of a completed purchase (which always triggers the
  // email route).

  const candidates = await tickets
    .find({
      $or: [
        { 'metadata.emailSent': { $exists: false } },
        { 'metadata.emailSent': null },
      ],
      orderId: { $exists: true, $ne: null },
    })
    .project({ _id: 1, orderId: 1, ticketNumber: 1, qrCode: 1 })
    .toArray();

  console.log(`🔎 Candidates with an orderId: ${candidates.length}`);

  const orderIds = [
    ...new Set(candidates.map((c) => String(c.orderId))),
  ].map((id) => new mongoose.Types.ObjectId(id));

  const paidOrders = await orders
    .find({
      _id: { $in: orderIds },
      paymentStatus: 'paid',
    })
    .project({ _id: 1 })
    .toArray();

  const paidOrderIdSet = new Set(paidOrders.map((o) => String(o._id)));

  const toBackfill = candidates.filter((c) =>
    paidOrderIdSet.has(String(c.orderId))
  );

  console.log(`✅ Confident backfill count: ${toBackfill.length}`);
  console.log(
    `   Skipping ${candidates.length - toBackfill.length} (order not paid)`
  );

  if (toBackfill.length === 0) {
    console.log('⚠️  No tickets to backfill');
    await mongoose.disconnect();
    return;
  }

  if (process.env.CONFIRM_BACKFILL !== 'yes') {
    console.log('');
    console.log('🛑 Dry run. To apply, re-run with:');
    console.log(
      '   CONFIRM_BACKFILL=yes node scripts/backfill-email-sent.js'
    );
    await mongoose.disconnect();
    return;
  }

  const ids = toBackfill.map((t) => t._id);

  const result = await tickets.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        'metadata.emailSent': true,
        'metadata.sentAt': new Date(),
        'metadata.emailSentBackfilled': true,
      },
    }
  );

  console.log(`✅ Backfilled ${result.modifiedCount} tickets`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});