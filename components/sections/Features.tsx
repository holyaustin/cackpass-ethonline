// components/sections/Features.tsx
'use client'

import { useState } from 'react'
import { 
  QrCode, Smartphone, BarChart3, ShieldCheck, RefreshCw,
  Users, Zap, Globe, Ticket, CreditCard, Wallet, TrendingUp
} from 'lucide-react'

export function Features() {
  const [activeTab, setActiveTab] = useState<'attendees' | 'organizers'>('attendees')

  const attendeeFeatures = [
    {
      icon: <Zap className="h-7 w-7" />,
      title: 'Gasless Minting',
      description: 'Mint NFT tickets without paying any gas fees. We cover all transaction costs through meta-transactions.',
      gradient: 'from-primary-500 to-primary-600',
    },
    {
      icon: <Smartphone className="h-7 w-7" />,
      title: 'Mobile-First Experience',
      description: 'Access tickets, check-in, and manage everything from your mobile device with our responsive design.',
      gradient: 'from-secondary-500 to-secondary-600',
    },
    {
      icon: <RefreshCw className="h-7 w-7" />,
      title: 'Easy Resale Market',
      description: 'Sell tickets securely on our marketplace with automated royalty distribution to organizers.',
      gradient: 'from-accent-500 to-accent-600',
    },
    {
      icon: <ShieldCheck className="h-7 w-7" />,
      title: 'Fraud Protection',
      description: 'Verified tickets with blockchain-based authenticity checks and instant QR validation.',
      gradient: 'from-green-500 to-green-600',
    },
  ]

  const organizerFeatures = [
    {
      icon: <BarChart3 className="h-7 w-7" />,
      title: 'Real-time Analytics',
      description: 'Comprehensive dashboard with real-time sales, attendance, and revenue tracking.',
      gradient: 'from-purple-500 to-purple-600',
    },
    {
      icon: <Users className="h-7 w-7" />,
      title: 'Audience Management',
      description: 'Advanced tools for managing attendees, sending updates, and collecting feedback.',
      gradient: 'from-pink-500 to-pink-600',
    },
    {
      icon: <Globe className="h-7 w-7" />,
      title: 'Global Payments',
      description: 'Accept crypto and fiat payments from anywhere in the world with automatic conversion.',
      gradient: 'from-orange-500 to-orange-600',
    },
    {
      icon: <QrCode className="h-7 w-7" />,
      title: 'Smart Check-in System',
      description: 'Fast, reliable QR code scanning with offline support and instant verification.',
      gradient: 'from-blue-500 to-blue-600',
    },
  ]

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-bold mb-8 font-display">
            Built for{' '}
            <span className="gradient-text">Everyone</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Whether you're attending events or organizing them, CACK-pass provides 
            the perfect solution with cutting-edge features.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-16">
          <div className="inline-flex glass-card rounded-2xl p-1">
            <button
              onClick={() => setActiveTab('attendees')}
              className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                activeTab === 'attendees'
                  ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Ticket className="h-5 w-5" />
                For Attendees
              </div>
            </button>
            <button
              onClick={() => setActiveTab('organizers')}
              className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                activeTab === 'organizers'
                  ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5" />
                For Organizers
              </div>
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {(activeTab === 'attendees' ? attendeeFeatures : organizerFeatures).map((feature, index) => (
            <div
              key={index}
              className="group relative"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-accent-500 rounded-3xl blur opacity-0 group-hover:opacity-20 transition duration-500" />
              
              <div className="relative glass-card p-8 rounded-3xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500/10 to-accent-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <div className={`bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                    {feature.icon}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold mb-4">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {feature.description}
                </p>
                
                <div className="flex items-center text-sm text-primary-500">
                  <span>Learn more</span>
                  <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Demo Section */}
        <div className="bg-gradient-to-r from-primary-600 via-accent-600 to-secondary-600 rounded-3xl p-8 md:p-12 overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="lg:w-1/2 mb-8 lg:mb-0 lg:pr-12">
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Experience the Future of Ticketing
              </h3>
              <p className="text-white/90 mb-8 text-lg">
                See how CACK-pass transforms event management with blockchain technology, 
                gasless transactions, and seamless user experiences.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="px-8 py-4 bg-white text-primary-600 rounded-xl font-bold hover:bg-gray-100 hover:scale-105 transform transition-all">
                  Watch Demo Video
                </button>
                <button className="px-8 py-4 border-2 border-white text-white rounded-xl font-bold hover:bg-white/10 transition-all">
                  Schedule Demo
                </button>
              </div>
            </div>
            
            <div className="lg:w-1/2">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary-500 to-accent-500 rounded-3xl blur-xl opacity-30" />
                
                <div className="relative bg-gray-900 rounded-2xl p-1">
                  <div className="bg-gray-900 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Mock Dashboard */}
                      <div className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-white font-bold">Wallet Balance</div>
                          <Wallet className="h-5 w-5 text-primary-400" />
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">USDC</span>
                            <span className="text-white font-bold">1,250.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">USD</span>
                            <span className="text-white font-bold">$1,250.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">NGN</span>
                            <span className="text-white font-bold">₦1,875,000</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Mock Ticket */}
                      <div className="bg-gradient-to-r from-primary-500/20 to-accent-500/20 rounded-lg p-4 border border-primary-500/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white font-bold">TechFest VIP</div>
                            <div className="text-gray-400 text-sm">Jun 15, 2024</div>
                          </div>
                          <Ticket className="h-8 w-8 text-primary-400" />
                        </div>
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