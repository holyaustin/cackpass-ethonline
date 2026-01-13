// app/events/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Calendar, MapPin, Ticket } from 'lucide-react'
import { EventCard } from '@/components/events/EventCard'
import type { EventData } from '@/types/events'

export default function EventsPage() {
  const [events, setEvents] = useState<EventData[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    // Mock data - replace with actual API call
    const mockEvents: EventData[] = [
      {
        id: '1',
        title: 'TechFest Lagos 2024',
        description: 'The largest technology conference in West Africa featuring speakers from Google, Microsoft, and local tech innovators.',
        venue: 'Lagos Convention Center',
        startDate: '2024-06-15T10:00:00Z',
        endDate: '2024-06-17T18:00:00Z',
        bannerImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
        ticketTypes: [
          {
            id: 'vip',
            name: 'VIP Pass',
            price: 150,
            category: 'VIPPremium',
            maxSupply: 100,
            currentSupply: 75,
          },
          {
            id: 'general',
            name: 'General Admission',
            price: 50,
            category: 'GeneralAdmission',
            maxSupply: 1000,
            currentSupply: 450,
          },
        ],
        organizer: {
          name: 'TechFest Africa',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TechFest',
        },
        isVirtual: false,
        category: 'conference',
        rating: 4.8,
        attendees: 1500,
      },
      {
        id: '2',
        title: 'AfroBeats Festival',
        description: 'Celebrate African music with performances from top artists across the continent.',
        venue: 'National Stadium',
        startDate: '2024-05-20T18:00:00Z',
        endDate: '2024-05-21T02:00:00Z',
        bannerImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
        ticketTypes: [
          {
            id: 'vip',
            name: 'Gold Circle',
            price: 120,
            category: 'VIPPremium',
            maxSupply: 200,
            currentSupply: 180,
          },
          {
            id: 'general',
            name: 'General Admission',
            price: 40,
            category: 'GeneralAdmission',
            maxSupply: 5000,
            currentSupply: 3200,
          },
        ],
        organizer: {
          name: 'AfroBeats Entertainment',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AfroBeats',
        },
        isVirtual: false,
        category: 'music',
        rating: 4.9,
        attendees: 5200,
      },
      {
        id: '3',
        title: 'Blockchain Summit Africa',
        description: 'Explore the future of blockchain technology in Africa with industry leaders and innovators.',
        venue: 'Virtual Event',
        startDate: '2024-04-10T09:00:00Z',
        endDate: '2024-04-12T17:00:00Z',
        bannerImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800',
        ticketTypes: [
          {
            id: 'vip',
            name: 'Premium Access',
            price: 99,
            category: 'VIPPremium',
            maxSupply: 500,
            currentSupply: 320,
          },
          {
            id: 'free',
            name: 'Free Pass',
            price: 0,
            category: 'GeneralAdmission',
            maxSupply: 10000,
            currentSupply: 7500,
          },
        ],
        organizer: {
          name: 'Blockchain Africa',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Blockchain',
        },
        isVirtual: true,
        category: 'technology',
        rating: 4.7,
        attendees: 8000,
      },
    ]

    setEvents(mockEvents)
  }

  // Filter events based on search and category
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(search.toLowerCase()) ||
                         event.description.toLowerCase().includes(search.toLowerCase()) ||
                         event.venue.toLowerCase().includes(search.toLowerCase())
    
    const matchesCategory = category === 'all' || event.category === category
    
    return matchesSearch && matchesCategory
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">
            Discover Amazing Events
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Find events near you or explore virtual experiences
          </p>
        </div>

        {/* Search & Filter */}
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events, artists, or venues..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <select
                className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="music">Music</option>
                <option value="sports">Sports</option>
                <option value="conference">Conference</option>
                <option value="virtual">Virtual</option>
                <option value="technology">Technology</option>
              </select>
              
              <button className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </button>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        {/* Empty State */}
        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <Ticket className="h-24 w-24 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No events found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Try adjusting your search or check back later
            </p>
            <button
              onClick={() => {
                setSearch('')
                setCategory('all')
              }}
              className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Event Count */}
        <div className="mt-8 text-center text-gray-600 dark:text-gray-400">
          Showing {filteredEvents.length} of {events.length} events
        </div>
      </div>
    </div>
  )
}