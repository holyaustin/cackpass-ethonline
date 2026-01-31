export interface MintApproval {
  recipient: string;
  eventId: number;
  ticketCategory: number;
  amount: number;
  price: string;
  validUntil: number;
  id: string;
}

export interface TicketInfo {
  ticketId: string;
  eventId: number;
  category: number;
  isUsed: boolean;
  mintedAt: number;
  metadataURI?: string;
}

export interface EventInfo {
  id: number;
  name: string;
  organizer: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
  baseURI: string;
}