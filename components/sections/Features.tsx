// components/sections/Features.tsx
'use client'

import { useState } from 'react'
import { 
  QrCode, 
  Smartphone, 
  BarChart3, 
  ShieldCheck, 
  RefreshCw,
  Users,
  Zap,
  Globe
} from 'lucide-react'

export function Features() {
  const [activeTab, setActiveTab] = useState('attendees')

  const attendeeFeatures = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: 'Gasless Minting',
      description: 'Mint tickets without paying gas fees. We cover all transaction costs.',
    },
    {
      icon: <Smartphone className="h-6 w-6" />,
      title: 'Mobile QR Codes',
      description: 'Easy check-in with QR codes stored directly in your mobile wallet.',
    },
    {
      icon: <RefreshCw className="h-6 w-6" />,
      title: 'Easy Resale',
      description: 'Sell your tickets on our secure secondary marketplace.',
    },
    {
      icon: <ShieldCheck className="h-6 w-6" />,
      title: 'Fraud Protection',
      description: 'Verified tickets with blockchain-based authenticity checks.',
    },
  ]

  const organizerFeatures = [
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: 'Real-time Analytics',
      description: 'Track sales, attendance, and revenue in real-time.',
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Audience Management',
      description: 'Manage attendees, send updates, and collect feedback.',
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: 'Global Payments',
      description: 'Accept payments from anywhere in the world.',
    },
    {
      icon: <QrCode className="h-6 w-6" />,
      title: 'Smart Check-in',
      description: 'Fast, reliable QR code scanning with offline support.',
    },
  ]

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Built for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Everyone
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Whether you're attending events or organizing them, we've got you covered.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-full p-1">
            <button
              onClick={() => setActiveTab('attendees')}
              className={`px-6 py-3 rounded-full font-medium transition-all ${
                activeTab === 'attendees'
                  ? 'bg-white dark:bg-gray-700 shadow-md'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              For Attendees
            </button>
            <button
              onClick={() => setActiveTab('organizers')}
              className={`px-6 py-3 rounded-full font-medium transition-all ${
                activeTab === 'organizers'
                  ? 'bg-white dark:bg-gray-700 shadow-md'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              For Organizers
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {(activeTab === 'attendees' ? attendeeFeatures : organizerFeatures).map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                <div className="text-primary">
                  {feature.icon}
                </div>
              </div>
              
              <h3 className="text-xl font-bold mb-4">
                {feature.title}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Demo Section */}
        <div className="mt-20 bg-gradient-to-r from-primary to-secondary rounded-3xl p-8 md:p-12">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="lg:w-1/2 mb-8 lg:mb-0 lg:pr-12">
              <h3 className="text-3xl font-bold text-white mb-6">
                Experience the Future of Ticketing
              </h3>
              <p className="text-white/90 mb-8">
                See how CACK-pass makes event management seamless and secure.
              </p>
              <button className="px-8 py-4 bg-white text-primary rounded-xl font-semibold hover:bg-gray-100">
                Watch Demo Video
              </button>
            </div>
            
            <div className="lg:w-1/2">
              <div className="bg-black/20 rounded-2xl p-4 backdrop-blur-sm">
                <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-white">Interactive Demo</div>
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