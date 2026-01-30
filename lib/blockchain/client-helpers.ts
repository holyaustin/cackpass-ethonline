// /lib/blockchain/client-helpers.ts - CLIENT-ONLY HELPERS
'use client'

import { ethers } from 'ethers'

export enum TicketCategory {
  GeneralAdmission = 0,
  ReservedSeating = 1,
  VIPPremium = 2,
  Others = 3
}

export function generateApprovalId(): string {
  return ethers.id(Date.now().toString() + Math.random().toString())
}

export function isFreeEvent(priceAmount: string): boolean {
  return parseFloat(priceAmount) === 0
}

export function createTicketMetadata(
  eventData: any,
  imageCid: string,
  ticketType: string,
  price: string,
  category: TicketCategory
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.com'
  
  return {
    name: `${eventData.eventName} - ${ticketType}`,
    description: eventData.description,
    image: imageCid ? `ipfs://${imageCid}` : '',
    external_url: `${appUrl}/tickets`,
    attributes: [
      {
        trait_type: "Event",
        value: eventData.eventName
      },
      {
        trait_type: "Category",
        value: ticketType
      },
      {
        trait_type: "Ticket Category ID",
        value: category.toString()
      },
      {
        trait_type: "Price",
        value: price
      },
      {
        trait_type: "Location",
        value: eventData.location
      },
      {
        trait_type: "Date",
        value: `${eventData.startDate} ${eventData.startTime}`
      },
      {
        trait_type: "Is Virtual",
        value: eventData.showVirtualOptions ? "Yes" : "No"
      },
      {
        trait_type: "Is Free",
        value: price === '0' ? "Yes" : "No"
      }
    ]
  }
}

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