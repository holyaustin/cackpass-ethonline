// components/sections/HeroSection.tsx
'use client'

import { usePrivy } from '@privy-io/react-auth'
import { ArrowRight, Sparkles, Ticket, Zap, Shield } from 'lucide-react'
import { useState, useEffect } from 'react'

export function HeroSection() {
  const { login, authenticated } = usePrivy()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleGetStarted = () => {
    if (authenticated) {
      window.location.href = '/dashboard'
    } else {
      login()
    }
  }

  return (
    <section className="relative overflow-hidden min-h-screen flex items-center">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-500/10 via-transparent to-transparent" />
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-300/20 rounded-full mix-blend-multiply filter blur-3xl animate-float" />
        <div className="absolute top-10 right-10 w-96 h-96 bg-accent-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-float animation-delay-1000" />
        <div className="absolute bottom-20 left-1/2 w-64 h-64 bg-secondary-300/20 rounded-full mix-blend-multiply filter blur-3xl animate-float animation-delay-2000" />
      </div>

      <div className="container relative mx-auto px-4 py-20 md:py-32">
        <div className="max-w-6xl mx-auto">
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center space-x-3 mb-8 px-4 py-2 bg-gradient-to-r from-primary-500/10 to-accent-500/10 rounded-full backdrop-blur-sm">
              <Sparkles className="h-5 w-5 text-primary-500" />
              <span className="text-sm font-medium bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                Revolutionizing Event Ticketing
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 font-display">
              <span className="block">Experience Events</span>
              <span className="block gradient-text">Without Gas Fees</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl">
              CACK-pass delivers gasless NFT ticketing powered by blockchain. 
              Buy, sell, and manage tickets with zero transaction fees. 
              Perfect for organizers and attendees worldwide.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 mb-16">
              <button
                onClick={handleGetStarted}
                className="btn-primary flex items-center justify-center space-x-3 text-lg px-8 py-4"
              >
                <span>{authenticated ? 'Go to Dashboard' : 'Get Started Free'}</span>
                <ArrowRight className="h-5 w-5" />
              </button>
              
              <button className="btn-secondary text-lg px-8 py-4">
                Watch Demo
              </button>
            </div>
            
            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
              <div className="glass-card p-6 rounded-2xl">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">100% Gasless</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  No transaction fees for users. We cover all gas costs.
                </p>
              </div>
              
              <div className="glass-card p-6 rounded-2xl">
                <div className="w-12 h-12 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-xl flex items-center justify-center mb-4">
                  <Ticket className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">NFT Tickets</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Every ticket is a verifiable NFT on the blockchain.
                </p>
              </div>
              
              <div className="glass-card p-6 rounded-2xl">
                <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">Secure & Trustless</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Anti-fraud protection with instant verification.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}