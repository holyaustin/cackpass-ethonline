// components/sections/CTA.tsx
'use client'

import { usePrivy } from '@privy-io/react-auth'
import { ArrowRight, Rocket, TrendingUp, Users, Sparkles, Shield } from 'lucide-react'

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
    <section className="py-24 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-accent-500/5">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
      </div>
      
      <div className="container relative mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary-500/10 to-accent-500/10 rounded-full backdrop-blur-sm mb-6">
              <Rocket className="h-5 w-5 text-primary-500" />
              <span className="text-sm font-medium bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                Ready to Launch?
              </span>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-bold mb-8 font-display">
              Start Your Event{' '}
              <span className="gradient-text">Journey Today</span>
            </h2>
            
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-12">
              Join thousands of organizers and attendees who trust CACK-pass for 
              seamless, secure, and gasless event experiences.
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-accent-500 rounded-3xl blur opacity-0 group-hover:opacity-30 transition duration-500" />
              
              <div className="relative glass-card p-8 rounded-3xl">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mb-6">
                  <ArrowRight className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">For Attendees</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Discover amazing events, buy tickets gas-free, and enjoy seamless 
                  check-ins with our mobile-first experience.
                </p>
                <button
                  onClick={() => handleAction('events')}
                  className="w-full py-3 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transform transition-all"
                >
                  Explore Events
                </button>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-accent-500 rounded-3xl blur opacity-0 group-hover:opacity-30 transition duration-500" />
              
              <div className="relative glass-card p-8 rounded-3xl">
                <div className="w-14 h-14 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-2xl flex items-center justify-center mb-6">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">For Organizers</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Create and manage events, track real-time analytics, and handle 
                  global payments with our comprehensive platform.
                </p>
                <button
                  onClick={() => handleAction('organizer')}
                  className="w-full py-3 bg-gradient-to-r from-secondary-600 to-green-600 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transform transition-all"
                >
                  Create Event
                </button>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-accent-500 rounded-3xl blur opacity-0 group-hover:opacity-30 transition duration-500" />
              
              <div className="relative glass-card p-8 rounded-3xl">
                <div className="w-14 h-14 bg-gradient-to-br from-accent-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">For Enterprises</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Custom solutions for large-scale events, festivals, and corporate 
                  gatherings with white-label options.
                </p>
                <button
                  onClick={() => handleAction('contact')}
                  className="w-full py-3 bg-gradient-to-r from-accent-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transform transition-all"
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </div>

          {/* Stats Banner */}
          <div className="bg-gradient-to-r from-primary-600 via-accent-600 to-secondary-600 rounded-3xl p-8 md:p-12 text-white overflow-hidden">
            <div className="relative">
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
              
              <div className="relative flex flex-col md:flex-row items-center justify-between">
                <div className="mb-8 md:mb-0 md:mr-8">
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">
                    Join the Ticketing Revolution
                  </h3>
                  <p className="opacity-90">
                    Be part of the future of event management
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-8">
                  <div className="text-center">
                    <div className="text-3xl md:text-4xl font-bold">500+</div>
                    <div className="text-sm opacity-90">Events Monthly</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl md:text-4xl font-bold">50K+</div>
                    <div className="text-sm opacity-90">Tickets Sold</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl md:text-4xl font-bold">30+</div>
                    <div className="text-sm opacity-90">Countries</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl md:text-4xl font-bold">99.9%</div>
                    <div className="text-sm opacity-90">Satisfaction</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="text-center mt-20">
            <h3 className="text-3xl font-bold mb-6">
              Ready to Get Started?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              Sign up now and experience gasless ticketing. No credit card required 
              for the free plan.
            </p>
            <button
              onClick={() => login()}
              className="px-12 py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transform transition-all"
            >
              {authenticated ? 'Go to Dashboard' : 'Start Free Trial'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}