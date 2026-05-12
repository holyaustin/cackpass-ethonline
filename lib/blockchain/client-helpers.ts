'use client'

// ✅ ADDED: Remove static import, will use dynamic import
// ❌ REMOVED: import { ethers } from 'ethers'
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
// Add payment receiver address
const PAYMENT_RECEIVER_ADDRESS = process.env.NEXT_PUBLIC_PAYMENT_RECEIVER_ADDRESS || '0x2c3b2b2325610a6814f2f822d0bf4dab8cf16e16'

// ✅ ADDED: Module cache for ethers to avoid multiple dynamic imports
let ethersModuleCache: any = null;

// ✅ ADDED: Helper function to dynamically load ethers
async function loadEthers() {
  if (!ethersModuleCache) {
    ethersModuleCache = await import('ethers');
  }
  return ethersModuleCache;
}

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
 * Validate wallet address - UPDATED to use dynamic ethers
 */
export async function isValidWalletAddress(address: string): Promise<boolean> {
  try {
    const { ethers } = await loadEthers();
    return ethers.isAddress(address)
  } catch {
    return false
  }
}

/**
 * Shorten wallet address for display - UPDATED to use async
 */
export async function shortenAddress(address: string, chars = 4): Promise<string> {
  const isValid = await isValidWalletAddress(address);
  if (!address || !isValid) {
    return 'Invalid Address'
  }
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/**
 * Convert wei to ether - UPDATED to use dynamic ethers
 */
export async function weiToEther(wei: bigint | string): Promise<string> {
  try {
    const { ethers } = await loadEthers();
    const weiBigInt = typeof wei === 'string' ? BigInt(wei) : wei
    return ethers.formatEther(weiBigInt)
  } catch (error) {
    console.error('Error converting wei to ether:', error)
    return '0'
  }
}

/**
 * Convert ether to wei - UPDATED to use dynamic ethers
 */
export async function etherToWei(ether: string): Promise<bigint> {
  try {
    const { ethers } = await loadEthers();
    return ethers.parseEther(ether)
  } catch (error) {
    console.error('Error converting ether to wei:', error)
    return 0n
  }
}

// ============ NEW PAYMENT FUNCTIONS ============

/**
 * Get payment receiver address for ticket purchases
 * All payments should go to this address
 */
export function getPaymentReceiverAddress(): string {
  return PAYMENT_RECEIVER_ADDRESS
}

/**
 * Format price for display with currency symbol
 */
export function formatPriceWithCurrency(price: number | string, currency: string = 'USD'): string {
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
 * Calculate total price with quantity
 */
export function calculateTotalPriceWithQuantity(price: number, quantity: number, currency: string = 'USD'): string {
  const total = price * quantity
  return formatPriceWithCurrency(total, currency)
}

/**
 * Validate payment parameters before processing - UPDATED to use async
 */
export async function validatePaymentParameters(
  walletAddress: string,
  eventId: string | number,
  amount: number,
  quantity: number
): Promise<{ valid: boolean; error?: string }> {
  const isValid = await isValidWalletAddress(walletAddress);
  if (!isValid) {
    return { valid: false, error: 'Invalid wallet address' }
  }
  
  if (!eventId || (typeof eventId === 'string' && eventId.trim() === '')) {
    return { valid: false, error: 'Invalid event ID' }
  }
  
  if (amount < 0) {
    return { valid: false, error: 'Amount cannot be negative' }
  }
  
  if (quantity <= 0) {
    return { valid: false, error: 'Quantity must be at least 1' }
  }
  
  if (quantity > 10) {
    return { valid: false, error: 'Maximum 10 tickets per purchase' }
  }
  
  return { valid: true }
}

/**
 * Create mock signature for development (not for production)
 */
export function createMockSignature(): string {
  return '0x' + '00'.repeat(65)
}

/**
 * Calculate transaction value to send to payment receiver - UPDATED to use dynamic ethers
 */
export async function calculateTransactionValue(price: number, quantity: number): Promise<bigint> {
  const total = price * quantity
  return await etherToWei(total.toString())
}

/**
 * Generate payment approval data for wallet payments - UPDATED to use dynamic ethers
 */
export async function generatePaymentApproval(
  recipient: string,
  eventId: number,
  amount: number = 1,
  price: number = 0
): Promise<{
  approvalId: string
  signature: string
  signatureData: any
  validUntil: number
}> {
  const approvalId = generateApprovalId()
  const validUntil = Math.floor(Date.now() / 1000) + 3600 // 1 hour
  
  // For development, use mock signature
  // In production, this should be signed by the backend
  const signature = createMockSignature()
  
  const signatureData = {
    recipient,
    eventId,
    amount,
    price: await etherToWei(price.toString()),
    validUntil,
    id: approvalId
  }
  
  return {
    approvalId,
    signature,
    signatureData,
    validUntil
  }
}

// ============ CONTRACT INTERACTION HELPERS ============

/**
 * Get provider instance (read-only) - UPDATED to use dynamic ethers
 */
export async function getProvider(): Promise<any> {
  const { ethers } = await loadEthers();
  return new ethers.JsonRpcProvider(RPC_URL, undefined, {
    batchMaxCount: 1,
    staticNetwork: null,
    cacheTimeout: -1,
    pollingInterval: 1000,
  })
}

/**
 * Get contract instance (read-only) - UPDATED to use dynamic ethers
 */
export async function getContract(): Promise<any> {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not configured')
  }
  
  const provider = await getProvider()
  const { ethers } = await loadEthers();
  return new ethers.Contract(CONTRACT_ADDRESS, CackPassCoreABI, provider)
}

/**
 * Get contract with signer (for write operations)
 * Note: This should only be used on the backend - UPDATED to use dynamic ethers
 */
export async function getContractWithSigner(privateKey: string): Promise<any> {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not configured')
  }
  
  const provider = await getProvider()
  const { ethers } = await loadEthers();
  const wallet = new ethers.Wallet(privateKey, provider)
  return new ethers.Contract(CONTRACT_ADDRESS, CackPassCoreABI, wallet)
}

/**
 * Check available tickets for an event - UPDATED to use dynamic contract
 */
export async function getAvailableTickets(
  eventId: number,
  ticketCategory: TicketCategory
): Promise<{ available: number; maxTickets: number; ticketsSold: number }> {
  try {
    const contract = await getContract()
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
 * Get event information from blockchain - UPDATED to use dynamic contract
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
    const contract = await getContract()
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
 * Verify ticket ownership - UPDATED to use dynamic contract
 */
export async function verifyTicketOwnership(
  walletAddress: string,
  ticketId: number
): Promise<boolean> {
  try {
    const isValid = await isValidWalletAddress(walletAddress);
    if (!isValid) {
      return false
    }
    
    const contract = await getContract()
    const balance = await contract.balanceOf(walletAddress, ticketId)
    
    return Number(balance) > 0
  } catch (error) {
    console.error('Error verifying ticket ownership:', error)
    return false
  }
}

/**
 * Get ticket metadata URI - UPDATED to use dynamic contract
 */
export async function getTicketURI(ticketId: number): Promise<string> {
  try {
    const contract = await getContract()
    return await contract.uri(ticketId)
  } catch (error) {
    console.error('Error fetching ticket URI:', error)
    return ''
  }
}

/**
 * Check if payment is settled for an event - UPDATED to use dynamic contract
 */
export async function isPaymentSettled(eventId: number): Promise<boolean> {
  try {
    const contract = await getContract()
    return await contract.isPaymentSettled(eventId)
  } catch (error) {
    console.error('Error checking payment settlement:', error)
    return false
  }
}

/**
 * Get payment settlement info - UPDATED to use dynamic contract
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
    const contract = await getContract()
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
 * Get backend signer address - UPDATED to use dynamic contract
 */
export async function getBackendSigner(): Promise<string> {
  try {
    const contract = await getContract()
    return await contract.getBackendSigner()
  } catch (error) {
    console.error('Error getting backend signer:', error)
    return ''
  }
}

/**
 * Get ticket category from ticket ID - UPDATED to use dynamic contract
 */
export async function getTicketCategoryFromId(ticketId: number): Promise<number> {
  try {
    const contract = await getContract()
    return await contract.getTicketCategory(ticketId)
  } catch (error) {
    console.error('Error getting ticket category:', error)
    return 0
  }
}

/**
 * Get event ID from ticket ID - UPDATED to use dynamic contract
 */
export async function getEventIdFromTicket(ticketId: number): Promise<number> {
  try {
    const contract = await getContract()
    return await contract.getEventId(ticketId)
  } catch (error) {
    console.error('Error getting event ID from ticket:', error)
    return 0
  }
}

/**
 * Check if ticket has been used - UPDATED to use dynamic contract
 */
export async function isTicketUsed(ticketId: number): Promise<boolean> {
  try {
    const contract = await getContract()
    return await contract.isTicketUsed(ticketId)
  } catch (error) {
    console.error('Error checking ticket usage:', error)
    return false
  }
}

/**
 * Generate payment approval data structure - UPDATED to use dynamic ethers
 * Note: Actual signing should be done on backend
 */
export async function generatePaymentApprovalData(
  walletAddress: string,
  eventId: number,
  ticketCategory: TicketCategory,
  amount: number,
  price: bigint
): Promise<MintApproval> {
  const { ethers } = await loadEthers();
  
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
 * Validate ticket purchase parameters - UPDATED to use async
 */
export async function validatePurchaseParams(
  walletAddress: string,
  eventId: number,
  quantity: number,
  price: number
): Promise<{ valid: boolean; error?: string }> {
  const isValid = await isValidWalletAddress(walletAddress);
  if (!isValid) {
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