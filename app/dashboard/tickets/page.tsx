// app/dashboard/tickets/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Ticket, Calendar, MapPin, Filter, Search, Plus } from 'lucide-react'
import Link from 'next/link'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

interface TicketData {
  id: string
  eventName: string
  eventDate: string
  venue: string
  ticketType: string
  price: number
  status: 'active' | 'used' | 'transferred'
  qrCode?: string
}

export default function TicketsPage() {
  const { authenticated, ready } = usePrivy()
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'past'>('all')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authenticated && ready) {
      fetchTickets()
    }
  }, [authenticated, ready, filter])

  const fetchTickets = async () => {
    setIsLoading(true)
    try {
      // Mock data - replace with API call
      const mockTickets: TicketData[] = [
        {
          id: '1',
          eventName: 'TechFest Lagos 2024',
          eventDate: '2024-06-15T10:00:00Z',
          venue: 'Lagos Convention Center',
          ticketType: 'VIP Pass',
          price: 150,
          status: 'active',
        },
        {
          id: '2',
          eventName: 'AfroBeats Festival',
          eventDate: '2024-05-20T18:00:00Z',
          venue: 'National Stadium',
          ticketType: 'General Admission',
          price: 50,
          status: 'active',
        },
        {
          id: '3',
          eventName: 'Jazz Night',
          eventDate: '2024-03-10T20:00:00Z',
          venue: 'City Hall',
          ticketType: 'VIP',
          price: 75,
          status: 'used',
        },
      ]
      setTickets(mockTickets)
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!ready) return <LoadingSpinner fullScreen />
  if (!authenticated) return <div className="p-8 text-center">Please sign in to view tickets</div>

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.eventName.toLowerCase().includes(search.toLowerCase()) ||
                         ticket.venue.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || ticket.status === filter
    return matchesSearch && matchesFilter
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">My Tickets</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your digital tickets
              </p>
            </div>
            <Link
              href="/dashboard/create-ticket"
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Ticket
            </Link>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'active', 'past'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab as any)}
                  className={`px-4 py-3 rounded-2xl font-medium transition-colors ${
                    filter === tab
                      ? 'bg-primary text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tickets Grid */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-4 animate-pulse">
                <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : filteredTickets.length > 0 ? (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 glass-card rounded-2xl">
            <Ticket className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No tickets found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {filter === 'active' ? 'No active tickets' : 'No tickets match your filter'}
            </p>
            <Link href="/events" className="btn-primary">
              Browse Events
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function TicketCard({ ticket }: { ticket: TicketData }) {
  const eventDate = new Date(ticket.eventDate)
  const isPast = eventDate < new Date()

  return (
    <Link
      href={`/dashboard/tickets/${ticket.id}`}
      className="glass-card rounded-2xl p-4 hover:shadow-lg transition-all block"
    >
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-400 rounded-2xl flex items-center justify-center flex-shrink-0">
          <Ticket className="h-8 w-8 text-white" />
        </div>
        
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-lg mb-1">{ticket.eventName}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                <Calendar className="h-3 w-3" />
                {eventDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
                {!isPast && (
                  <span className="px-2 py-0.5 bg-green-500/10 text-green-600 text-xs rounded-full">
                    Upcoming
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="h-3 w-3" />
                {ticket.venue}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-lg font-bold text-primary">${ticket.price}</div>
              <div className="text-sm text-gray-500">{ticket.ticketType}</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              ticket.status === 'active' 
                ? 'bg-green-500/10 text-green-600'
                : ticket.status === 'used'
                ? 'bg-gray-500/10 text-gray-600'
                : 'bg-blue-500/10 text-blue-600'
            }`}>
              {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
            </div>
            <div className="text-sm text-gray-500">
              View Details →
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}