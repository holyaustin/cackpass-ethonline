// /components/events/EventCard.tsx
'use client'

import { useState, useEffect, memo } from 'react'
import { Calendar, MapPin, Users, Ticket as TicketIcon, Clock, Star, Globe } from 'lucide-react'
import PurchaseModal from '@/components/tickets/PurchaseModal'
import { OptimizedImage } from '@/components/common/OptimizedImage'
import type { EventData } from '@/types/events'

interface EventCardProps {
  event: EventData
  priority?: boolean // Pass true for the first 3 cards in lists to maximize LCP speeds
}

// 🏎️ Hoist date and time helper formatters out of the component loop to save CPU cycles
const formatDate = (dateString: string) => {
  if (!dateString) return 'Date TBD'
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
  if (!dateString) return 'Time TBD'
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
  if (!ticketType) return 0
  return Math.max(0, (ticketType.maxSupply || 0) - (ticketType.currentSupply || 0))
}

function EventCardComponent({ event, priority = false }: EventCardProps) {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [selectedTicketType, setSelectedTicketType] = useState<any>(null)

  // 🏎️ Sync ticket configuration state instantly if the parent feeds dynamic data streams
  useEffect(() => {
    if (event?.ticketTypes && event.ticketTypes.length > 0) {
      setSelectedTicketType(event.ticketTypes[0])
    } else {
      setSelectedTicketType(null)
    }
  }, [event])

  // 🏎️ Parse dynamic image urls cleanly relative to your configuration settings
  const baseGateway = process.env.NEXT_PUBLIC_GATEWAY_URL || 'https://pinata.cloud'
  const imageUrl = event.imageCid
    ? `${baseGateway}/ipfs/${event.imageCid}`
    : event.bannerImage || '/placeholder-event.jpg'

  const isSoldOut = selectedTicketType ? getAvailableTickets(selectedTicketType) === 0 : true

  const handlePurchaseSuccess = (ticketId?: string) => {
    console.log('Purchase successful!', ticketId)
  }

  // Pre-mapped structured data to eliminate template variable regeneration spikes
  const mappedEventPayload = {
    id: event.id,
    title: event.title,
    startDate: event.startDate,
    venue: event.venue,
    isFree: event.isFree,
    price: selectedTicketType?.price || event.price,
    currency: event.currency || 'USD',
    imageCid: event.imageCid,
    onChainId: event.onChainId,
    description: event.description,
    endDate: event.endDate,
    isVirtual: event.isVirtual,
    category: event.category,
    organizer: event.organizer || { name: 'Organizer', avatar: '/placeholder-avatar.jpg' },
  }

  // Calculate ticket supply bars cleanly to prevent math division errors
  const supplyRatio = selectedTicketType
    ? ((selectedTicketType.currentSupply || 0) / (selectedTicketType.maxSupply || 1)) * 100
    : 0

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700/50 flex flex-col justify-between h-full">
        <div>
          {/* Event Image Box Container */}
          <div className="relative h-48 overflow-hidden">
            <OptimizedImage
              src={imageUrl}
              alt={event.title || 'Event Cover'}
              fill
              priority={priority}
              className="object-cover hover:scale-105 transition-transform duration-500"
              fallbackSrc="/placeholder-event.jpg"
            />

            {/* Category Badge */}
            <div className="absolute top-4 left-4 z-10">
              <span className="px-3 py-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full text-sm font-semibold capitalize text-gray-900 dark:text-gray-100 shadow-sm">
                {event.category || 'Event'}
              </span>
            </div>

            {/* Virtual Badge */}
            {event.isVirtual && (
              <div className="absolute top-4 right-4 z-10">
                <span className="px-3 py-1 bg-primary/90 backdrop-blur-sm text-white rounded-full text-sm font-semibold flex items-center gap-1 shadow-sm">
                  <Globe className="h-3 w-3" />
                  Virtual
                </span>
              </div>
            )}

            {/* Rating Box */}
            <div className="absolute bottom-4 left-4 flex items-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-1 rounded-full z-10 shadow-sm">
              <Star className="h-4 w-4 text-yellow-500 fill-current mr-1" />
              <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                {event.rating?.toFixed(1) || '0.0'}
              </span>
            </div>
          </div>

          {/* Event Body Description */}
          <div className="p-6">
            {/* Event Title & Organizer Row */}
            <div className="mb-4">
              <h3 className="text-xl font-black mb-2 line-clamp-1 text-gray-900 dark:text-white" title={event.title}>
                {event.title}
              </h3>
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <img
                  src={event.organizer?.avatar || '/placeholder-avatar.jpg'}
                  alt={event.organizer?.name || 'Organizer'}
                  className="w-6 h-6 rounded-full mr-2 object-cover border border-gray-100 dark:border-gray-700"
                  loading="lazy"
                />
                <span className="text-sm font-medium">{event.organizer?.name || 'Organizer'}</span>
              </div>
            </div>

            {/* Event Paragraph Description text box */}
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 line-clamp-2 leading-relaxed">
              {event.description || 'No description provided.'}
            </p>

            {/* Structured Meta Fields Grid details list */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4 mr-2.5 text-gray-400 flex-shrink-0" />
                <span className="text-sm font-medium">
                  {formatDate(event.startDate)} • {formatTime(event.startDate)}
                </span>
              </div>

              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <MapPin className="h-4 w-4 mr-2.5 text-gray-400 flex-shrink-0" />
                <span className="text-sm line-clamp-1 font-medium">
                  {event.venue || 'Location not specified'}
                </span>
              </div>

              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Users className="h-4 w-4 mr-2.5 text-gray-400 flex-shrink-0" />
                <span className="text-sm font-medium">
                  {(event.attendees || 0).toLocaleString()} attending
                </span>
              </div>
            </div>

            {/* Ticket Management Dynamic Box */}
            <div className="mb-6 pt-4 border-t border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <TicketIcon className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Ticket Tier</span>
                </div>

                {event.ticketTypes && event.ticketTypes.length > 1 && (
                  <select
                    className="text-sm bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-1.5 font-medium border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary"
                    onChange={(e) => {
                      const type = event.ticketTypes.find((t) => t.id === e.target.value)
                      if (type) setSelectedTicketType(type)
                    }}
                    value={selectedTicketType?.id || ''}
                  >
                    {event.ticketTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-black text-primary">
                    {event.currency || '$'}
                    {selectedTicketType?.price ?? event.price ?? 0}
                  </span>
                  <span className="text-gray-400 text-xs ml-1.5 block sm:inline">per ticket</span>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    {selectedTicketType ? getAvailableTickets(selectedTicketType) : 0} remaining
                  </div>
                  {selectedTicketType && (
                    <div className="w-32 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mt-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${Math.min(supplyRatio, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons Footer */}
            <button
              onClick={() => setShowPurchaseModal(true)}
              disabled={isSoldOut}
              className={`w-full py-3.5 rounded-xl font-bold transition-all shadow-sm active:scale-[0.99] flex items-center justify-center ${
                isSoldOut
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary-dark hover:shadow-md'
              }`}
            >
              {isSoldOut ? 'Sold Out' : 'Get Tickets'}
            </button>
          </div>
        </div>
      </div>

      {/* Purchase Modal Portal */}
      {showPurchaseModal && (
        <PurchaseModal
          isOpen={showPurchaseModal}
          event={mappedEventPayload}
          ticketType={selectedTicketType}
          onClose={() => setShowPurchaseModal(false)}
          onSuccess={handlePurchaseSuccess}
        />
      )}
    </>
  )
}

// Wrap the main layout element in React memo layers to bypass expensive grid container ticks
export const EventCard = memo(EventCardComponent)