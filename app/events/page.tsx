// app/events/page.tsx - FIXED VERSION
'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Calendar, MapPin, Ticket, Globe, Users, Clock, ChevronRight, Loader2, Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { Event as EventType } from '@/lib/database/models'

// Event Card Component (MOVED OUTSIDE MAIN COMPONENT)
function EventCard({ event }: { event: Event }) {
  const categoryInfo = getCategoryInfo(event.category)
  const isEventUpcoming = isUpcoming(event.startDate)
  const eventDate = new Date(event.startDate)
  const eventTime = new Date(event.startDateTime || event.startDate)

  const imageUrl = event.imageCid 
    ? `https://gateway.pinata.cloud/ipfs/${event.imageCid}`
    : event.bannerImage || '/placeholder-event.jpg'

  return (
    <div className="card group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 animate-fade-in">
      {/* Event Image */}
      <div className="relative h-48 overflow-hidden rounded-t-2xl">
        <img
          src={imageUrl}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder-event.jpg'
          }}
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        
        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-3 py-1.5 text-white text-xs font-bold rounded-full backdrop-blur-md ${categoryInfo.color}`}>
            {categoryInfo.icon} {event.customCategory || categoryInfo.label}
          </span>
        </div>
        
        {/* Virtual Badge */}
        {event.isVirtual && (
          <div className="absolute top-3 right-3">
            <span className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold rounded-full backdrop-blur-md flex items-center gap-1">
              <Globe className="h-3 w-3" />
              Virtual
            </span>
          </div>
        )}
        
        {/* Price Badge - HIGHLY VISIBLE */}
        <div className="absolute bottom-3 left-3">
          <span className={`px-4 py-2 text-white text-sm font-bold rounded-xl shadow-xl flex items-center gap-2 backdrop-blur-md ${
            event.isFree 
              ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
              : 'bg-gradient-to-r from-blue-500 to-purple-600'
          }`}>
            {event.isFree ? (
              <>
                <span className="text-lg">🎫</span>
                <span className="font-black">FREE</span>
              </>
            ) : (
              <>
                <span className="text-lg">💰</span>
                <span className="font-black">PAID - {event.currency} {event.price}</span>
              </>
            )}
          </span>
        </div>
        
        {/* Status Badge */}
        {!isEventUpcoming && (
          <div className="absolute bottom-3 right-3">
            <span className="px-3 py-1.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-xs font-bold rounded-full backdrop-blur-md flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Past
            </span>
          </div>
        )}
      </div>

      {/* Event Content */}
      <div className="p-5">
        {/* Event Title */}
        <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        
        {/* Event Description */}
        <p className="text-text-light text-sm mb-4 line-clamp-2">
          {event.description || 'An amazing event awaits!'}
        </p>

        {/* Event Details */}
        <div className="space-y-3 mb-5">
          {/* Date & Time */}
          <div className="flex items-center text-text">
            <Calendar className="h-4 w-4 text-text-light mr-2 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-medium">{formatDateHelper(eventDate)}</div>
              <div className="text-text-light text-xs">{formatTimeHelper(eventTime)}</div>
            </div>
          </div>
          
          {/* Location */}
          <div className="flex items-center text-text">
            <MapPin className="h-4 w-4 text-text-light mr-2 flex-shrink-0" />
            <span className="text-sm truncate">
              {event.venue || event.location?.address || 'Location TBA'}
            </span>
          </div>
          
          {/* Capacity */}
          {!event.unlimitedCapacity && event.capacity && (
            <div className="flex items-center text-text">
              <Users className="h-4 w-4 text-text-light mr-2 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium">{event.capacity}</span>
                <span className="text-text-light"> spots available</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Link
            href={`/events/${event._id}`}
            className="btn-primary flex-1 py-3 text-center text-sm"
          >
            View Details
          </Link>
          {isEventUpcoming && (
            <Link
              href={`/events/${event._id}/tickets`}
              className="btn-outline flex-1 py-3 text-center text-sm"
            >
              Get Tickets
            </Link>
          )}
        </div>

        {/* Additional Info */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-text-light">
            <span>🎫 {event.ticketType}</span>
            {event.isOnChain && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                On-chain
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Define Event interface (MOVED TO TOP LEVEL)
interface Event {
  _id: string
  title: string
  description: string
  venue: string
  location?: {
    address?: string
  }
  startDate: string | Date
  endDate: string | Date
  startDateTime?: string | Date
  endDateTime?: string | Date
  bannerImage?: string
  imageCid?: string
  category: string
  customCategory?: string
  isVirtual: boolean
  isFree: boolean
  price: number
  currency: string
  ticketType: string
  unlimitedCapacity: boolean
  capacity?: number
  organizerId?: any
  organizerWallet: string
  isOnChain: boolean
  status: string
  isActive: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

// Define categories at top level
const CATEGORIES = [
  { value: 'all', label: 'All Events', icon: '🎉', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
  { value: 'music', label: 'Music & Concerts', icon: '🎵', color: 'bg-gradient-to-r from-pink-500 to-rose-500' },
  { value: 'business', label: 'Business & Tech', icon: '💼', color: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
  { value: 'arts', label: 'Arts & Culture', icon: '🎨', color: 'bg-gradient-to-r from-yellow-500 to-orange-500' },
  { value: 'sports', label: 'Sports & Fitness', icon: '⚽', color: 'bg-gradient-to-r from-green-500 to-emerald-500' },
  { value: 'food', label: 'Food & Drink', icon: '🍽️', color: 'bg-gradient-to-r from-red-500 to-orange-500' },
  { value: 'conference', label: 'Conferences', icon: '🎓', color: 'bg-gradient-to-r from-indigo-500 to-purple-500' },
  { value: 'festival', label: 'Festivals & Fairs', icon: '🎪', color: 'bg-gradient-to-r from-orange-500 to-red-500' },
  { value: 'other', label: 'Other', icon: '✨', color: 'bg-gradient-to-r from-gray-500 to-gray-700' },
]

// Helper functions at top level
function getCategoryInfo(category: string) {
  const cat = CATEGORIES.find(c => c.value === category)
  return cat || CATEGORIES[CATEGORIES.length - 1]
}

function isUpcoming(dateString: string | Date) {
  return new Date(dateString) > new Date()
}

function formatDateHelper(dateString: string | Date) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTimeHelper(dateString: string | Date) {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Main EventsPage Component
export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 12

  const fetchEvents = async (page = 1, refresh = false) => {
    try {
      if (page === 1) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        category: selectedCategory !== 'all' ? selectedCategory : '',
        priceType: priceFilter !== 'all' ? priceFilter : '',
        dateType: dateFilter !== 'all' ? dateFilter : '',
        search: search || '',
      })

      const response = await fetch(`/api/events?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }

      const data = await response.json()
      
      if (refresh || page === 1) {
        setEvents(data.events || [])
      } else {
        setEvents(prev => [...prev, ...(data.events || [])])
      }
      
      setTotalPages(data.totalPages || 1)
      setFilteredEvents(data.events || [])
      
    } catch (error) {
      console.error('Error fetching events:', error)
      toast.error('Failed to load events. Please try again.')
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchEvents(1, true)
  }, [selectedCategory, priceFilter, dateFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEvents(1, true)
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  const loadMore = () => {
    if (currentPage < totalPages && !isLoadingMore) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      fetchEvents(nextPage)
    }
  }

  const resetFilters = () => {
    setSelectedCategory('all')
    setPriceFilter('all')
    setDateFilter('upcoming')
    setSearch('')
  }

  return (
    <div className="min-h-screen bg-gradient-background relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="orb-decoration orb-1"></div>
      <div className="orb-decoration orb-2"></div>

      {/* Main Content */}
      <div className="responsive-container py-8 md:py-12" id="events-grid">
        {/* Filters Bar */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-text-light h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search events, venues, or organizers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pl-12 pr-4 py-4 text-lg shadow-lg"
                />
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-3">
              <button
                onClick={resetFilters}
                className="px-6 py-4 bg-surface dark:bg-dark-surface text-text dark:text-dark-text rounded-2xl font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <Filter className="h-5 w-5" />
                Reset
              </button>
              <Link
                href="/dashboard/create-ticket"
                className="btn-primary px-6 py-4 flex items-center gap-2"
              >
                <Ticket className="h-5 w-5" />
                Create Event
              </Link>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="space-y-6">
            {/* Category Filters */}
            <div>
              <h3 className="text-sm font-semibold text-text-light mb-4">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                      selectedCategory === category.value
                        ? `${category.color} text-white shadow-lg`
                        : 'bg-surface dark:bg-dark-surface text-text dark:text-dark-text hover:shadow-md'
                    }`}
                  >
                    <span>{category.icon}</span>
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price & Date Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-text-light mb-3">Price Type</h3>
                <div className="flex gap-2">
                  {['all', 'free', 'paid'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setPriceFilter(type as any)}
                      className={`px-4 py-3 rounded-xl font-medium capitalize transition-all ${
                        priceFilter === type
                          ? type === 'free' 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                            : type === 'paid'
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                            : 'btn-primary'
                          : 'bg-surface dark:bg-dark-surface text-text dark:text-dark-text hover:shadow-md'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-text-light mb-3">Date</h3>
                <div className="flex gap-2">
                  {['all', 'upcoming', 'past'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setDateFilter(type as any)}
                      className={`px-4 py-3 rounded-xl font-medium capitalize transition-all ${
                        dateFilter === type
                          ? 'btn-primary'
                          : 'bg-surface dark:bg-dark-surface text-text dark:text-dark-text hover:shadow-md'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-primary animate-spin-slow flex items-center justify-center">
              <Ticket className="h-8 w-8 text-white" />
            </div>
            <p className="text-text-light text-lg">Loading amazing events...</p>
          </div>
        ) : filteredEvents.length > 0 ? (
          <>
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-text">
                    {selectedCategory !== 'all' 
                      ? `${getCategoryInfo(selectedCategory).label} Events`
                      : 'All Events'
                    }
                  </h2>
                  <p className="text-text-light mt-1">
                    {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} found
                  </p>
                </div>
                <div className="text-sm text-text-light bg-surface dark:bg-dark-surface px-4 py-2 rounded-xl">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
            </div>

            {/* Responsive Grid: 4 columns on xl, 3 on lg, 2 on sm, 1 on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {filteredEvents.map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>

            {/* Load More Button */}
            {currentPage < totalPages && (
              <div className="text-center mb-12">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="btn-primary px-8 py-4 text-lg flex items-center gap-2 mx-auto"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Load More Events
                      <ChevronRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 card">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-primary/10 flex items-center justify-center">
              <Ticket className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-text mb-3">No events found</h3>
            <p className="text-text-light mb-8 max-w-md mx-auto">
              {search 
                ? `No events match "${search}". Try a different search or browse all events.`
                : 'No events match your current filters. Try adjusting your criteria.'
              }
            </p>
            <button
              onClick={resetFilters}
              className="btn-primary px-6 py-3"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-16 card-accent p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-primary"></div>
          <div className="max-w-3xl mx-auto text-center relative z-10">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-text mb-4">Ready to Host Your Event?</h2>
            <p className="text-text-light text-lg mb-8">
              Join thousands of organizers who trust CACKPass to create, manage, and monetize their events.
              Start your journey today!
            </p>
            <Link
              href="/dashboard/create-ticket"
              className="btn-primary px-8 py-4 text-lg inline-flex items-center gap-3"
            >
              <Ticket className="h-6 w-6" />
              Create Your First Event
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}