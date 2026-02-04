// lib/database/models.ts - COMPLETE FIX (NO DUPLICATE INDEXES)
import mongoose from 'mongoose'

// ========================
// IMPORTANT: Remove ALL field-level index definitions
// Define indexes ONLY at the schema level using .index()
// ========================

// User Schema - NO field-level indexes
const UserSchema = new mongoose.Schema({
  privyId: { type: String, required: true }, // Remove unique: true
  walletAddress: { type: String, default: null },
  loginMethod: { 
    type: String, 
    enum: ['email', 'google', 'twitter'], 
    required: true 
  },
  email: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  username: { type: String },
  isOrganizer: { type: Boolean, default: false },
  country: { type: String, default: '' },
  phoneNumber: { type: String, default: '' },
  isProfileComplete: { type: Boolean, default: false },
  admin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, {
  timestamps: true // Enable automatic timestamps
})

// UserProfile Schema - NO field-level indexes
const UserProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  firstName: { type: String },
  lastName: { type: String },
  bio: { type: String, default: '' },
  location: { type: String, default: '' },
  dateOfBirth: { type: Date, default: null },
  interests: [{ type: String }],
  profilePicture: { type: String, default: '' },
}, {
  timestamps: true
})

// Event Schema - NO field-level indexes
const EventSchema = new mongoose.Schema({
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizerWallet: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  venue: String,
  location: {
    lat: Number,
    lng: Number,
    address: String,
  },
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
  onChainId: { type: Number }, // Remove sparse: true
  isOnChain: { type: Boolean, default: false },
  transactionHash: { type: String }, // Remove sparse: true
  gaslessWallet: { type: String },
  ticketId: { type: Number },
  status: { 
    type: String, 
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'published'
  },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true
})

// TicketType Schema - NO field-level indexes
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
}, {
  timestamps: true
})

// Order Schema - NO field-level indexes
const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  ticketTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketType', required: true },
  quantity: { type: Number, required: true, min: 1 },
  totalAmount: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: ['NGN', 'USD', 'ETH', 'USDC'], default: 'NGN' },
  paymentMethod: { type: String, enum: ['paystack', 'wallet', 'free'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  paymentReference: String,
  mintStatus: { type: String, enum: ['pending', 'minted', 'failed'], default: 'pending' },
  transactionHash: String,
  ticketIds: { type: [String], default: [] },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: true
})

// Payment Schema - NO field-level indexes
const PaymentSchema = new mongoose.Schema({
  paymentMethod: { type: String, enum: ['wallet', 'paystack', 'crypto', 'free'], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  walletAddress: { 
    type: String,
    required: function() {
      return this.paymentMethod === 'wallet' || this.paymentMethod === 'crypto';
    }
  },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  quantity: { type: Number, required: true, default: 1 },
  ticketTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketType' },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  paymentReference: { type: String, required: false }, // Remove unique: true
  approvalId: { type: String },
  signature: { type: String },
  transactionHash: { type: String },
  signatureData: { type: mongoose.Schema.Types.Mixed },
  validUntil: { type: Date },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: true
})

// MyTicket Schema - NO field-level indexes
const myTicketSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  ticketTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketType', required: true },
  ticketNumber: { type: String, required: true }, // Remove unique: true
  qrCode: { type: String, default: '' },
  qrCodeCid: { type: String, default: '' },
  status: {
    type: String,
    enum: ['active', 'used', 'transferred', 'cancelled', 'refunded', 'transferred_complete'],
    default: 'active'
  },
  transferredTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  transferredAt: { type: Date },
  usedAt: { type: Date },
  seatNumber: { type: String },
  zone: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: true
})

// TransferHistory Schema - NO field-level indexes
const TransferHistorySchema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'MyTicket', required: true },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'cancelled', 'rejected'], default: 'pending' },
  ticketNumber: { type: String, required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  ticketTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketType' },
  transferredAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date },
  cancelledAt: { type: Date },
  rejectedAt: { type: Date },
  reason: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: true
})

// GaslessApproval Schema - NO field-level indexes
const GaslessApprovalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  ticketTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketType' },
  amount: { type: Number, required: true, min: 1 },
  price: { 
    type: Number, 
    required: true,
    min: 0,
    set: function(val: any) {
      if (typeof val === 'bigint') {
        const bigIntVal = Number(val)
        return bigIntVal > 1e12 ? bigIntVal / 1e18 : bigIntVal
      } else if (typeof val === 'string') {
        if (val.endsWith('n')) val = val.slice(0, -1)
        const numVal = parseFloat(val)
        if (isNaN(numVal)) return 0
        return numVal > 1e12 ? numVal / 1e18 : numVal
      }
      return val
    }
  },
  currency: { type: String, default: 'USD' },
  approvalId: { type: String, required: true }, // Remove unique: true
  signature: { type: String, required: true },
  recipient: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v: string) {
        return /^0x[a-fA-F0-9]{40}$/.test(v)
      },
      message: 'Invalid Ethereum address'
    }
  },
  validUntil: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'used', 'expired', 'cancelled'], default: 'pending' },
  usedAt: { type: Date },
  transactionHash: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: true
})

// Wallet Transaction Schema - NO field-level indexes
const WalletTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  walletAddress: { type: String, required: true },
  type: { type: String, enum: ['deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'refund', 'fee'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['ETH', 'USDC', 'USDT'], required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending' },
  transactionHash: { type: String }, // Remove unique: true
  blockNumber: { type: Number },
  fromAddress: { type: String },
  toAddress: { type: String },
  gasUsed: { type: Number },
  gasPrice: { type: Number },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  confirmedAt: { type: Date },
}, {
  timestamps: true
})

// Other schemas (shortened for brevity - apply same pattern)
const WhitelistSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  merkleRoot: { type: String, required: true },
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    address: String,
    proof: [String],
    registeredAt: { type: Date, default: Date.now },
  }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

const MarketListingSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ticketId: { type: Number, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  onChainListingId: Number,
}, { timestamps: true })

const PayoutSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  totalAmount: { type: Number, required: true },
  platformFee: { type: Number, required: true },
  organizerAmount: { type: Number, required: true },
  transactionHash: String,
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  processedAt: Date,
}, { timestamps: true })

const CheckInSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  ticketId: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scannerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  checkedInAt: { type: Date, default: Date.now },
  location: { lat: Number, lng: Number, accuracy: Number },
  isVerified: { type: Boolean, default: false },
}, { timestamps: true })

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['purchase', 'transfer', 'resale', 'event', 'system'], default: 'system' },
  isRead: { type: Boolean, default: false },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true })

const ResaleListingSchema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'MyTicket', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  price: { type: Number, required: true },
  currency: { type: String, enum: ['NGN', 'USD', 'ETH', 'USDC'], default: 'NGN' },
  status: { type: String, enum: ['active', 'sold', 'cancelled', 'expired'], default: 'active' },
  expiresAt: { type: Date },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  soldAt: { type: Date },
  transactionHash: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true })

const ResalePurchaseSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResaleListing', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'MyTicket', required: true },
  price: { type: Number, required: true },
  currency: { type: String, enum: ['NGN', 'USD', 'ETH', 'USDC'], default: 'NGN' },
  paymentMethod: { type: String, enum: ['crypto', 'paystack', 'flutterwave'], required: true },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  paymentReference: { type: String },
  transactionHash: { type: String },
  serviceFee: { type: Number, default: 0 },
  sellerAmount: { type: Number },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true })

const TransactionLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['ticket_purchase', 'ticket_transfer', 'resale_purchase', 'resale_listing', 'withdrawal', 'deposit'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['NGN', 'USD', 'ETH', 'USDC'], default: 'NGN' },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'pending' },
  referenceId: { type: String },
  transactionHash: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  description: { type: String },
}, { timestamps: true })

const BackendSignerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true }, // Remove unique: true
  contractType: { type: String, enum: ['CackPassCore', 'TicketMarket', 'RoyaltyEngine', 'VoucherVerifier'], required: true },
  privateKeyEncrypted: { type: String },
  isActive: { type: Boolean, default: true },
  lastUsed: { type: Date },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true })

// ========================
// INDEXES - Define ALL indexes here (NOT in field definitions)
// ========================

// Only create indexes if model is being created for the first time
const createIndexes = (schema: mongoose.Schema, indexes: Array<[any, any?]>) => {
  // Only create indexes if they don't already exist
  if (schema.indexes().length === 0) {
    indexes.forEach(([fields, options]) => {
      schema.index(fields, options)
    })
  }
}

// User indexes
createIndexes(UserSchema, [
  [{ privyId: 1 }, { unique: true }],
  [{ walletAddress: 1 }, { sparse: true }],
  [{ email: 1 }, { sparse: true }],
  [{ isOrganizer: 1 }],
])

// UserProfile indexes
createIndexes(UserProfileSchema, [
  [{ userId: 1 }, { unique: true }],
])

// Event indexes
createIndexes(EventSchema, [
  [{ onChainId: 1 }, { sparse: true }],
  [{ organizerWallet: 1 }],
  [{ status: 1 }],
  [{ startDate: 1 }],
  [{ category: 1 }],
  [{ isFree: 1 }],
  [{ createdAt: -1 }],
])

// Payment indexes
createIndexes(PaymentSchema, [
  [{ userId: 1 }],
  [{ eventId: 1 }],
  [{ paymentReference: 1 }, { unique: true, sparse: true }],
  [{ paymentStatus: 1 }],
  [{ approvalId: 1 }, { sparse: true }],
  [{ transactionHash: 1 }, { sparse: true }],
  [{ createdAt: -1 }],
])

// MyTicket indexes
createIndexes(myTicketSchema, [
  [{ userId: 1 }],
  [{ eventId: 1 }],
  [{ orderId: 1 }],
  [{ ticketNumber: 1 }, { unique: true }],
  [{ status: 1 }],
  [{ createdAt: -1 }],
])

// TransferHistory indexes
createIndexes(TransferHistorySchema, [
  [{ fromUserId: 1, status: 1 }],
  [{ toUserId: 1, status: 1 }],
  [{ ticketId: 1 }],
  [{ ticketNumber: 1 }],
  [{ createdAt: -1 }],
])

// GaslessApproval indexes
createIndexes(GaslessApprovalSchema, [
  [{ approvalId: 1 }, { unique: true }],
  [{ userId: 1 }],
  [{ eventId: 1 }],
  [{ status: 1 }],
  [{ validUntil: 1 }],
  [{ createdAt: -1 }],
])

// WalletTransaction indexes
createIndexes(WalletTransactionSchema, [
  [{ userId: 1 }],
  [{ walletAddress: 1 }],
  [{ transactionHash: 1 }, { unique: true, sparse: true }],
  [{ type: 1, status: 1 }],
  [{ createdAt: -1 }],
])

// Order indexes
createIndexes(OrderSchema, [
  [{ userId: 1 }],
  [{ eventId: 1 }],
  [{ paymentStatus: 1 }],
  [{ mintStatus: 1 }],
  [{ createdAt: -1 }],
])

// TicketType indexes
createIndexes(TicketTypeSchema, [
  [{ eventId: 1 }],
  [{ isActive: 1 }],
  [{ category: 1 }],
])

// Other schema indexes
createIndexes(WhitelistSchema, [[{ eventId: 1 }], [{ isActive: 1 }]])
createIndexes(MarketListingSchema, [[{ sellerId: 1 }], [{ ticketId: 1 }], [{ isActive: 1 }]])
createIndexes(PayoutSchema, [[{ eventId: 1 }], [{ organizerId: 1 }], [{ status: 1 }]])
createIndexes(CheckInSchema, [[{ eventId: 1 }], [{ ticketId: 1 }], [{ userId: 1 }]])
createIndexes(NotificationSchema, [[{ userId: 1 }], [{ isRead: 1 }], [{ type: 1 }]])
createIndexes(ResaleListingSchema, [[{ ticketId: 1, status: 1 }], [{ sellerId: 1 }], [{ createdAt: -1 }]])
createIndexes(ResalePurchaseSchema, [[{ listingId: 1 }], [{ buyerId: 1 }], [{ ticketId: 1 }]])
createIndexes(TransactionLogSchema, [[{ userId: 1, type: 1 }], [{ status: 1 }], [{ createdAt: -1 }]])
createIndexes(BackendSignerSchema, [[{ address: 1 }, { unique: true }], [{ contractType: 1 }]])

// ========================
// PREVENT MODEL OVERWRITE
// ========================
export const User = mongoose.models.User || mongoose.model('User', UserSchema)
export const UserProfile = mongoose.models.UserProfile || mongoose.model('UserProfile', UserProfileSchema)
export const Event = mongoose.models.Event || mongoose.model('Event', EventSchema)
export const TicketType = mongoose.models.TicketType || mongoose.model('TicketType', TicketTypeSchema)
export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema)
export const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema)
export const Whitelist = mongoose.models.Whitelist || mongoose.model('Whitelist', WhitelistSchema)
export const MarketListing = mongoose.models.MarketListing || mongoose.model('MarketListing', MarketListingSchema)
export const Payout = mongoose.models.Payout || mongoose.model('Payout', PayoutSchema)
export const CheckIn = mongoose.models.CheckIn || mongoose.model('CheckIn', CheckInSchema)
export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema)
export const MyTicket = mongoose.models.MyTicket || mongoose.model('MyTicket', myTicketSchema)
export const TransferHistory = mongoose.models.TransferHistory || mongoose.model('TransferHistory', TransferHistorySchema)
export const ResaleListing = mongoose.models.ResaleListing || mongoose.model('ResaleListing', ResaleListingSchema)
export const ResalePurchase = mongoose.models.ResalePurchase || mongoose.model('ResalePurchase', ResalePurchaseSchema)
export const TransactionLog = mongoose.models.TransactionLog || mongoose.model('TransactionLog', TransactionLogSchema)
export const WalletTransaction = mongoose.models.WalletTransaction || mongoose.model('WalletTransaction', WalletTransactionSchema)
export const GaslessApproval = mongoose.models.GaslessApproval || mongoose.model('GaslessApproval', GaslessApprovalSchema)
export const BackendSigner = mongoose.models.BackendSigner || mongoose.model('BackendSigner', BackendSignerSchema)