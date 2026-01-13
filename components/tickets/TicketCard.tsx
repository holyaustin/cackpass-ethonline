// components/tickets/TicketCard.tsx
'use client'

import { useState } from 'react'
import { Calendar, MapPin, Ticket as TicketIcon, QrCode, Share2 } from 'lucide-react'

interface TicketCardProps {
  ticket: {
    id: string
    eventName: string
    eventDate: string
    venue: string
    ticketType: string
    price: number
    qrCode: string
    status: 'active' | 'used' | 'transferred'
    eventImage?: string
  }
}

export function TicketCard({ ticket }: TicketCardProps) {
  const [showQR, setShowQR] = useState(false)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'used': return 'bg-gray-500'
      case 'transferred': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      {/* Event Image */}
      <div className="relative h-40 bg-gradient-to-r from-primary/20 to-secondary/20">
        {ticket.eventImage ? (
          <img
            src={ticket.eventImage}
            alt={ticket.eventName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <TicketIcon className="h-16 w-16 text-primary/30" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <span className={`px-3 py-1 ${getStatusColor(ticket.status)} text-white rounded-full text-sm font-medium capitalize`}>
            {ticket.status}
          </span>
        </div>
      </div>

      {/* Ticket Content */}
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 line-clamp-1">
          {ticket.eventName}
        </h3>
        
        <div className="space-y-3 mb-6">
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="text-sm">{formatDate(ticket.eventDate)}</span>
          </div>
          
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="text-sm line-clamp-1">{ticket.venue}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {ticket.ticketType}
            </span>
            <span className="text-lg font-bold text-primary">
              ${ticket.price}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowQR(!showQR)}
            className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center justify-center gap-2"
          >
            <QrCode className="h-4 w-4" />
            Show QR
          </button>
          
          <button className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>

        {/* QR Code Display */}
        {showQR && (
          <div className="mt-6 pt-6 border-t">
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
              <div className="w-48 h-48 mx-auto bg-white p-4 rounded">
                {ticket.qrCode ? (
                  <img
                    src={ticket.qrCode}
                    alt="Ticket QR Code"
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <QrCode className="h-32 w-32 text-gray-300" />
                  </div>
                )}
              </div>
              <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
                Show this QR code at the entrance
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}