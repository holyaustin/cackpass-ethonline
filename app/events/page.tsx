// app/events/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Calendar, MapPin, Ticket } from 'lucide-react'
import { EventCard } from '@/components/events/EventCard'

interface Event {
  id: string
  title: string
  description: string
  venue: string
  startDate: string
  bannerImage: string
  ticketTypes: {
    price: number
    category: string
  }[]
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    // Fetch from API
    const res = await fetch('/api/events')
    const data = await res.json()
    setEvents(data.events)
  }

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
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        {/* Empty State */}
        {events.length === 0 && (
          <div className="text-center py-12">
            <Ticket className="h-24 w-24 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No events found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your search or check back later
            </p>
          </div>
        )}
      </div>
    </div>
  )
}