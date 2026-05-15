// components/sections/HeroSection.tsx
'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { ArrowRight, Sparkles, Shield, Ticket, Users, Zap } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function HeroSection() {
  const { isAuthenticated, ready, login } = useAuth()
  const [isVisible, setIsVisible] = useState(false)
  const [currentFeature, setCurrentFeature] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [stars, setStars] = useState<Array<{ width: number; height: number; top: number; left: number; shadow: number; delay: number; duration: number }>>([])
  const [boldStars, setBoldStars] = useState<Array<{ width: number; height: number; top: number; left: number; shadow: number; delay: number; duration: number }>>([])
  const [shootingStars, setShootingStars] = useState<Array<{ top: number; left: number; delay: number }>>([])
  const [mounted, setMounted] = useState(false)

  const router = useRouter()

  const features = [
    {
      icon: <Ticket className="h-6 w-6 md:h-8 md:w-8" />,
      title: "Smart Digital Tickets",
      description: "Transform tickets into memorable digital collectibles",
      color: "bg-orange-500",
      gradient: "from-orange-500 to-orange-400"
    },
    {
      icon: <Shield className="h-6 w-6 md:h-8 md:w-8" />,
      title: "Anti-Scalping Protection",
      description: "Fair pricing with built-in scalping prevention",
      color: "bg-teal-500",
      gradient: "from-teal-500 to-teal-400"
    },
    {
      icon: <Zap className="h-6 w-6 md:h-8 md:w-8" />,
      title: "Instant Ticket Delivery",
      description: "Get your tickets instantly after purchase",
      color: "bg-orange-500",
      gradient: "from-orange-500 to-orange-400"
    },
    {
      icon: <Users className="h-6 w-6 md:h-8 md:w-8" />,
      title: "Easy Sharing & Transfer",
      description: "Share tickets with friends in seconds",
      color: "bg-teal-500",
      gradient: "from-teal-500 to-teal-400"
    }
  ]

  // Generate consistent star positions on mount only
  useEffect(() => {
    const generateStars = (count: number, isBold: boolean = false) => {
      return Array.from({ length: count }).map(() => ({
        width: Math.random() * (isBold ? 5 : 3) + (isBold ? 2 : 1),
        height: Math.random() * (isBold ? 5 : 3) + (isBold ? 2 : 1),
        top: Math.random() * 100,
        left: Math.random() * 100,
        shadow: Math.random() * (isBold ? 6 : 8) + (isBold ? 4 : 2),
        delay: Math.random() * 5,
        duration: (isBold ? 1 + Math.random() * 2 : 1 + Math.random() * 3)
      }))
    }

    const generateShootingStars = (count: number) => {
      return Array.from({ length: count }).map((_, i) => ({
        top: 20 + i * 25,
        left: -5 + i * 10,
        delay: i * 7
      }))
    }

    setStars(generateStars(60, false))
    setBoldStars(generateStars(40, true))
    setShootingStars(generateShootingStars(3))
    setMounted(true)
  }, [])

  const nextFeature = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentFeature((prev) => (prev + 1) % features.length);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [features.length, isTransitioning])

  useEffect(() => {
    setIsVisible(true)
    const interval = setInterval(() => {
      nextFeature();
    }, 4000)
    return () => clearInterval(interval)
  }, [nextFeature])

// Inside HeroSection component, replace the handleGetStarted function with this:

    const handleGetStarted = async () => {
      if (isLoading) return;
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        setIsLoading(true);
        const loadingToast = toast.loading('Connecting to wallet...');
        try {
          await login();
          toast.dismiss(loadingToast);
          toast.success('Login successful! Redirecting...');
          // The redirect will be handled by the AuthProvider's useEffect after authentication
        } catch (error: any) {
          toast.dismiss(loadingToast);
          console.error('Login failed:', error);
          toast.error('Unable to login. Please try again later.');
        } finally {
          setIsLoading(false);
        }
      }
    };

  return (
    <section className="relative overflow-hidden min-h-screen lg:min-h-[95vh] flex items-center py-8 md:py-12">
      {/* Light Theme Background - Shows by default */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F7F3E9] via-[#F0EBDE] to-[#F7F3E9] dark:hidden">
        {/* Floating animated shapes */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-orange-300/30 to-orange-200/20 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-teal-300/20 to-teal-200/15 rounded-full blur-3xl animate-float-slow delay-1000" />
        
        {/* Geometric pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#D95427_1px,transparent_1px)] bg-[length:50px_50px] animate-shift-slow" />
        </div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid-slate-300/20 [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]" />
        
        {/* Animated circles */}
        <div className="absolute top-20 right-20 w-40 h-40 border-4 border-orange-300/20 rounded-full animate-spin-slow">
          <div className="absolute inset-4 border-2 border-orange-400/30 rounded-full animate-spin-slow-reverse" />
        </div>
        <div className="absolute bottom-20 left-20 w-60 h-60 border-4 border-teal-300/20 rounded-full animate-spin-slow-reverse">
          <div className="absolute inset-8 border-2 border-teal-400/30 rounded-full animate-spin-slow" />
        </div>
      </div>

      {/* Dark Theme Background - Shows only when dark class is present */}
      <div className="absolute inset-0 hidden dark:block bg-gradient-to-br from-gray-900 via-gray-950 to-black">
        {/* Animated nebula effects */}
        <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] bg-gradient-to-r from-orange-500/20 via-orange-500/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/3 w-[500px] h-[500px] bg-gradient-to-r from-teal-500/20 via-teal-500/10 to-transparent rounded-full blur-3xl animate-pulse delay-1500" />
        
        {/* Star field - only render after mount to avoid hydration mismatch */}
        {mounted && (
          <>
            <div className="absolute inset-0">
              {stars.map((star, i) => (
                <div
                  key={`dark-star-${i}`}
                  className="absolute rounded-full animate-twinkle"
                  style={{
                    width: `${star.width}px`,
                    height: `${star.height}px`,
                    top: `${star.top}%`,
                    left: `${star.left}%`,
                    backgroundColor: 'white',
                    boxShadow: `0 0 ${star.shadow}px white`,
                    animationDelay: `${star.delay}s`,
                    animationDuration: `${star.duration}s`
                  }}
                />
              ))}
            </div>
            
            {/* Enhanced Bold Stars */}
            <div className="absolute inset-0">
              {boldStars.map((star, i) => (
                <div
                  key={`bold-star-${i}`}
                  className="absolute rounded-full animate-twinkle"
                  style={{
                    width: `${star.width}px`,
                    height: `${star.height}px`,
                    top: `${star.top}%`,
                    left: `${star.left}%`,
                    backgroundColor: 'white',
                    boxShadow: `0 0 ${star.shadow}px white`,
                    animationDelay: `${star.delay}s`,
                    animationDuration: `${star.duration}s`
                  }}
                />
              ))}
            </div>
            
            {/* Shooting Stars */}
            <div className="absolute inset-0">
              {shootingStars.map((star, i) => (
                <div
                  key={`shooting-star-${i}`}
                  className="absolute w-24 h-1 bg-gradient-to-r from-transparent via-white to-transparent rounded-full animate-shooting-star"
                  style={{
                    top: `${star.top}%`,
                    left: `${star.left}%`,
                    animationDelay: `${star.delay}s`,
                    opacity: 0.7
                  }}
                />
              ))}
            </div>
          </>
        )}
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid-slate-800/30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        
        {/* Animated rings */}
        <div className="absolute top-32 right-32 w-48 h-48 border border-orange-500/40 rounded-full animate-spin-slow">
          <div className="absolute inset-6 border border-orange-500/20 rounded-full animate-spin-slow-reverse" />
        </div>
        <div className="absolute bottom-32 left-32 w-72 h-72 border border-teal-500/40 rounded-full animate-spin-slow-reverse">
          <div className="absolute inset-10 border border-teal-500/20 rounded-full animate-spin-slow" />
        </div>
      </div>

      <div className="responsive-container relative z-10 w-full">
        <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Badge */}
          <div className="flex justify-center mb-6 md:mb-8">
            <div className="inline-flex items-center space-x-2 px-4 py-2 md:px-6 md:py-3 bg-orange-500/10 dark:bg-orange-500/10 rounded-full backdrop-blur-sm">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-orange-600 dark:text-orange-400" />
              <span className="text-sm md:text-base font-medium text-orange-600 dark:text-orange-400">
                The Future of Event Ticketing
              </span>
            </div>
          </div>

          {/* Two Column Layout - Equal halves */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12 xl:gap-16 mt-8 lg:mt-0">
            
            {/* Column 1: Digital Ticket Image - 1/2 */}
            <div className="w-full lg:w-1/2 order-2 lg:order-1 h-full flex items-center justify-center">
              <div className="relative w-full max-w-md lg:max-w-lg xl:max-w-xl">
                {/* Ticket Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-teal-500/20 to-orange-500/20 rounded-3xl blur-2xl animate-pulse" />
                
                {/* Ticket Body */}
                <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl border-2 border-white/30 dark:border-gray-700/30 shadow-2xl overflow-hidden p-6">
                  
                  {/* Ticket Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-500 to-orange-400 flex items-center justify-center">
                          <Ticket className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">CACK-pass</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 bg-orange-500/10 rounded-full">
                          <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">VIP PASS</span>
                        </div>
                        <div className="px-3 py-1 bg-teal-500/10 rounded-full">
                          <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">COLLECTIBLE</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
                        $149
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Per Ticket</div>
                    </div>
                  </div>
                  
                  {/* Event Details */}
                  <div className="mb-6">
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">AfroBeats Festival</h3>
                    <p className="text-gray-600 dark:text-gray-400">December 15, 2025 • Lagos Arena</p>
                  </div>
                  
                  {/* QR Code Section */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-orange-500/5 to-teal-500/5 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">Digital Collectible</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Scan to verify authenticity</div>
                      </div>
                      <div className="relative">
                        <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-lg p-2">
                          <div className="grid grid-cols-4 gap-1">
                            {Array.from({ length: 16 }).map((_, i) => (
                              <div 
                                key={i}
                                className={`w-3 h-3 rounded-sm ${
                                  i % 2 === 0 
                                    ? 'bg-orange-500' 
                                    : 'bg-teal-500'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full">
                          <div className="absolute inset-1 bg-white rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Ticket Footer */}
                  <div>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Digital Collectible #001</div>
                        <div className="font-semibold text-gray-900 dark:text-white">Created just for you</div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Never expires • Always memorable
                      </div>
                    </div>
                  </div>
                  
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-transparent rounded-bl-full" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-teal-500/10 to-transparent rounded-tr-full" />
                </div>
              </div>
            </div>

            {/* Column 2: Content - 1/2 */}
            <div className="w-full lg:w-1/2 order-1 lg:order-2">
              {/* Main Heading */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 font-display leading-tight flex flex-col sm:flex-row items-center justify-center md:justify-center lg:justify-center gap-1 sm:gap-2">
                <span className="text-gray-900 dark:text-white">Your Ticket,</span>
                <span className="bg-gradient-to-r from-orange-500 to-orange-400 bg-clip-text text-transparent">
                  Your Memory
                </span>
              </h1>
              
              {/* Subheading */}
              <p className="text-xl md:text-xl text-gray-600 dark:text-gray-300 mb-8 text-center lg:text-center leading-relaxed">
                Experience events like never before with smart digital tickets that 
                create lasting memories and protect against scalping.
              </p>
              
              {/* Enhanced Features Carousel */}
              <div className="mb-8">
                {/* Main carousel container */}
                <div className="relative overflow-hidden rounded-2xl border border-white/30 dark:border-gray-700/30 shadow-xl">
                  {/* Carousel track */}
                  <div 
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${currentFeature * 100}%)` }}
                  >
                    {features.map((feature, index) => (
                      <div
                        key={index}
                        className="w-full flex-shrink-0 bg-gradient-to-r from-orange-500/5 via-teal-500/5 to-orange-500/5 dark:from-orange-500/10 dark:via-teal-500/10 dark:to-orange-500/10 backdrop-blur-sm p-6"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className={`w-14 h-14 ${feature.color}/10 rounded-xl flex items-center justify-center transition-all duration-300 ${currentFeature === index ? 'scale-110' : 'scale-100'}`}>
                              <div className={feature.color.replace('bg-', 'text-')}>
                                {feature.icon}
                              </div>
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                              {feature.title}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Feature Indicators */}
                <div className="flex justify-center space-x-3 mt-6">
                  {features.map((feature, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (!isTransitioning) {
                          setIsTransitioning(true);
                          setCurrentFeature(index);
                          setTimeout(() => setIsTransitioning(false), 500);
                        }
                      }}
                      className="relative"
                      aria-label={`View ${feature.title}`}
                    >
                      <div 
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                          currentFeature === index 
                            ? `${feature.color} scale-125` 
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                      {/* Active indicator glow */}
                      {currentFeature === index && (
                        <div className="absolute -inset-2 rounded-full border border-orange-500/30 animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA Buttons - Centered */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleGetStarted}
                  disabled={isLoading}
                  className="btn-primary bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 border-none text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Ticket</span>
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
                
                <Link href="/events" className="w-full sm:w-auto">
                  <button className="w-full px-8 py-4 text-lg font-semibold rounded-xl border-2 border-teal-500 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 dark:hover:bg-teal-500/10 transition-all duration-300">
                    Browse Events
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Scroll Indicator for desktop */}
          <div className="hidden lg:flex justify-center mt-12">
            <div className="animate-bounce">
              <div className="w-6 h-10 border-2 border-orange-500/30 rounded-full flex justify-center">
                <div className="w-1 h-3 bg-orange-500 rounded-full mt-2 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}