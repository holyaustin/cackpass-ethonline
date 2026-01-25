// components/sections/Landing.tsx
'use client'

import { usePrivy } from '@privy-io/react-auth'
import { ArrowRight, Sparkles, Shield, Ticket, Users, Zap } from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export function Landing() {
  const { login, authenticated } = usePrivy()
  const [isVisible, setIsVisible] = useState(false)
  const [currentFeature, setCurrentFeature] = useState(0)

  const features = [
    {
      icon: <Ticket className="h-6 w-6 md:h-8 md:w-8" />,
      title: "Smart Digital Tickets",
      description: "Transform tickets into memorable digital collectibles"
    },
    {
      icon: <Shield className="h-6 w-6 md:h-8 md:w-8" />,
      title: "Anti-Scalping Protection",
      description: "Fair pricing with built-in scalping prevention"
    },
    {
      icon: <Zap className="h-6 w-6 md:h-8 md:w-8" />,
      title: "Instant Ticket Delivery",
      description: "Get your tickets instantly after purchase"
    },
    {
      icon: <Users className="h-6 w-6 md:h-8 md:w-8" />,
      title: "Easy Sharing & Transfer",
      description: "Share tickets with friends in seconds"
    }
  ]

  useEffect(() => {
    setIsVisible(true)
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleGetStarted = () => {
    if (authenticated) {
      window.location.href = '/dashboard'
    } else {
      login()
    }
  }

  return (
    <section className="relative overflow-hidden min-h-[90vh] flex items-center">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-surface to-background dark:from-dark-background dark:via-dark-surface dark:to-dark-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      </div>

      <div className="responsive-container relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Badge */}
            <div className="flex justify-center mb-6 md:mb-8">
              <div className="inline-flex items-center space-x-2 px-4 py-2 md:px-6 md:py-3 bg-primary/10 dark:bg-dark-primary/10 rounded-full backdrop-blur-sm">
                <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary dark:text-dark-primary" />
                <span className="text-sm md:text-base font-medium text-primary dark:text-dark-primary">
                  The Future of Event Ticketing
                </span>
              </div>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-responsive-lg font-bold text-center mb-4 md:mb-6 font-display">
              <span className="block">Your Ticket,</span>
              <span className="block text-primary dark:text-dark-primary">Your Memory</span>
            </h1>
            
            {/* Subheading */}
            <p className="text-lg md:text-2xl text-center text-text-light dark:text-dark-secondary mb-8 md:mb-12 max-w-3xl mx-auto px-4">
              Experience events like never before with smart digital tickets that 
              create lasting memories and protect against scalping.
            </p>
            
            {/* Rotating Features */}
            <div className="mb-8 md:mb-12">
              <div className="flex justify-center">
                <div className="bg-surface dark:bg-dark-surface rounded-2xl p-4 md:p-6 shadow-sm max-w-md w-full">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/10 dark:bg-dark-primary/10 rounded-2xl flex items-center justify-center">
                        <div className="text-primary dark:text-dark-primary">
                          {features[currentFeature].icon}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-semibold text-text dark:text-dark-text mb-1">
                        {features[currentFeature].title}
                      </h3>
                      <p className="text-sm md:text-base text-text-light dark:text-dark-secondary">
                        {features[currentFeature].description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Feature Indicators */}
              <div className="flex justify-center space-x-2 mt-6">
                {features.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentFeature(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      currentFeature === index 
                        ? 'bg-primary dark:bg-dark-primary w-8' 
                        : 'bg-gray-300 dark:bg-gray-400'
                    }`}
                    aria-label={`View feature ${index + 1}`}
                  />
                ))}
              </div>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 md:mb-16">
              <button
                onClick={handleGetStarted}
                className="btn-primary px-8 py-4 text-lg flex items-center justify-center space-x-3"
              >
                <span>Start Here</span>
                <ArrowRight className="h-5 w-5" />
              </button>
              
              <Link href="/events">
                <button className="btn-outline px-8 py-4 text-lg w-full sm:w-auto">
                  Explore Events
                </button>
              </Link>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div className="text-center p-4 md:p-6 bg-surface dark:bg-dark-surface rounded-2xl">
                <div className="text-2xl md:text-3xl font-bold text-primary dark:text-dark-primary mb-1 md:mb-2">10K+</div>
                <div className="text-sm md:text-base text-text-light dark:text-dark-secondary">Events Hosted</div>
              </div>
              <div className="text-center p-4 md:p-6 bg-surface dark:bg-dark-surface rounded-2xl">
                <div className="text-2xl md:text-3xl font-bold text-primary dark:text-dark-primary mb-1 md:mb-2">500K+</div>
                <div className="text-sm md:text-base text-text-light dark:text-dark-secondary">Tickets Sold</div>
              </div>
              <div className="text-center p-4 md:p-6 bg-surface dark:bg-dark-surface rounded-2xl">
                <div className="text-2xl md:text-3xl font-bold text-primary dark:text-dark-primary mb-1 md:mb-2">99.9%</div>
                <div className="text-sm md:text-base text-text-light dark:text-dark-secondary">Satisfaction Rate</div>
              </div>
              <div className="text-center p-4 md:p-6 bg-surface dark:bg-dark-surface rounded-2xl">
                <div className="text-2xl md:text-3xl font-bold text-primary dark:text-dark-primary mb-1 md:mb-2">24/7</div>
                <div className="text-sm md:text-base text-text-light dark:text-dark-secondary">Support</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}