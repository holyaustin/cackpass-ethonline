// components/sections/HeroSection.tsx
'use client'

import { usePrivy } from '@privy-io/react-auth'
import { ArrowRight, Sparkles } from 'lucide-react'

export function HeroSection() {
  const { login } = usePrivy()

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-white to-secondary/10 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 mb-6 px-4 py-2 bg-primary/10 rounded-full">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Gasless Ticketing Platform
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Experience Events Like{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Never Before
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
            Buy, sell, and manage event tickets with zero gas fees. Powered by blockchain for security and transparency.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={login}
              className="px-8 py-4 bg-primary text-white rounded-xl font-semibold text-lg hover:bg-primary-dark transition-all flex items-center justify-center space-x-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            
            <button className="px-8 py-4 bg-white dark:bg-gray-800 border-2 border-primary text-primary rounded-xl font-semibold text-lg hover:bg-primary/10 transition-all">
              Explore Events
            </button>
          </div>
          
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">10K+</div>
              <div className="text-gray-600 dark:text-gray-400">Events Hosted</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">500K+</div>
              <div className="text-gray-600 dark:text-gray-400">Tickets Sold</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">100%</div>
              <div className="text-gray-600 dark:text-gray-400">Gasless</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">24/7</div>
              <div className="text-gray-600 dark:text-gray-400">Support</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-primary/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-10 right-10 w-72 h-72 bg-secondary/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
    </section>
  )
}