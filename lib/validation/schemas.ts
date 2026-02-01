// lib/validation/schemas.ts
import { z } from 'zod'
import type { ZodError } from 'zod'

// Base schemas
export const walletAddressSchema = z.string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format')

export const emailSchema = z.string()
  .email('Invalid email address')
  .min(1, 'Email is required')

export const dateSchema = z.string()
  .or(z.date())
  .transform((val) => new Date(val))
  .refine((date) => !isNaN(date.getTime()), 'Invalid date')

// Event schemas
export const createEventSchema = z.object({
  organizerId: z.string().optional(),
  organizerWallet: walletAddressSchema.optional(),
  title: z.string().min(1, 'Event title is required').max(100, 'Title too long'),
  description: z.string().min(1, 'Description is required').max(2000, 'Description too long'),
  category: z.string().min(1, 'Category is required'),
  customCategory: z.string().optional(),
  location: z.string().min(1, 'Location is required'),
  startDateTime: dateSchema,
  endDateTime: dateSchema,
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  isFree: z.boolean().default(false),
  price: z.number().min(0).optional(),
  priceAmount: z.string().optional(),
  currency: z.string().default('USD'),
  ticketType: z.string().default('GeneralAdmission'),
  unlimitedCapacity: z.boolean().default(false),
  capacity: z.number().int().positive().optional(),
  isVirtual: z.boolean().optional(),
  virtualOptions: z.object({
    zoomMeeting: z.boolean().default(false),
    googleMeet: z.boolean().default(false),
    hasVirtualLink: z.boolean().default(false),
    virtualLink: z.string().url().optional(),
    youtubeLink: z.string().url().optional(),
    twitchLink: z.string().url().optional(),
    platform: z.string().optional(),
    meetingId: z.string().optional(),
    password: z.string().optional()
  }).optional(),
  imageCid: z.string().optional(),
  metadataCid: z.string().optional(),
  metadataURI: z.string().optional(),
  transactionHash: z.string().optional(),
  gaslessWallet: walletAddressSchema.optional(),
  ticketId: z.number().optional(),
  onChainId: z.number().optional(),
  status: z.enum(['draft', 'published', 'cancelled']).default('published'),
  isActive: z.boolean().default(true),
  isOnChain: z.boolean().default(false)
}).refine((data) => {
  // Validate that we have at least one organizer identifier
  if (!data.organizerId && !data.organizerWallet) {
    return false
  }
  return true
}, {
  message: 'Either organizerId or organizerWallet is required',
  path: ['organizerId']
}).refine((data) => {
  // Validate that end date is after start date
  const start = new Date(data.startDateTime)
  const end = new Date(data.endDateTime)
  return end > start
}, {
  message: 'End date must be after start date',
  path: ['endDateTime']
})

// Blockchain schemas for LISK Mainnet
export const blockchainCreateEventSchema = z.object({
  eventName: z.string().min(1, 'Event name is required'),
  baseURI: z.string().url().or(z.string().startsWith('ipfs://')),
  startTime: z.number().int().positive(),
  endTime: z.number().int().positive(),
  gasPrice: z.string().optional(),
  gasLimit: z.number().optional(),
})

export const blockchainAddTicketTypeSchema = z.object({
  eventId: z.number().int().positive(),
  category: z.number().int().min(0).max(255), // Assuming 0-255 ticket categories
  maxTickets: z.number().int().min(0),
  ticketPrice: z.string().or(z.bigint()).transform((val) => BigInt(val))
})

// Payment schemas
export const paymentProcessSchema = z.object({
  method: z.enum(['crypto', 'paystack', 'free']),
  walletAddress: walletAddressSchema,
  amount: z.number().positive(),
  currency: z.string().length(3),
  eventId: z.string(),
  quantity: z.number().int().positive(),
  approvalId: z.string().optional(),
  signature: z.string().optional()
})

// Ticket minting schema
export const ticketMintSchema = z.object({
  walletAddress: walletAddressSchema,
  eventId: z.string(),
  paymentId: z.string(),
  quantity: z.number().int().positive(),
  method: z.enum(['crypto', 'paystack', 'free'])
})

// Auth schemas
export const userProfileSchema = z.object({
  walletAddress: walletAddressSchema,
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: emailSchema,
  username: z.string().min(3, 'Username must be at least 3 characters').max(30),
  country: z.string().min(1, 'Country is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  isOrganizer: z.boolean().default(false),
  bio: z.string().max(500).optional(),
  location: z.string().optional(),
  dateOfBirth: dateSchema.optional(),
  interests: z.array(z.string()).optional(),
  profilePicture: z.string().url().optional()
})

// Custom error class for validation
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Array<{ path: string; message: string }>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Helper function for API validation
// Helper function for API validation
export const validateRequest = async <T extends z.ZodType<any, any>>(
  schema: T,
  data: unknown
): Promise<z.infer<T>> => {
  try {
    return await schema.parseAsync(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Type assertion to tell TypeScript this is a ZodError
      const zodError = error as any
      // Now access errors property
      const formattedErrors = zodError.errors.map((err: any) => ({
        path: err.path.join('.'),
        message: err.message
      }))
      throw new ValidationError('Validation failed', formattedErrors)
    }
    throw error
  }
}