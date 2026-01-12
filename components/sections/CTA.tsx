// components/sections/CTA.tsx
'use client'

import { usePrivy } from '@privy-io/react-auth'
import { ArrowRight, Rocket, TrendingUp, Users } from 'lucide-react'

export function CTA() {
  const { login } = usePrivy()

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
              <Rocket className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Ready to Launch?
              </span>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Start Your Event{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                Journey Today
              </span>
            </h2>
            
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-12">
              Join thousands of organizers and attendees who trust CACK-pass for seamless event experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                <ArrowRight className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-4">For Attendees</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Discover amazing events, buy tickets gas-free, and enjoy seamless check-ins.
              </p>
              <button
                onClick={login}
                className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark"
              >
                Explore Events
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
              <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="h-7 w-7 text-green-500" />
              </div>
              <h3 className="text-xl font-bold mb-4">For Organizers</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create and manage events, track analytics, and handle payments globally.
              </p>
              <a
                href="/organizer/signup"
                className="block w-full py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 text-center"
              >
                Create Event
              </a>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6">
                <Users className="h-7 w-7 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold mb-4">For Enterprises</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Custom solutions for large-scale events, festivals, and corporate gatherings.
              </p>
              <a
                href="/contact"
                className="block w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 text-center"
              >
                Contact Sales
              </a>
            </div>
          </div>

          {/* Stats Banner */}
          <div className="bg-gradient-to-r from-primary to-secondary rounded-3xl p-8 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0 md:mr-8">
                <h3 className="text-2xl font-bold mb-2">
                  Join the Revolution
                </h3>
                <p className="opacity-90">
                  Be part of the future of event ticketing
                </p>
              </div>
              
              <div className="flex flex-wrap gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold">500+</div>
                  <div className="text-sm opacity-90">Events Monthly</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold">50K+</div>
                  <div className="text-sm opacity-90">Tickets Sold</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold">30+</div>
                  <div className="text-sm opacity-90">Countries</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}