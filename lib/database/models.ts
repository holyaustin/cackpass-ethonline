// lib/database/models.ts
import mongoose from 'mongoose'

// User Schema
const UserSchema = new mongoose.Schema({
  privyId: { type: String, unique: true, required: true },
  walletAddress: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },
  name: String,
  avatar: String,
  role: { type: String, enum: ['user', 'organizer', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

// Event Schema
const EventSchema = new mongoose.Schema({
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  venue: String,
  location: {
    lat: Number,
    lng: Number,
    address: String,
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  bannerImage: String, // IPFS hash
  metadataURI: String, // IPFS hash
  isActive: { type: Boolean, default: true },
  isFree: { type: Boolean, default: false },
  onChainId: Number, // Event ID from contract
  createdAt: { type: Date, default: Date.now },
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
  price: { type: Number, default: 0 }, // in wei for crypto, in smallest unit for fiat
  maxSupply: { type: Number, required: true },
  currentSupply: { type: Number, default: 0 },
  metadataURI: String, // IPFS hash
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
  ticketIds: [Number], // Array of on-chain ticket IDs
  createdAt: { type: Date, default: Date.now },
})

// Whitelist Schema
const WhitelistSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  merkleRoot: { type: String, required: true },
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    address: String,
    proof: [String], // Merkle proof
    registeredAt: { type: Date, default: Date.now },
  }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
})

// Market Listing Schema
const MarketListingSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ticketId: { type: Number, required: true }, // On-chain ticket ID
  quantity: { type: Number, required: true },
  price: { type: Number, required: true }, // in wei
  expiresAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  onChainListingId: Number,
  createdAt: { type: Date, default: Date.now },
})

export const User = mongoose.models.User || mongoose.model('User', UserSchema)
export const Event = mongoose.models.Event || mongoose.model('Event', EventSchema)
export const TicketType = mongoose.models.TicketType || mongoose.model('TicketType', TicketTypeSchema)
export const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema)
export const Whitelist = mongoose.models.Whitelist || mongoose.model('Whitelist', WhitelistSchema)
export const MarketListing = mongoose.models.MarketListing || mongoose.model('MarketListing', MarketListingSchema)

// Additional models
export const Payout = mongoose.model('Payout', new mongoose.Schema({
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
}))

export const CheckIn = mongoose.model('CheckIn', new mongoose.Schema({
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
}))

export const Notification = mongoose.model('Notification', new mongoose.Schema({
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
}))