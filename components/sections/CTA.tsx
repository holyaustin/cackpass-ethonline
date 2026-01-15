// components/sections/CTA.tsx
'use client'

import { usePrivy } from '@privy-io/react-auth'
import { ArrowRight, Rocket, TrendingUp, Users, Ticket, Calendar } from 'lucide-react'
import Link from 'next/link'

export function CTA() {
  const { login, authenticated } = usePrivy()

  const handleAction = (action: string) => {
    if (authenticated) {
      window.location.href = `/${action}`
    } else {
      login()
    }
  }

  return (
    <section className="py-12 md:py-24 bg-background dark:bg-dark-background">
      <div className="responsive-container">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-primary/10 dark:bg-dark-primary/10 rounded-full mb-4 md:mb-6">
              <Rocket className="h-4 w-4 md:h-5 md:w-5 text-primary dark:text-dark-primary" />
              <span className="text-sm md:text-base font-medium text-primary dark:text-dark-primary">
                Ready to Get Started?
              </span>
            </div>
            
            <h2 className="text-responsive-md font-bold mb-4 md:mb-6 font-display">
              Start Your Event{' '}
              <span className="text-primary dark:text-dark-primary">Journey</span>
            </h2>
            
            <p className="section-subtitle">
              Join thousands of organizers and attendees who trust CACK-pass for 
              seamless event experiences.
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-8 md:mb-16">
            <div className="card p-6 md:p-8">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-primary/10 dark:bg-dark-primary/10 rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                <Ticket className="h-6 w-6 md:h-7 md:w-7 text-primary dark:text-dark-primary" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">For Attendees</h3>
              <p className="text-text-light dark:text-dark-secondary mb-6 text-sm md:text-base">
                Discover amazing events, get digital tickets instantly, and enjoy 
                seamless check-ins with our mobile experience.
              </p>
              <button
                onClick={() => handleAction('events')}
                className="w-full py-3 bg-primary text-white dark:bg-dark-primary dark:text-white rounded-xl font-bold hover:bg-primary-dark dark:hover:bg-dark-primary-dark transition-colors"
              >
                Explore Events
              </button>
            </div>

            <div className="card p-6 md:p-8">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-secondary/10 dark:bg-dark-secondary/10 rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                <Calendar className="h-6 w-6 md:h-7 md:w-7 text-secondary dark:text-dark-secondary" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">For Organizers</h3>
              <p className="text-text-light dark:text-dark-secondary mb-6 text-sm md:text-base">
                Create and manage events, track real-time analytics, and handle 
                global payments with our comprehensive platform.
              </p>
              <button
                onClick={() => handleAction('organizer')}
                className="w-full py-3 bg-secondary text-white dark:bg-dark-secondary dark:text-white rounded-xl font-bold hover:bg-secondary-dark dark:hover:bg-dark-secondary-dark transition-colors"
              >
                Create Event
              </button>
            </div>

            <div className="card p-6 md:p-8">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-primary/10 dark:bg-dark-primary/10 rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                <Users className="h-6 w-6 md:h-7 md:w-7 text-primary dark:text-dark-primary" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">For Enterprises</h3>
              <p className="text-text-light dark:text-dark-secondary mb-6 text-sm md:text-base">
                Custom solutions for large-scale events, festivals, and corporate 
                gatherings with white-label options.
              </p>
              <button
                onClick={() => handleAction('contact')}
                className="w-full py-3 border-2 border-primary text-primary dark:border-dark-primary dark:text-dark-primary rounded-xl font-bold hover:bg-primary/10 dark:hover:bg-dark-primary/10 transition-colors"
              >
                Contact Sales
              </button>
            </div>
          </div>

          {/* Stats Banner */}
          <div className="bg-primary dark:bg-dark-primary rounded-2xl md:rounded-3xl p-6 md:p-8 text-white mb-8 md:mb-16">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0 md:mr-8">
                <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-4">
                  Join the Ticketing Revolution
                </h3>
                <p className="opacity-90 text-sm md:text-base">
                  Be part of the future of event management
                </p>
              </div>
              
              <div className="flex flex-wrap gap-4 md:gap-8">
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold">500+</div>
                  <div className="text-sm opacity-90">Events Monthly</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold">50K+</div>
                  <div className="text-sm opacity-90">Tickets Sold</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl md:text-3xl font-bold">30+</div>
                  <div className="text-sm opacity-90">Countries</div>
                </div>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="text-center">
            <h3 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">
              Ready to Experience Smart Ticketing?
            </h3>
            <p className="text-text-light dark:text-dark-secondary mb-6 md:mb-8 max-w-2xl mx-auto text-sm md:text-base">
              Sign up now and experience digital tickets that create memories. 
              No credit card required for the free plan.
            </p>
            <button
              onClick={() => login()}
              className="btn-primary px-8 py-4 text-lg"
            >
              {authenticated ? 'Go to Dashboard' : 'Start Free Trial'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}