// app/(main)/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Ticket, Calendar, DollarSign, Users } from 'lucide-react'
import { TicketCard } from '@/components/tickets/TicketCard'

export default function DashboardPage() {
  const { user, authenticated } = usePrivy()
  const [tickets, setTickets] = useState([])
  const [stats, setStats] = useState({
    totalTickets: 0,
    upcomingEvents: 0,
    totalSpent: 0,
  })

  useEffect(() => {
    if (authenticated) {
      fetchDashboardData()
    }
  }, [authenticated])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/user/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('privy_token')}`,
        },
      })
      const data = await response.json()
      setTickets(data.tickets)
      setStats(data.stats)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please connect your wallet</h2>
          <p className="text-gray-600">Connect to view your dashboard</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user?.name || 'User'}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here's your ticket overview and upcoming events
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Total Tickets</p>
                <p className="text-3xl font-bold mt-2">{stats.totalTickets}</p>
              </div>
              <Ticket className="h-10 w-10 text-primary" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Upcoming Events</p>
                <p className="text-3xl font-bold mt-2">{stats.upcomingEvents}</p>
              </div>
              <Calendar className="h-10 w-10 text-secondary" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Total Spent</p>
                <p className="text-3xl font-bold mt-2">${stats.totalSpent}</p>
              </div>
              <DollarSign className="h-10 w-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Friends Attended</p>
                <p className="text-3xl font-bold mt-2">12</p>
              </div>
              <Users className="h-10 w-10 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Tickets Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Your Tickets</h2>
            <button className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark">
              View All
            </button>
          </div>

          {tickets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tickets.map((ticket: any) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl">
              <Ticket className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No tickets yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Purchase your first ticket to get started
              </p>
              <a
                href="/events"
                className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark"
              >
                Browse Events
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}