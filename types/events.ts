// types/events.ts
export interface EventTicketType {
  id: string
  name: string
  price: number
  category: string
  maxSupply: number
  currentSupply: number
}

export interface EventOrganizer {
  name: string
  avatar: string
}

export interface EventData {
  id: string
  title: string
  description: string
  venue: string
  startDate: string
  endDate: string
  bannerImage: string
  ticketTypes: EventTicketType[]
  organizer: EventOrganizer
  isVirtual: boolean
  category: string
  rating: number
  attendees: number
}