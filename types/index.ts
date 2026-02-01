// types/index.ts
export interface EventData {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  venue: string
  isVirtual: boolean
  isFree: boolean
  price: number
  currency: string
  category: string
  imageCid?: string
  bannerImage?: string
  onChainId?: number
  organizer: {
    name: string
    avatar: string
  }
  attendees: number
  rating: number
  ticketTypes: Array<{
    id: string
    name: string
    price: number
    maxSupply: number
    currentSupply: number
  }>
}