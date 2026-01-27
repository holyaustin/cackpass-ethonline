// app/(main)/dashboard/tickets/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Ticket, Calendar, MapPin, ArrowRight, Filter, Search } from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import Link from 'next/link'

interface TicketData {
  id: string
  eventName: string
  eventDate: string
  venue: string
  ticketType: string
  price: number
  status: 'active' | 'used' | 'transferred'
  eventImage?: string
}

export default function TicketsPage() {
  const { authenticated, ready } = usePrivy()
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'past'>('all')

  useEffect(() => {
    if (authenticated && ready) {
      fetchTickets()
    }
  }, [authenticated, ready, filter])

  const fetchTickets = async () => {
    setIsLoading(true)
    try {
      // Mock data
      const mockTickets: TicketData[] = [
        {
          id: '1',
          eventName: 'TechFest Lagos 2024',
          eventDate: '2024-06-15T10:00:00Z',
          venue: 'Lagos Convention Center',
          ticketType: 'VIP Pass',
          price: 150,
          status: 'active',
          eventImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w-800',
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

      // Filter tickets
      const filteredTickets = filter === 'all' 
        ? mockTickets 
        : mockTickets.filter(ticket => ticket.status === filter)

      setTickets(filteredTickets)
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!ready) return <LoadingSpinner fullScreen />
  if (!authenticated) return <div className="p-8 text-center">Please sign in to view tickets</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50 dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">My Tickets</h1>
            <Link 
              href="/dashboard/create-ticket"
              className="btn-primary px-4 py-2 text-sm"
            >
              Create Ticket
            </Link>
          </div>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button className="p-2 border border-gray-300 dark:border-gray-600 rounded-xl">
              <Filter className="h-5 w-5" />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6">
            {['all', 'active', 'past'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab as any)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filter === tab
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tickets List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-4 animate-pulse">
                <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : tickets.length > 0 ? (
          <div className="space-y-4">
            {tickets.map((ticket) => (
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
  const now = new Date()
  const isPast = eventDate < now

  return (
    <Link 
      href={`/dashboard/tickets/${ticket.id}`}
      className="block glass-card rounded-2xl p-4 hover:scale-[1.01] transition-transform"
    >
      <div className="flex gap-4">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-400 rounded-xl flex items-center justify-center">
          <Ticket className="h-8 w-8 text-white" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-lg mb-1">{ticket.eventName}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
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
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
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
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>
    </Link>
  )
}