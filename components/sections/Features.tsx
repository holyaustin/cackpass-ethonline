// components/sections/Features.tsx
'use client'

import { useState } from 'react'
import { 
  QrCode, Smartphone, BarChart3, ShieldCheck, RefreshCw,
  Users, Ticket, CreditCard, Globe, TrendingUp, Calendar
} from 'lucide-react'

export function Features() {
  const [activeTab, setActiveTab] = useState<'attendees' | 'organizers'>('attendees')

  const attendeeFeatures = [
    {
      icon: <Ticket className="h-6 w-6" />,
      title: 'Digital Collectible Tickets',
      description: 'Beautiful digital tickets that serve as memorable keepsakes from your favorite events.',
      gradient: 'from-primary to-primary-dark',
    },
    {
      icon: <Smartphone className="h-6 w-6" />,
      title: 'Mobile-First Experience',
      'description': 'Access tickets, check in, and manage everything from your smartphone with our intuitive app.',
      gradient: 'from-secondary to-secondary-dark',
    },
    {
      icon: <RefreshCw className="h-6 w-6" />,
      title: 'Easy Ticket Transfer',
      description: 'Share tickets with friends or family instantly with just a few taps.',
      gradient: 'from-primary to-primary-dark',
    },
    {
      icon: <ShieldCheck className="h-6 w-6" />,
      title: 'Anti-Fraud Protection',
      description: 'Verified tickets with unique digital signatures prevent counterfeiting.',
      gradient: 'from-secondary to-secondary-dark',
    },
  ]

  const organizerFeatures = [
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: 'Real-time Analytics',
      description: 'Track sales, attendance, and revenue in real-time with comprehensive dashboards.',
      gradient: 'from-primary to-primary-dark',
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Audience Management',
      description: 'Manage attendees, send updates, and collect feedback all in one platform.',
      gradient: 'from-secondary to-secondary-dark',
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: 'Global Payments',
      description: 'Accept payments from anywhere in the world with multiple currency support.',
      gradient: 'from-primary to-primary-dark',
    },
    {
      icon: <QrCode className="h-6 w-6" />,
      title: 'Smart Check-in System',
      description: 'Fast QR code scanning with offline support for smooth event entry.',
      gradient: 'from-secondary to-secondary-dark',
    },
  ]

  return (
    <section className="py-12 md:py-24 bg-background dark:bg-dark-background">
      <div className="responsive-container">
        <div className="text-center mb-8 md:mb-16">
          <h2 className="text-responsive-md font-bold mb-4 md:mb-6 font-display">
            Built for{' '}
            <span className="text-primary dark:text-dark-primary">Everyone</span>
          </h2>
          <p className="section-subtitle">
            Whether you're attending events or organizing them, CACK-pass provides 
            the perfect solution with smart features.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8 md:mb-12">
          <div className="inline-flex bg-surface dark:bg-dark-surface rounded-2xl p-1">
            <button
              onClick={() => setActiveTab('attendees')}
              className={`px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold transition-all flex items-center gap-2 ${
                activeTab === 'attendees'
                  ? 'bg-primary text-white dark:bg-dark-primary dark:text-white shadow-sm'
                  : 'text-text dark:text-dark-text hover:text-primary dark:hover:text-dark-primary'
              }`}
            >
              <Ticket className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-sm md:text-base">For Attendees</span>
            </button>
            <button
              onClick={() => setActiveTab('organizers')}
              className={`px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold transition-all flex items-center gap-2 ${
                activeTab === 'organizers'
                  ? 'bg-primary text-white dark:bg-dark-primary dark:text-white shadow-sm'
                  : 'text-text dark:text-dark-text hover:text-primary dark:hover:text-dark-primary'
              }`}
            >
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-sm md:text-base">For Organizers</span>
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 mb-12 md:mb-20">
          {(activeTab === 'attendees' ? attendeeFeatures : organizerFeatures).map((feature, index) => (
            <div
              key={index}
              className="group"
            >
              <div className="card p-6 hover:shadow-md transition-all duration-300 h-full">
                <div className="w-12 h-12 bg-primary/10 dark:bg-dark-primary/10 rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                  <div className="text-primary dark:text-dark-primary">
                    {feature.icon}
                  </div>
                </div>
                
                <h3 className="text-lg font-bold mb-3 md:mb-4">
                  {feature.title}
                </h3>
                
                <p className="text-text-light dark:text-dark-secondary text-sm md:text-base">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Demo Section */}
        <div className="bg-primary dark:bg-dark-primary rounded-2xl md:rounded-3xl p-6 md:p-8 text-white overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="lg:w-1/2 mb-8 lg:mb-0 lg:pr-8">
              <h3 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">
                Experience Smart Ticketing
              </h3>
              <p className="text-white/90 mb-6 md:mb-8 text-sm md:text-base">
                See how CACK-pass transforms event management with digital tickets, 
                instant delivery, and smart features.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="px-6 py-3 md:px-8 md:py-4 bg-white text-primary dark:text-dark-primary rounded-xl font-bold hover:bg-gray-100 transition-colors w-full sm:w-auto">
                  Watch Demo
                </button>
                <button className="px-6 py-3 md:px-8 md:py-4 border-2 border-white text-white rounded-xl font-bold hover:bg-white/10 transition-colors w-full sm:w-auto">
                  Schedule Demo
                </button>
              </div>
            </div>
            
            <div className="lg:w-1/2">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 md:p-6">
                <div className="bg-surface dark:bg-dark-surface rounded-xl p-4 md:p-6">
                  {/* Mock Dashboard */}
                  <div className="space-y-4 md:space-y-6">
                    <div className="bg-background dark:bg-dark-background rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-text dark:text-dark-text font-bold">My Tickets</div>
                        <Calendar className="h-5 w-5 text-primary dark:text-dark-primary" />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-text-light dark:text-dark-secondary">TechFest VIP</div>
                            <div className="text-xs text-text-light/70 dark:text-dark-secondary/70">Jun 15, 2024</div>
                          </div>
                          <div className="text-primary dark:text-dark-primary font-bold">Active</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Mock Ticket */}
                    <div className="bg-gradient-to-r from-primary/20 to-secondary/20 dark:from-dark-primary/20 dark:to-dark-secondary/20 rounded-lg p-4 border border-primary/30 dark:border-dark-primary/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-text dark:text-dark-text font-bold">Digital Collectible</div>
                          <div className="text-text-light dark:text-dark-secondary text-sm">Your event memory</div>
                        </div>
                        <Ticket className="h-8 w-8 text-primary dark:text-dark-primary" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}