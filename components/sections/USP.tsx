// components/sections/USP.tsx
import { Shield, Zap, Globe, Users, Lock, TrendingUp, Ticket, CreditCard } from 'lucide-react'

export function USP() {
  const features = [
    {
      icon: <Ticket className="h-7 w-7 md:h-8 md:w-8" />,
      title: 'Smart Digital Tickets',
      description: 'Every ticket is a beautiful digital collectible that creates lasting memories of your event experience.',
      color: 'text-primary dark:text-dark-primary',
      bgColor: 'bg-primary/10 dark:bg-dark-primary/10',
    },
    {
      icon: <Shield className="h-7 w-7 md:h-8 md:w-8" />,
      title: 'Anti-Scalping Protection',
      description: 'Built-in measures prevent ticket scalping and ensure fair prices for genuine fans.',
      color: 'text-secondary dark:text-dark-secondary',
      bgColor: 'bg-secondary/10 dark:bg-dark-secondary/10',
    },
    {
      icon: <Zap className="h-7 w-7 md:h-8 md:w-8" />,
      title: 'Instant Delivery',
      description: 'Receive your tickets immediately after purchase, ready to use on any device.',
      color: 'text-primary dark:text-dark-primary',
      bgColor: 'bg-primary/10 dark:bg-dark-primary/10',
    },
    {
      icon: <CreditCard className="h-7 w-7 md:h-8 md:w-8" />,
      title: 'Flexible Payments',
      description: 'Pay with cards, mobile money, or bank transfers - we support all major payment methods.',
      color: 'text-secondary dark:text-dark-secondary',
      bgColor: 'bg-secondary/10 dark:bg-dark-secondary/10',
    },
    {
      icon: <Users className="h-7 w-7 md:h-8 md:w-8" />,
      title: 'Easy Sharing',
      description: 'Transfer tickets to friends or family with just a few taps - no complicated processes.',
      color: 'text-primary dark:text-dark-primary',
      bgColor: 'bg-primary/10 dark:bg-dark-primary/10',
    },
    {
      icon: <TrendingUp className="h-7 w-7 md:h-8 md:w-8" />,
      title: 'Smart Resale Market',
      description: 'Safe ticket resale with fair pricing and protection for both buyers and sellers.',
      color: 'text-secondary dark:text-dark-secondary',
      bgColor: 'bg-secondary/10 dark:bg-dark-secondary/10',
    },
  ]

  return (
    <section className="py-12 md:py-24 bg-background dark:bg-dark-background">
      <div className="responsive-container">
        <div className="text-center mb-8 md:mb-16">
          <h2 className="text-responsive-md font-bold mb-4 md:mb-6 font-display">
            Why Choose{' '}
            <span className="text-primary dark:text-dark-primary">CACK-pass?</span>
          </h2>
          <p className="section-subtitle">
            We're reimagining event ticketing with smart technology that puts 
            fans and organizers first.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group"
            >
              <div className="card p-6 md:p-8 hover:shadow-md transition-all duration-300 h-full">
                <div className={`w-12 h-12 md:w-14 md:h-14 ${feature.bgColor} rounded-2xl flex items-center justify-center mb-4 md:mb-6`}>
                  <div className={feature.color}>
                    {feature.icon}
                  </div>
                </div>
                
                <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">
                  {feature.title}
                </h3>
                
                <p className="text-text-light dark:text-dark-secondary text-sm md:text-base">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-12 md:mt-24">
          <div className="bg-surface dark:bg-dark-surface rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-center">
              <div className="p-4 md:p-6">
                <div className="text-2xl md:text-3xl font-bold text-primary dark:text-dark-primary mb-2">99.9%</div>
                <div className="text-text-light dark:text-dark-secondary text-sm md:text-base">Uptime</div>
              </div>
              
              <div className="p-4 md:p-6">
                <div className="text-2xl md:text-3xl font-bold text-primary dark:text-dark-primary mb-2">0s</div>
                <div className="text-text-light dark:text-dark-secondary text-sm md:text-base">Delivery Time</div>
              </div>
              
              <div className="p-4 md:p-6">
                <div className="text-2xl md:text-3xl font-bold text-primary dark:text-dark-primary mb-2">24/7</div>
                <div className="text-text-light dark:text-dark-secondary text-sm md:text-base">Support</div>
              </div>
              
              <div className="p-4 md:p-6">
                <div className="text-2xl md:text-3xl font-bold text-primary dark:text-dark-primary mb-2">100K+</div>
                <div className="text-text-light dark:text-dark-secondary text-sm md:text-base">Happy Users</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}