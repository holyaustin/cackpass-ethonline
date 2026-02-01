// lib/database/models.ts - UPDATED WITH TRANSFER HISTORY AND PAYMENT SCHEMA
import mongoose from 'mongoose'

// User Schema with simplified fields
const UserSchema = new mongoose.Schema({
  privyId: { type: String, required: true, unique: true },
  // Embedded wallet address (provided by Privy)
  walletAddress: { type: String, default: null },
  // User info from Privy
  loginMethod: { 
    type: String, 
    enum: ['email', 'google', 'twitter'], 
    required: true 
  },
  email: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  username: { type: String },
  
  // Profile info (user provided)
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

// Event Schema
const EventSchema = new mongoose.Schema({
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizerWallet: { type: String, required: true }, // Wallet address from Privy
  title: { type: String, required: true },
  description: String,
  
  // Location fields
  venue: String,
  location: {
    lat: Number,
    lng: Number,
    address: String,
  },
  
  // Virtual event support
  isVirtual: { type: Boolean, default: false },
  virtualOptions: {
    zoomMeeting: { type: Boolean, default: false },
    googleMeet: { type: Boolean, default: false },
    hasVirtualLink: { type: Boolean, default: false },
    virtualLink: { type: String, default: '' }
  },
  
  // Date and time
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  startDateTime: { type: Date }, // Combined start date + time
  endDateTime: { type: Date },   // Combined end date + time
  
  // Category
  category: { type: String, required: true },
  customCategory: { type: String },
  
  // Image and metadata
  bannerImage: String,
  imageCid: String, // IPFS CID for uploaded image
  metadataURI: String,
  metadataCid: String, // IPFS CID for metadata
  
  // Pricing
  isFree: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  
  // Ticket type (for events with single ticket type)
  ticketType: { 
    type: String, 
    enum: ['GeneralAdmission', 'ReservedSeating', 'VIPPremium', 'Others'],
    default: 'GeneralAdmission'
  },
  
  // Capacity management
  unlimitedCapacity: { type: Boolean, default: true },
  capacity: { type: Number },
  
  // Blockchain integration
  onChainId: Number,
  isOnChain: { type: Boolean, default: false },
  transactionHash: String,
  gaslessWallet: String, // Address that paid gas for gasless transactions
  ticketId: Number, // For single-ticket events (alternative to TicketType model)
  
  // Status
  status: { 
    type: String, 
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'published'
  },
  isActive: { type: Boolean, default: true },
  
  // Timestamps
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
    min: 1  // Added from first schema
  },
  totalAmount: { 
    type: Number, 
    required: true,
    min: 0  // Added from first schema
  },
  currency: { 
    type: String, 
    enum: ['NGN', 'USD', 'ETH', 'USDC'],  // From second schema (superior)
    default: 'NGN' 
  },
  paymentMethod: { 
    type: String, 
    enum: ['paystack', 'flutterwave', 'ussd', 'crypto', 'free'],  // From second schema (superior)
    required: true 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded'],  // Using 'paid' instead of 'completed' from second schema
    default: 'pending' 
  },
  paymentReference: String,
  mintStatus: { 
    type: String, 
    enum: ['pending', 'minted', 'failed'], 
    default: 'pending' 
  },
  transactionHash: String,
  ticketIds: [Number],  // From second schema (new field)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}  // From first schema (added as optional)
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: {  // From first schema (added field)
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true  // Added to automatically handle createdAt and updatedAt
});

// ========================
// PAYMENT SCHEMA
// ========================
const PaymentSchema = new mongoose.Schema({
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
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    default: 'USD' 
  },
  paymentMethod: { 
    type: String, 
    enum: ['wallet', 'paystack', 'crypto', 'free'], 
    required: true 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'refunded'], 
    default: 'pending' 
  },
  paymentReference: { 
    type: String, 
    required: true, 
    unique: true 
  },
  approvalId: { 
    type: String 
  }, // For gasless minting approvals
  transactionHash: { 
    type: String 
  }, // For blockchain payments
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

// Add indexes for Payment schema
PaymentSchema.index({ userId: 1 })
PaymentSchema.index({ eventId: 1 })
PaymentSchema.index({ paymentReference: 1 })
PaymentSchema.index({ paymentStatus: 1 })
PaymentSchema.index({ createdAt: -1 })
PaymentSchema.index({ approvalId: 1 }, { sparse: true })
PaymentSchema.index({ transactionHash: 1 }, { sparse: true })

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

// Additional models
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

// ========================
// MY TICKET SCHEMA
// ========================
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
    unique: true
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

// Add indexes for MyTicket schema
myTicketSchema.index({ userId: 1 })
myTicketSchema.index({ eventId: 1 })
myTicketSchema.index({ orderId: 1 })
myTicketSchema.index({ ticketNumber: 1 })
myTicketSchema.index({ status: 1 })
myTicketSchema.index({ createdAt: -1 })
myTicketSchema.index({ transferredTo: 1 }, { sparse: true })

// ========================
// TRANSFER HISTORY SCHEMA
// ========================
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

// Indexes for better query performance
TransferHistorySchema.index({ fromUserId: 1, status: 1 })
TransferHistorySchema.index({ toUserId: 1, status: 1 })
TransferHistorySchema.index({ ticketId: 1 })
TransferHistorySchema.index({ ticketNumber: 1 })
TransferHistorySchema.index({ eventId: 1 })
TransferHistorySchema.index({ createdAt: -1 })
TransferHistorySchema.index({ transferredAt: -1 })

// ========================
// RESALE LISTING SCHEMA
// ========================
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

// Add indexes for ResaleListing schema
ResaleListingSchema.index({ ticketId: 1, status: 1 })
ResaleListingSchema.index({ sellerId: 1, status: 1 })
ResaleListingSchema.index({ buyerId: 1 })
ResaleListingSchema.index({ status: 1 })
ResaleListingSchema.index({ expiresAt: 1 })
ResaleListingSchema.index({ createdAt: -1 })

// ========================
// RESALE PURCHASE SCHEMA
// ========================
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

// Add indexes for ResalePurchase schema
ResalePurchaseSchema.index({ listingId: 1 })
ResalePurchaseSchema.index({ buyerId: 1 })
ResalePurchaseSchema.index({ sellerId: 1 })
ResalePurchaseSchema.index({ ticketId: 1 })
ResalePurchaseSchema.index({ paymentStatus: 1 })
ResalePurchaseSchema.index({ createdAt: -1 })

// ========================
// TRANSACTION LOG SCHEMA
// ========================
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

// Add indexes for TransactionLog schema
TransactionLogSchema.index({ userId: 1, type: 1 })
TransactionLogSchema.index({ status: 1 })
TransactionLogSchema.index({ createdAt: -1 })
TransactionLogSchema.index({ transactionHash: 1 }, { sparse: true })
TransactionLogSchema.index({ referenceId: 1 }, { sparse: true })

// ========================
// WALLET TRANSACTION SCHEMA
// ========================
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
    unique: true 
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

// Add indexes for WalletTransaction schema
WalletTransactionSchema.index({ userId: 1 })
WalletTransactionSchema.index({ walletAddress: 1 })
WalletTransactionSchema.index({ transactionHash: 1 })
WalletTransactionSchema.index({ type: 1, status: 1 })
WalletTransactionSchema.index({ createdAt: -1 })
WalletTransactionSchema.index({ blockNumber: -1 })

// ========================
// GASLESS APPROVAL SCHEMA
// ========================
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
    required: true 
  },
  price: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    default: 'USD' 
  },
  approvalId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  signature: { 
    type: String, 
    required: true 
  },
  recipient: { 
    type: String, 
    required: true 
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

// Add indexes for GaslessApproval schema
GaslessApprovalSchema.index({ userId: 1 })
GaslessApprovalSchema.index({ eventId: 1 })
GaslessApprovalSchema.index({ approvalId: 1 })
GaslessApprovalSchema.index({ status: 1 })
GaslessApprovalSchema.index({ validUntil: 1 })
GaslessApprovalSchema.index({ createdAt: -1 })

// ========================
// BACKEND SIGNER SCHEMA
// ========================
const BackendSignerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  address: { 
    type: String, 
    required: true, 
    unique: true 
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

// Add indexes for BackendSigner schema
BackendSignerSchema.index({ address: 1 })
BackendSignerSchema.index({ contractType: 1 })
BackendSignerSchema.index({ isActive: 1 })
BackendSignerSchema.index({ createdAt: -1 })

// Prevent model overwrite error in Next.js hot reload
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