// lib/database/models.ts - COMPLETE FIX (NO DUPLICATE INDEXES)
import mongoose from 'mongoose'

// User Schema with simplified fields (NO field-level indexes)
const UserSchema = new mongoose.Schema({
  privyId: { type: String, required: true, unique: true }, // unique: true is OK, but no index: true
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
})

// Update UserProfile schema to be optional
const UserProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  firstName: { type: String },
  lastName: { type: String },
  bio: { type: String, default: '' },
  location: { type: String, default: '' },
  dateOfBirth: { type: Date, default: null },
  interests: [{ type: String }],
  profilePicture: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

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
  onChainId: { type: Number, sparse: true }, // NO index: true
  isOnChain: { type: Boolean, default: false },
  transactionHash: { type: String, sparse: true }, // NO index: true
  gaslessWallet: { type: String, sparse: true },
  ticketId: { type: Number, sparse: true },
  status: { 
    type: String, 
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'published'
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

// Ticket Type Schema
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
})

// Order Schema
const OrderSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  eventId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Event', 
    required: true 
  },
  ticketTypeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'TicketType', 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true,
    min: 1
  },
  totalAmount: { 
    type: Number, 
    required: true,
    min: 0
  },
  currency: { 
    type: String, 
    enum: ['NGN', 'USD', 'ETH', 'USDC'],
    default: 'NGN' 
  },
  paymentMethod: { 
    type: String, 
    enum: ['paystack', 'wallet', 'free'],
    required: true 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending' 
  },
  paymentReference: String, // NO index: true
  mintStatus: { 
    type: String, 
    enum: ['pending', 'minted', 'failed'], 
    default: 'pending' 
  },
  transactionHash: String, // NO index: true
  ticketIds: {
    type: [String],  // Change from [Number] to [String]
    default: []
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
})

// ========================
// PAYMENT SCHEMA - UPDATED (FIXED VERSION)
// ========================
const PaymentSchema = new mongoose.Schema({
  paymentMethod: { 
    type: String, 
    enum: ['wallet', 'paystack', 'crypto', 'free'], 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false
  },
  walletAddress: { 
    type: String,
    required: function() {
      return this.paymentMethod === 'wallet' || this.paymentMethod === 'crypto';
    }
  },
  eventId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Event', 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    default: 'USD' 
  },
  quantity: { 
    type: Number,
    required: true,
    default: 1
  },
  ticketTypeId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TicketType'
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'refunded'], 
    default: 'pending' 
  },
  paymentReference: { 
    type: String, 
    required: false,
    unique: true // unique: true is OK, but no index: true
  },
  approvalId: { type: String }, // NO index: true
  signature: { type: String },
  transactionHash: { type: String }, // NO index: true
  signatureData: { type: mongoose.Schema.Types.Mixed },
  validUntil: { type: Date },
  metadata: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

// Whitelist Schema
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
  createdAt: { type: Date, default: Date.now },
})

// Market Listing Schema
const MarketListingSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ticketId: { type: Number, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  onChainListingId: Number,
  createdAt: { type: Date, default: Date.now },
})

// Payout Schema
const PayoutSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  totalAmount: { type: Number, required: true },
  platformFee: { type: Number, required: true },
  organizerAmount: { type: Number, required: true },
  transactionHash: String,
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending' 
  },
  processedAt: Date,
  createdAt: { type: Date, default: Date.now },
})

// CheckIn Schema
const CheckInSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  ticketId: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scannerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  checkedInAt: { type: Date, default: Date.now },
  location: {
    lat: Number,
    lng: Number,
    accuracy: Number,
  },
  isVerified: { type: Boolean, default: false },
})

// Notification Schema
const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['purchase', 'transfer', 'resale', 'event', 'system'], 
    default: 'system' 
  },
  isRead: { type: Boolean, default: false },
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
})

// My Ticket Schema
const myTicketSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  ticketTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TicketType',
    required: true
  },
  ticketNumber: {
    type: String,
    required: true,
    unique: true // unique: true is OK, but no index: true
  },
  qrCode: {
    type: String,
    default: ''
  },
  qrCodeCid: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'used', 'transferred', 'cancelled', 'refunded', 'transferred_complete'],
    default: 'active'
  },
  transferredTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  transferredAt: {
    type: Date
  },
  usedAt: {
    type: Date
  },
  seatNumber: {
    type: String
  },
  zone: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Transfer History Schema
const TransferHistorySchema = new mongoose.Schema({
  ticketId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MyTicket', 
    required: true 
  },
  fromUserId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  toUserId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'cancelled', 'rejected'],
    default: 'pending' 
  },
  ticketNumber: { 
    type: String, 
    required: true 
  },
  eventId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Event' 
  },
  ticketTypeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'TicketType' 
  },
  transferredAt: { 
    type: Date, 
    default: Date.now 
  },
  acceptedAt: { 
    type: Date 
  },
  cancelledAt: { 
    type: Date 
  },
  rejectedAt: { 
    type: Date 
  },
  reason: { 
    type: String 
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
})

// Resale Listing Schema
const ResaleListingSchema = new mongoose.Schema({
  ticketId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MyTicket', 
    required: true 
  },
  sellerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  price: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    enum: ['NGN', 'USD', 'ETH', 'USDC'], 
    default: 'NGN' 
  },
  status: { 
    type: String, 
    enum: ['active', 'sold', 'cancelled', 'expired'], 
    default: 'active' 
  },
  expiresAt: { 
    type: Date 
  },
  buyerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  soldAt: { 
    type: Date 
  },
  transactionHash: { 
    type: String 
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
})

// Resale Purchase Schema
const ResalePurchaseSchema = new mongoose.Schema({
  listingId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ResaleListing', 
    required: true 
  },
  buyerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  sellerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  ticketId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MyTicket', 
    required: true 
  },
  price: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    enum: ['NGN', 'USD', 'ETH', 'USDC'], 
    default: 'NGN' 
  },
  paymentMethod: { 
    type: String, 
    enum: ['crypto', 'paystack', 'flutterwave'], 
    required: true 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'refunded'], 
    default: 'pending' 
  },
  paymentReference: { 
    type: String 
  },
  transactionHash: { 
    type: String 
  },
  serviceFee: { 
    type: Number, 
    default: 0 
  },
  sellerAmount: { 
    type: Number 
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
})

// Transaction Log Schema
const TransactionLogSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['ticket_purchase', 'ticket_transfer', 'resale_purchase', 'resale_listing', 'withdrawal', 'deposit'],
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    enum: ['NGN', 'USD', 'ETH', 'USDC'], 
    default: 'NGN' 
  },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'cancelled'], 
    default: 'pending' 
  },
  referenceId: { 
    type: String 
  },
  transactionHash: { 
    type: String 
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  description: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
})

// Wallet Transaction Schema
const WalletTransactionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  walletAddress: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'refund', 'fee'],
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    enum: ['ETH', 'USDC', 'USDT'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'failed'], 
    default: 'pending' 
  },
  transactionHash: { 
    type: String, 
    unique: true // unique: true is OK, but no index: true
  },
  blockNumber: { 
    type: Number 
  },
  fromAddress: { 
    type: String 
  },
  toAddress: { 
    type: String 
  },
  gasUsed: { 
    type: Number 
  },
  gasPrice: { 
    type: Number 
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  confirmedAt: { 
    type: Date 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
})

// Gasless Approval Schema
const GaslessApprovalSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  eventId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Event', 
    required: true 
  },
  ticketTypeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'TicketType' 
  },
  amount: { 
    type: Number, 
    required: true,
    min: 1
  },
  price: { 
    type: Number, 
    required: true,
    min: 0,
    set: function(val: any) {
      if (typeof val === 'bigint') {
        const bigIntVal = Number(val)
        if (bigIntVal > 1e12) {
          return bigIntVal / 1e18
        }
        return bigIntVal
      } else if (typeof val === 'string') {
        if (val.endsWith('n')) {
          val = val.slice(0, -1)
        }
        const numVal = parseFloat(val)
        if (isNaN(numVal)) {
          return 0
        }
        if (numVal > 1e12) {
          return numVal / 1e18
        }
        return numVal
      }
      return val
    }
  },
  currency: { 
    type: String, 
    default: 'USD' 
  },
  approvalId: { 
    type: String, 
    required: true, 
    unique: true // unique: true is OK, but no index: true
  },
  signature: { 
    type: String, 
    required: true 
  },
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
  validUntil: { 
    type: Date, 
    required: true
  },
  status: { 
    type: String, 
    enum: ['pending', 'used', 'expired', 'cancelled'], 
    default: 'pending' 
  },
  usedAt: { 
    type: Date 
  },
  transactionHash: { 
    type: String 
  },
  metadata: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
})

// Backend Signer Schema
const BackendSignerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  address: { 
    type: String, 
    required: true, 
    unique: true // unique: true is OK, but no index: true
  },
  contractType: { 
    type: String, 
    enum: ['CackPassCore', 'TicketMarket', 'RoyaltyEngine', 'VoucherVerifier'], 
    required: true 
  },
  privateKeyEncrypted: { 
    type: String 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  lastUsed: { 
    type: Date 
  },
  metadata: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
})

// ========================
// INDEXES - ALL IN ONE PLACE (NO DUPLICATES)
// ========================

// Event Schema Indexes
EventSchema.index({ onChainId: 1 }, { sparse: true })
EventSchema.index({ organizerWallet: 1 })
EventSchema.index({ status: 1 })
EventSchema.index({ startDate: 1 })
EventSchema.index({ category: 1 })
EventSchema.index({ isFree: 1 })
EventSchema.index({ isVirtual: 1 })
EventSchema.index({ createdAt: -1 })

// Payment Schema Indexes
PaymentSchema.index({ userId: 1 })
PaymentSchema.index({ eventId: 1 })
PaymentSchema.index({ paymentReference: 1 }, { unique: true, sparse: true })
PaymentSchema.index({ paymentStatus: 1 })
PaymentSchema.index({ createdAt: -1 })
PaymentSchema.index({ approvalId: 1 }, { sparse: true })
PaymentSchema.index({ transactionHash: 1 }, { sparse: true })
PaymentSchema.index({ walletAddress: 1 })
PaymentSchema.index({ paymentMethod: 1 })

// MyTicket Schema Indexes
myTicketSchema.index({ userId: 1 })
myTicketSchema.index({ eventId: 1 })
myTicketSchema.index({ orderId: 1 })
myTicketSchema.index({ ticketNumber: 1 }, { unique: true })
myTicketSchema.index({ status: 1 })
myTicketSchema.index({ createdAt: -1 })
myTicketSchema.index({ transferredTo: 1 }, { sparse: true })

// Transfer History Schema Indexes
TransferHistorySchema.index({ fromUserId: 1, status: 1 })
TransferHistorySchema.index({ toUserId: 1, status: 1 })
TransferHistorySchema.index({ ticketId: 1 })
TransferHistorySchema.index({ ticketNumber: 1 })
TransferHistorySchema.index({ eventId: 1 })
TransferHistorySchema.index({ createdAt: -1 })
TransferHistorySchema.index({ transferredAt: -1 })

// Resale Listing Schema Indexes
ResaleListingSchema.index({ ticketId: 1, status: 1 })
ResaleListingSchema.index({ sellerId: 1, status: 1 })
ResaleListingSchema.index({ buyerId: 1 })
ResaleListingSchema.index({ status: 1 })
ResaleListingSchema.index({ expiresAt: 1 })
ResaleListingSchema.index({ createdAt: -1 })

// Resale Purchase Schema Indexes
ResalePurchaseSchema.index({ listingId: 1 })
ResalePurchaseSchema.index({ buyerId: 1 })
ResalePurchaseSchema.index({ sellerId: 1 })
ResalePurchaseSchema.index({ ticketId: 1 })
ResalePurchaseSchema.index({ paymentStatus: 1 })
ResalePurchaseSchema.index({ createdAt: -1 })

// Transaction Log Schema Indexes
TransactionLogSchema.index({ userId: 1, type: 1 })
TransactionLogSchema.index({ status: 1 })
TransactionLogSchema.index({ createdAt: -1 })
TransactionLogSchema.index({ transactionHash: 1 }, { sparse: true })
TransactionLogSchema.index({ referenceId: 1 }, { sparse: true })

// Wallet Transaction Schema Indexes
WalletTransactionSchema.index({ userId: 1 })
WalletTransactionSchema.index({ walletAddress: 1 })
WalletTransactionSchema.index({ transactionHash: 1 }, { unique: true })
WalletTransactionSchema.index({ type: 1, status: 1 })
WalletTransactionSchema.index({ createdAt: -1 })
WalletTransactionSchema.index({ blockNumber: -1 })

// Gasless Approval Schema Indexes
GaslessApprovalSchema.index({ approvalId: 1 }, { unique: true })
GaslessApprovalSchema.index({ userId: 1 })
GaslessApprovalSchema.index({ eventId: 1 })
GaslessApprovalSchema.index({ status: 1 })
GaslessApprovalSchema.index({ validUntil: 1 })
GaslessApprovalSchema.index({ createdAt: -1 })
GaslessApprovalSchema.index({ recipient: 1 })

// Backend Signer Schema Indexes
BackendSignerSchema.index({ address: 1 }, { unique: true })
BackendSignerSchema.index({ contractType: 1 })
BackendSignerSchema.index({ isActive: 1 })
BackendSignerSchema.index({ createdAt: -1 })

// Whitelist Schema Indexes
WhitelistSchema.index({ eventId: 1 })
WhitelistSchema.index({ isActive: 1 })

// Market Listing Schema Indexes
MarketListingSchema.index({ sellerId: 1 })
MarketListingSchema.index({ ticketId: 1 })
MarketListingSchema.index({ isActive: 1 })

// Payout Schema Indexes
PayoutSchema.index({ eventId: 1 })
PayoutSchema.index({ organizerId: 1 })
PayoutSchema.index({ status: 1 })

// CheckIn Schema Indexes
CheckInSchema.index({ eventId: 1 })
CheckInSchema.index({ ticketId: 1 })
CheckInSchema.index({ userId: 1 })
CheckInSchema.index({ isVerified: 1 })

// Notification Schema Indexes
NotificationSchema.index({ userId: 1 })
NotificationSchema.index({ isRead: 1 })
NotificationSchema.index({ type: 1 })

// Order Schema Indexes
OrderSchema.index({ userId: 1 })
OrderSchema.index({ eventId: 1 })
OrderSchema.index({ paymentStatus: 1 })
OrderSchema.index({ mintStatus: 1 })
OrderSchema.index({ createdAt: -1 })

// Ticket Type Schema Indexes
TicketTypeSchema.index({ eventId: 1 })
TicketTypeSchema.index({ isActive: 1 })
TicketTypeSchema.index({ category: 1 })

// User Schema Indexes
UserSchema.index({ privyId: 1 }, { unique: true })
UserSchema.index({ walletAddress: 1 }, { sparse: true })
UserSchema.index({ email: 1 }, { sparse: true })
UserSchema.index({ isOrganizer: 1 })

// UserProfile Schema Indexes
UserProfileSchema.index({ userId: 1 }, { unique: true })

// ========================
// PREVENT MODEL OVERWRITE ERROR
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