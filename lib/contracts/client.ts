// lib/contracts/client.ts
import { ethers } from 'ethers'
import CackPassCoreABI from './abis/CackPassCore.json'
import TicketMarketABI from './abis/TicketMarket.json'
import RoyaltyEngineABI from './abis/RoyaltyEngine.json'

export function getProvider() {
  return new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL!)
}

export function getContract(contractAddress: string, abi: any) {
  const provider = getProvider()
  return new ethers.Contract(contractAddress, abi, provider)
}

export const cackPassCore = getContract(
  process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS!,
  CackPassCoreABI
)

export const ticketMarket = getContract(
  process.env.NEXT_PUBLIC_TICKET_MARKET_ADDRESS!,
  TicketMarketABI
)

export const royaltyEngine = getContract(
  process.env.NEXT_PUBLIC_ROYALTY_ENGINE_ADDRESS!,
  RoyaltyEngineABI
)