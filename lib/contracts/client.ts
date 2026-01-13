// lib/contracts/client.ts
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

// Type-safe contract instances
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