// components/events/EventCard.tsx - FINAL VERSION
'use client'

import { useState } from 'react'
import { Calendar, MapPin, Users, Ticket as TicketIcon, Clock, Star, Globe } from 'lucide-react'
import PurchaseModal from '@/components/tickets/PurchaseModal' 
import type { EventData } from '@/types/events'

interface EventCardProps {
  event: EventData
}

export function EventCard({ event }: EventCardProps) {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [selectedTicketType, setSelectedTicketType] = useState(event.ticketTypes[0])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return 'Date TBD'
    }
  }

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return 'Time TBD'
    }
  }

  const getAvailableTickets = (ticketType: any) => {
    return (ticketType.maxSupply || 0) - (ticketType.currentSupply || 0)
  }

  const isSoldOut = selectedTicketType ? getAvailableTickets(selectedTicketType) === 0 : true

  const handlePurchaseSuccess = (ticketId?: string) => {
    console.log('Purchase successful!', ticketId)
    // Optionally refresh the UI or show a success message
  }

  // Map EventData to PurchaseModal's expected format
  const mapEventToPurchaseModal = () => {
    return {
      id: event.id,
      title: event.title,
      startDate: event.startDate,
      venue: event.venue,
      isFree: event.isFree,
      price: selectedTicketType?.price || event.price,
      currency: event.currency,
      imageCid: event.imageCid,
      onChainId: event.onChainId,
      description: event.description,
      endDate: event.endDate,
      isVirtual: event.isVirtual,
      category: event.category,
      // Pass the organizer from EventData
      organizer: event.organizer || { name: '', avatar: '' }
    }
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
        {/* Event Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={event.bannerImage || '/placeholder-event.jpg'}
            alt={event.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
          
          {/* Category Badge */}
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full text-sm font-medium capitalize">
              {event.category || 'Event'}
            </span>
          </div>
          
          {/* Virtual Badge */}
          {event.isVirtual && (
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-primary/90 backdrop-blur-sm text-white rounded-full text-sm font-medium flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Virtual
              </span>
            </div>
          )}
          
          {/* Rating */}
          <div className="absolute bottom-4 left-4 flex items-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-1 rounded-full">
            <Star className="h-4 w-4 text-yellow-500 fill-current mr-1" />
            <span className="font-semibold">{event.rating?.toFixed(1) || '0.0'}</span>
          </div>
        </div>

        {/* Event Content */}
        <div className="p-6">
          {/* Event Title & Organizer */}
          <div className="mb-4">
            <h3 className="text-xl font-bold mb-2 line-clamp-1">
              {event.title}
            </h3>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <img
                src={event.organizer.avatar || '/placeholder-avatar.jpg'}
                alt={event.organizer.name || 'Organizer'}
                className="w-6 h-6 rounded-full mr-2"
              />
              <span className="text-sm">{event.organizer.name || 'Organizer'}</span>
            </div>
          </div>

          {/* Event Description */}
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 line-clamp-2">
            {event.description}
          </p>

          {/* Event Details */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm">
                {formatDate(event.startDate)} • {formatTime(event.startDate)}
              </span>
            </div>
            
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm line-clamp-1">
                {event.venue || 'Location not specified'}
              </span>
            </div>
            
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Users className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm">
                {(event.attendees || 0).toLocaleString()} attending
              </span>
            </div>
          </div>

          {/* Ticket Types */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <TicketIcon className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm font-medium">Available Tickets</span>
              </div>
              
              {event.ticketTypes && event.ticketTypes.length > 1 && (
                <select
                  className="text-sm bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-1"
                  onChange={(e) => {
                    const type = event.ticketTypes.find(t => t.id === e.target.value)
                    if (type) setSelectedTicketType(type)
                  }}
                  value={selectedTicketType?.id || ''}
                >
                  {event.ticketTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} - ${type.price}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold text-primary">
                  ${selectedTicketType?.price || 0}
                </span>
                <span className="text-gray-500 text-sm ml-2">per ticket</span>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedTicketType ? getAvailableTickets(selectedTicketType) : 0} remaining
                </div>
                {selectedTicketType && (
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                    <div 
                      className="bg-primary h-full rounded-full"
                      style={{ 
                        width: `${((selectedTicketType.currentSupply || 0) / (selectedTicketType.maxSupply || 1)) * 100}%` 
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => setShowPurchaseModal(true)}
            disabled={isSoldOut}
            className={`w-full py-3 rounded-xl font-semibold transition-all ${
              isSoldOut
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary-dark'
            }`}
          >
            {isSoldOut ? (
              <div className="flex items-center justify-center">
                <Clock className="h-4 w-4 mr-2" />
                Sold Out
              </div>
            ) : (
              'Get Tickets'
            )}
          </button>
        </div>
      </div>

      {/* Purchase Modal */}
      <PurchaseModal
        isOpen={showPurchaseModal}
        event={mapEventToPurchaseModal()}
        ticketType={selectedTicketType}
        onClose={() => setShowPurchaseModal(false)}
        onSuccess={handlePurchaseSuccess}
      />
    </>
  )
}