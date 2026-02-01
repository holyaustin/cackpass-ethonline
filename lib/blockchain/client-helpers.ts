// /lib/blockchain/client-helpers.ts - COMPLETE PRODUCTION READY VERSION
'use client'

import { ethers } from 'ethers'
import { CackPassCoreABI } from '@/lib/contracts/abis/CackPassCore'

// ============ TYPES ============
export enum TicketCategory {
  GeneralAdmission = 0,
  ReservedSeating = 1,
  VIPPremium = 2,
  Others = 3
}

export interface MintApproval {
  recipient: string
  eventId: number
  ticketCategory: number
  amount: number
  price: bigint
  validUntil: number
  id: string
}

export interface PaymentApproval {
  approvalId: string
  signature: string
  signatureData: any
  validUntil: number
}

export interface TicketMetadata {
  name: string
  description: string
  image: string
  external_url?: string
  animation_url?: string
  attributes: Array<{
    trait_type: string
    value: string | number
    display_type?: string
  }>
  properties?: {
    category: string
    eventId: number
    ticketNumber?: string
    seatNumber?: string
    zone?: string
    validFrom: string
    validUntil: string
  }
}

export interface EventData {
  eventName?: string
  title?: string
  description?: string
  location?: string
  venue?: string
  startDate?: string
  endDate?: string
  startTime?: string
  endTime?: string
  showVirtualOptions?: boolean
  isVirtual?: boolean
  eventId?: string
  _id?: string
  onChainId?: number
}

// ============ CONSTANTS ============
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS!
const RPC_URL = process.env.NEXT_PUBLIC_LISK_RPC_URL || 'https://rpc.sepolia-api.lisk.com'

// ============ UTILITY FUNCTIONS ============

/**
 * Generate a unique approval ID for gasless minting
 */
export function generateApprovalId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `approval_${timestamp}_${random}`
}

/**
 * Check if event is free
 */
export function isFreeEvent(priceAmount: string | number): boolean {
  try {
    const price = typeof priceAmount === 'string' ? parseFloat(priceAmount) : priceAmount
    return price === 0 || isNaN(price)
  } catch {
    return true
  }
}

/**
 * Create ticket metadata for IPFS storage
 */
export function createTicketMetadata(
  eventData: EventData,
  imageCid: string,
  ticketType: string,
  price: string,
  category: TicketCategory
): TicketMetadata {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cackpass.com'
  const eventName = eventData.eventName || eventData.title || 'Unknown Event'
  const description = eventData.description || `Ticket for ${eventName}`
  const location = eventData.location || eventData.venue || 'Location TBD'
  const isVirtual = eventData.showVirtualOptions || eventData.isVirtual || false
  
  // Format date/time
  const dateTime = eventData.startDate 
    ? `${eventData.startDate}${eventData.startTime ? ` ${eventData.startTime}` : ''}`
    : 'Date TBD'
  
  // Create metadata
  const metadata: TicketMetadata = {
    name: `${eventName} - ${ticketType}`,
    description: description,
    image: imageCid ? `ipfs://${imageCid}` : `${appUrl}/placeholder-ticket.jpg`,
    external_url: `${appUrl}/tickets`,
    attributes: [
      {
        trait_type: "Event",
        value: eventName
      },
      {
        trait_type: "Ticket Type",
        value: ticketType
      },
      {
        trait_type: "Category",
        value: TicketCategory[category] || "GeneralAdmission"
      },
      {
        trait_type: "Category ID",
        value: category.toString(),
        display_type: "number"
      },
      {
        trait_type: "Price",
        value: price,
        display_type: "number"
      },
      {
        trait_type: "Location",
        value: location
      },
      {
        trait_type: "Date & Time",
        value: dateTime
      },
      {
        trait_type: "Is Virtual",
        value: isVirtual ? "Yes" : "No"
      },
      {
        trait_type: "Is Free",
        value: isFreeEvent(price) ? "Yes" : "No"
      }
    ]
  }
  
  // Add properties for additional metadata
  if (eventData.eventId || eventData._id || eventData.onChainId) {
    metadata.properties = {
      category: ticketType,
      eventId: eventData.onChainId || parseInt(eventData.eventId || eventData._id || '0'),
      validFrom: new Date().toISOString(),
      validUntil: eventData.endDate 
        ? new Date(eventData.endDate).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Default 30 days
    }
  }
  
  return metadata
}

/**
 * Map ticket type string to contract category number
 */
export function mapTicketTypeToCategory(ticketType: string): TicketCategory {
  switch (ticketType) {
    case 'GeneralAdmission':
      return TicketCategory.GeneralAdmission
    case 'ReservedSeating':
      return TicketCategory.ReservedSeating
    case 'VIPPremium':
      return TicketCategory.VIPPremium
    case 'Others':
      return TicketCategory.Others
    default:
      return TicketCategory.GeneralAdmission
  }
}

/**
 * Map category number back to string
 */
export function mapCategoryToTicketType(category: TicketCategory): string {
  switch (category) {
    case TicketCategory.GeneralAdmission:
      return 'GeneralAdmission'
    case TicketCategory.ReservedSeating:
      return 'ReservedSeating'
    case TicketCategory.VIPPremium:
      return 'VIPPremium'
    case TicketCategory.Others:
      return 'Others'
    default:
      return 'GeneralAdmission'
  }
}

/**
 * Validate wallet address
 */
export function isValidWalletAddress(address: string): boolean {
  try {
    return ethers.isAddress(address)
  } catch {
    return false
  }
}

/**
 * Shorten wallet address for display
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address || !isValidWalletAddress(address)) {
    return 'Invalid Address'
  }
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/**
 * Convert wei to ether
 */
export function weiToEther(wei: bigint | string): string {
  try {
    const weiBigInt = typeof wei === 'string' ? BigInt(wei) : wei
    return ethers.formatEther(weiBigInt)
  } catch (error) {
    console.error('Error converting wei to ether:', error)
    return '0'
  }
}

/**
 * Convert ether to wei
 */
export function etherToWei(ether: string): bigint {
  try {
    return ethers.parseEther(ether)
  } catch (error) {
    console.error('Error converting ether to wei:', error)
    return 0n
  }
}

// ============ CONTRACT INTERACTION HELPERS ============

/**
 * Get provider instance (read-only)
 */
export function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(RPC_URL, undefined, {
    batchMaxCount: 1,
    staticNetwork: null,
    cacheTimeout: -1,
    pollingInterval: 1000,
  })
}

/**
 * Get contract instance (read-only)
 */
export function getContract(): ethers.Contract {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not configured')
  }
  
  const provider = getProvider()
  return new ethers.Contract(CONTRACT_ADDRESS, CackPassCoreABI, provider)
}

/**
 * Get contract with signer (for write operations)
 * Note: This should only be used on the backend
 */
export function getContractWithSigner(privateKey: string): ethers.Contract {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not configured')
  }
  
  const provider = getProvider()
  const wallet = new ethers.Wallet(privateKey, provider)
  return new ethers.Contract(CONTRACT_ADDRESS, CackPassCoreABI, wallet)
}

/**
 * Check available tickets for an event
 */
export async function getAvailableTickets(
  eventId: number,
  ticketCategory: TicketCategory
): Promise<{ available: number; maxTickets: number; ticketsSold: number }> {
  try {
    const contract = getContract()
    const ticketType = await contract.ticketTypes(eventId, ticketCategory)
    
    const maxTickets = Number(ticketType.maxTickets)
    const ticketsSold = Number(ticketType.ticketsSold)
    const available = maxTickets === 0 ? 0 : Math.max(0, maxTickets - ticketsSold)
    
    return { available, maxTickets, ticketsSold }
  } catch (error) {
    console.error('Error checking available tickets:', error)
    return { available: 0, maxTickets: 0, ticketsSold: 0 }
  }
}

/**
 * Get event information from blockchain
 */
export async function getEventInfo(eventId: number): Promise<{
  organizer: string
  name: string
  baseURI: string
  startTime: number
  endTime: number
  isActive: boolean
} | null> {
  try {
    const contract = getContract()
    const eventInfo = await contract.events(eventId)
    
    return {
      organizer: eventInfo.organizer,
      name: eventInfo.name,
      baseURI: eventInfo.baseURI,
      startTime: Number(eventInfo.startTime),
      endTime: Number(eventInfo.endTime),
      isActive: eventInfo.isActive,
    }
  } catch (error) {
    console.error('Error fetching event info:', error)
    return null
  }
}

/**
 * Verify ticket ownership
 */
export async function verifyTicketOwnership(
  walletAddress: string,
  ticketId: number
): Promise<boolean> {
  try {
    if (!isValidWalletAddress(walletAddress)) {
      return false
    }
    
    const contract = getContract()
    const balance = await contract.balanceOf(walletAddress, ticketId)
    
    return Number(balance) > 0
  } catch (error) {
    console.error('Error verifying ticket ownership:', error)
    return false
  }
}

/**
 * Get ticket metadata URI
 */
export async function getTicketURI(ticketId: number): Promise<string> {
  try {
    const contract = getContract()
    return await contract.uri(ticketId)
  } catch (error) {
    console.error('Error fetching ticket URI:', error)
    return ''
  }
}

/**
 * Check if payment is settled for an event
 */
export async function isPaymentSettled(eventId: number): Promise<boolean> {
  try {
    const contract = getContract()
    return await contract.isPaymentSettled(eventId)
  } catch (error) {
    console.error('Error checking payment settlement:', error)
    return false
  }
}

/**
 * Get payment settlement info
 */
export async function getPaymentSettlement(eventId: number): Promise<{
  totalRevenue: bigint
  organizerPayout: bigint
  platformFee: bigint
  settledAt: number
  settledBy: string
  isSettled: boolean
} | null> {
  try {
    const contract = getContract()
    const settlement = await contract.getPaymentSettlement(eventId)
    
    return {
      totalRevenue: settlement.totalRevenue,
      organizerPayout: settlement.organizerPayout,
      platformFee: settlement.platformFee,
      settledAt: Number(settlement.settledAt),
      settledBy: settlement.settledBy,
      isSettled: settlement.isSettled,
    }
  } catch (error) {
    console.error('Error fetching payment settlement:', error)
    return null
  }
}

/**
 * Get backend signer address
 */
export async function getBackendSigner(): Promise<string> {
  try {
    const contract = getContract()
    return await contract.getBackendSigner()
  } catch (error) {
    console.error('Error getting backend signer:', error)
    return ''
  }
}

/**
 * Get ticket category from ticket ID
 */
export async function getTicketCategoryFromId(ticketId: number): Promise<number> {
  try {
    const contract = getContract()
    return await contract.getTicketCategory(ticketId)
  } catch (error) {
    console.error('Error getting ticket category:', error)
    return 0
  }
}

/**
 * Get event ID from ticket ID
 */
export async function getEventIdFromTicket(ticketId: number): Promise<number> {
  try {
    const contract = getContract()
    return await contract.getEventId(ticketId)
  } catch (error) {
    console.error('Error getting event ID from ticket:', error)
    return 0
  }
}

/**
 * Check if ticket has been used
 */
export async function isTicketUsed(ticketId: number): Promise<boolean> {
  try {
    const contract = getContract()
    return await contract.isTicketUsed(ticketId)
  } catch (error) {
    console.error('Error checking ticket usage:', error)
    return false
  }
}

/**
 * Generate payment approval data structure
 * Note: Actual signing should be done on backend
 */
export function generatePaymentApprovalData(
  walletAddress: string,
  eventId: number,
  ticketCategory: TicketCategory,
  amount: number,
  price: bigint
): MintApproval {
  // Generate unique approval ID
  const approvalId = ethers.keccak256(
    ethers.toUtf8Bytes(
      `${walletAddress.toLowerCase()}-${eventId}-${ticketCategory}-${amount}-${Date.now()}-${Math.random()}`
    )
  )
  
  // Set expiration (1 hour from now)
  const validUntil = Math.floor(Date.now() / 1000) + 3600
  
  return {
    recipient: walletAddress.toLowerCase(),
    eventId,
    ticketCategory,
    amount,
    price,
    validUntil,
    id: approvalId,
  }
}

/**
 * Format price for display
 */
export function formatPrice(price: number | string, currency: string = 'USD'): string {
  const priceNum = typeof price === 'string' ? parseFloat(price) : price
  if (isNaN(priceNum)) return `0 ${currency}`
  
  if (priceNum === 0) return 'FREE'
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  
  return formatter.format(priceNum)
}

/**
 * Calculate total price
 */
export function calculateTotalPrice(price: number, quantity: number, currency: string = 'USD'): string {
  const total = price * quantity
  return formatPrice(total, currency)
}

/**
 * Validate ticket purchase parameters
 */
export function validatePurchaseParams(
  walletAddress: string,
  eventId: number,
  quantity: number,
  price: number
): { valid: boolean; error?: string } {
  if (!isValidWalletAddress(walletAddress)) {
    return { valid: false, error: 'Invalid wallet address' }
  }
  
  if (!eventId || eventId <= 0) {
    return { valid: false, error: 'Invalid event ID' }
  }
  
  if (!quantity || quantity <= 0) {
    return { valid: false, error: 'Invalid quantity' }
  }
  
  if (price < 0) {
    return { valid: false, error: 'Invalid price' }
  }
  
  return { valid: true }
}

/**
 * Generate QR code data for ticket
 */
export function generateTicketQRData(
  ticketId: string,
  eventId: string,
  walletAddress: string
): string {
  return JSON.stringify({
    ticketId,
    eventId,
    walletAddress,
    timestamp: Date.now(),
    platform: 'CACK-pass'
  })
}

/**
 * Get transaction explorer URL
 */
export function getTransactionExplorerUrl(txHash: string): string {
  const explorerBase = 'https://blockscout.lisk.com'
  return `${explorerBase}/tx/${txHash}`
}

/**
 * Get address explorer URL
 */
export function getAddressExplorerUrl(address: string): string {
  const explorerBase = 'https://blockscout.lisk.com'
  return `${explorerBase}/address/${address}`
}

// Export contract ABI for frontend use
export { CackPassCoreABI }