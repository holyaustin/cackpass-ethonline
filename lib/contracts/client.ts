import { ethers } from 'ethers'
import { CackPassCoreABI } from './abis/CackPassCore'
import { TicketMarketABI } from './abis/TicketMarket'
import { RoyaltyEngineABI } from './abis/RoyaltyEngine'

export function getProvider() {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum)
  }
  return new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL!)
}

export function getContract<T extends ethers.Contract>(
  contractAddress: string,
  abi: any,
  signer?: ethers.Signer | ethers.Provider
): T {
  const provider = signer || getProvider()
  return new ethers.Contract(contractAddress, abi, provider) as T
}

// Type-safe contract instances - THESE ARE THE EXPORTED FUNCTIONS
export const getCackPassCore = (signer?: ethers.Signer) => 
  getContract(process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS!, CackPassCoreABI, signer)

export const getTicketMarket = (signer?: ethers.Signer) => 
  getContract(process.env.NEXT_PUBLIC_TICKET_MARKET_ADDRESS!, TicketMarketABI, signer)

export const getRoyaltyEngine = (signer?: ethers.Signer) => 
  getContract(process.env.NEXT_PUBLIC_ROYALTY_ENGINE_ADDRESS!, RoyaltyEngineABI, signer)

// Helper function to get signer from Privy wallet
export async function getSignerFromWallet(wallet: any): Promise<ethers.Signer> {
  try {
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

export async function getEventData(eventId: number) {
  const contract = getCackPassCore();
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

export async function getAvailableTickets(eventId: number, ticketCategory: number) {
  const contract = getCackPassCore();
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

export async function getTicketPrice(eventId: number, ticketCategory: number): Promise<string> {
  try {
    const contract = getCackPassCore();
    const ticketType = await contract.ticketTypes(eventId, ticketCategory);
    return ticketType.ticketPrice.toString();
  } catch (error) {
    console.error('Error getting ticket price:', error);
    return '0';
  }
}

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

// Utility function to get all ticket categories for an event
export async function getEventTicketCategories(eventId: number) {
  const categories = [0, 1, 2, 3]; // From TicketCategory enum
  const results = [];
  
  for (const category of categories) {
    try {
      const ticketData = await getAvailableTickets(eventId, category);
      if (ticketData.maxTickets > 0) {
        results.push({
          category,
          ...ticketData
        });
      }
    } catch (error) {
      // Category might not exist for this event, skip
      continue;
    }
  }
  
  return results;
}