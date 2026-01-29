// lib/database/models.ts - FIXED VERSION
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
  fullName: { type: String, default: '' },
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
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  ticketTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketType', required: true },
  quantity: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  currency: { type: String, enum: ['NGN', 'USD', 'ETH', 'USDC'], default: 'NGN' },
  paymentMethod: { 
    type: String, 
    enum: ['paystack', 'flutterwave', 'ussd', 'crypto', 'free'],
    required: true 
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded'], 
    default: 'pending' 
  },
  paymentReference: String,
  mintStatus: { 
    type: String, 
    enum: ['pending', 'minted', 'failed'], 
    default: 'pending' 
  },
  transactionHash: String,
  ticketIds: [Number],
  createdAt: { type: Date, default: Date.now },
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

// Prevent model overwrite error in Next.js hot reload
export const User = mongoose.models.User || mongoose.model('User', UserSchema)
export const UserProfile = mongoose.models.UserProfile || mongoose.model('UserProfile', UserProfileSchema)
export const Event = mongoose.models.Event || mongoose.model('Event', EventSchema)
export const TicketType = mongoose.models.TicketType || mongoose.model('TicketType', TicketTypeSchema)
export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema)
export const Whitelist = mongoose.models.Whitelist || mongoose.model('Whitelist', WhitelistSchema)
export const MarketListing = mongoose.models.MarketListing || mongoose.model('MarketListing', MarketListingSchema)
export const Payout = mongoose.models.Payout || mongoose.model('Payout', PayoutSchema)
export const CheckIn = mongoose.models.CheckIn || mongoose.model('CheckIn', CheckInSchema)
export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema)