// lib/contracts/client.ts
// ✅ ADDED: Remove static import, will use dynamic import
// ❌ REMOVED: import { ethers } from 'ethers'
import { CackPassCoreABI } from './abis/CackPassCore'
import { TicketMarketABI } from './abis/TicketMarket'
import { RoyaltyEngineABI } from './abis/RoyaltyEngine'

// ============ TYPES ============
export interface EventData {
  organizer: string;
  name: string;
  baseURI: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
}

export interface TicketTypeData {
  maxTickets: number;
  ticketsSold: number;
  available: number;
  price: string;
  isActive: boolean;
}

// ✅ ADDED: Type for ethers Contract
export type EthersContract = any; // Will be properly typed at runtime

// ✅ ADDED: Module cache for ethers
let ethersModuleCache: any = null;

// ✅ ADDED: Helper function to dynamically load ethers
async function loadEthers() {
  if (!ethersModuleCache) {
    ethersModuleCache = await import('ethers');
  }
  return ethersModuleCache;
}

// ✅ UPDATED: Get provider with dynamic import
export async function getProvider() {
  const { ethers } = await loadEthers();
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum)
  }
  return new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL!)
}

// ✅ UPDATED: Get contract with dynamic import - FIXED TYPE ERROR
export async function getContract<T = any>(
  contractAddress: string,
  abi: any,
  signer?: any
): Promise<T> {
  const { ethers } = await loadEthers();
  const provider = signer || await getProvider()
  // ✅ FIXED: Explicitly type as ethers.Contract
  const contract = new ethers.Contract(contractAddress, abi, provider) as T
  return contract
}

// ✅ UPDATED: Type-safe contract instances - THESE ARE THE EXPORTED FUNCTIONS
export const getCackPassCore = async (signer?: any): Promise<any> => 
  getContract(process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS!, CackPassCoreABI, signer)

export const getTicketMarket = async (signer?: any): Promise<any> => 
  getContract(process.env.NEXT_PUBLIC_TICKET_MARKET_ADDRESS!, TicketMarketABI, signer)

export const getRoyaltyEngine = async (signer?: any): Promise<any> => 
  getContract(process.env.NEXT_PUBLIC_ROYALTY_ENGINE_ADDRESS!, RoyaltyEngineABI, signer)

// ✅ UPDATED: Helper function to get signer from Privy wallet
export async function getSignerFromWallet(wallet: any): Promise<any> {
  try {
    const { ethers } = await loadEthers();
    // Get provider from wallet
    const provider = await wallet.getEthereumProvider()
    const ethersProvider = new ethers.BrowserProvider(provider)
    const signer = await ethersProvider.getSigner()
    return signer
  } catch (error) {
    console.error('Error getting signer from wallet:', error)
    throw error
  }
}

// ============ NEW FUNCTIONS FOR GASLESS MINTING ============

// Alias for getCackPassCore for backward compatibility with new code
export const getContractClient = () => getCackPassCore();

// ✅ UPDATED: Get event data with proper typing
export async function getEventData(eventId: number): Promise<EventData> {
  const { ethers } = await loadEthers();
  const contract = await getCackPassCore();
  try {
    const event = await contract.events(eventId);
    
    // Check if event exists (organizer is not zero address)
    if (event.organizer === ethers.ZeroAddress) {
      throw new Error('Event not found');
    }
    
    return {
      organizer: event.organizer,
      name: event.name,
      baseURI: event.baseURI,
      startTime: Number(event.startTime),
      endTime: Number(event.endTime),
      isActive: event.isActive,
    };
  } catch (error) {
    console.error('Error fetching event data:', error);
    throw error;
  }
}

// ✅ UPDATED: Get available tickets with proper typing
export async function getAvailableTickets(eventId: number, ticketCategory: number): Promise<TicketTypeData> {
  const contract = await getCackPassCore();
  try {
    const ticketType = await contract.ticketTypes(eventId, ticketCategory);
    
    return {
      maxTickets: Number(ticketType.maxTickets),
      ticketsSold: Number(ticketType.ticketsSold),
      available: Number(ticketType.maxTickets) - Number(ticketType.ticketsSold),
      price: ticketType.ticketPrice.toString(),
      isActive: ticketType.isActive,
    };
  } catch (error) {
    console.error('Error fetching ticket availability:', error);
    throw error;
  }
}

// ✅ UPDATED: Check ticket availability
export async function checkTicketAvailability(
  eventId: number, 
  ticketCategory: number, 
  amount: number
): Promise<boolean> {
  try {
    const ticketData = await getAvailableTickets(eventId, ticketCategory);
    return ticketData.available >= amount && ticketData.isActive;
  } catch (error) {
    console.error('Error checking ticket availability:', error);
    return false;
  }
}

// ✅ UPDATED: Get ticket price
export async function getTicketPrice(eventId: number, ticketCategory: number): Promise<string> {
  try {
    const contract = await getCackPassCore();
    const ticketType = await contract.ticketTypes(eventId, ticketCategory);
    return ticketType.ticketPrice.toString();
  } catch (error) {
    console.error('Error getting ticket price:', error);
    return '0';
  }
}

// ✅ UPDATED: Check if event is active
export async function isEventActive(eventId: number): Promise<boolean> {
  try {
    const event = await getEventData(eventId);
    const currentTime = Math.floor(Date.now() / 1000);
    return event.isActive && currentTime >= event.startTime && currentTime <= event.endTime;
  } catch (error) {
    console.error('Error checking event status:', error);
    return false;
  }
}

// ✅ UPDATED: Get all ticket categories for an event
export async function getEventTicketCategories(eventId: number): Promise<TicketTypeData[]> {
  const categories = [0, 1, 2, 3]; // From TicketCategory enum
  const results: TicketTypeData[] = [];
  
  for (const category of categories) {
    try {
      const ticketData = await getAvailableTickets(eventId, category);
      if (ticketData.maxTickets > 0) {
        results.push({
          category,
          ...ticketData
        } as any);
      }
    } catch (error) {
      // Category might not exist for this event, skip
      continue;
    }
  }
  
  return results;
}