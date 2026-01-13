// components/sections/USP.tsx
import { Shield, Zap, Globe, Users, Lock, TrendingUp } from 'lucide-react'

export function USP() {
  const features = [
    {
      icon: <Zap className="h-8 w-8" />,
      title: 'Gasless Transactions',
      description: 'Zero gas fees for end users. Powered by Biconomy meta-transactions and account abstraction.',
      color: 'from-primary-500 to-primary-600',
      bgColor: 'bg-primary-500/10',
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: 'Hybrid Payments',
      description: 'Pay with crypto (ETH, USDC) or traditional methods (Paystack, Flutterwave, USSD).',
      color: 'from-secondary-500 to-secondary-600',
      bgColor: 'bg-secondary-500/10',
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: 'Military-Grade Security',
      description: 'Every ticket is an on-chain NFT with verifiable ownership and transfer history.',
      color: 'from-accent-500 to-accent-600',
      bgColor: 'bg-accent-500/10',
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: 'Global Accessibility',
      description: 'Accessible worldwide with support for multiple currencies and languages.',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500/10',
    },
    {
      icon: <Lock className="h-8 w-8" />,
      title: 'Anti-Fraud Protection',
      description: 'Advanced QR verification, smart contracts, and real-time validation.',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: <TrendingUp className="h-8 w-8" />,
      title: 'Secondary Marketplace',
      description: 'Safe ticket resale with royalties for organizers and price caps.',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-500/10',
    },
  ]

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 font-display">
            Why{' '}
            <span className="gradient-text">CACK-pass?</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            We're redefining event ticketing with cutting-edge blockchain technology 
            and a seamless user experience for everyone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-gray-900/50 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              
              <div className="relative glass-card p-8 rounded-3xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <div className={`w-16 h-16 ${feature.bgColor} rounded-2xl flex items-center justify-center mb-6`}>
                  <div className={`bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}>
                    {feature.icon}
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold mb-4">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
                
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <span className="mr-2">Learn more</span>
                    <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-24 bg-gradient-to-r from-primary-500/10 via-accent-500/10 to-secondary-500/10 rounded-3xl p-8 md:p-12 backdrop-blur-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="relative">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-2">
                99.9%
              </div>
              <div className="text-gray-600 dark:text-gray-400 font-medium">Uptime</div>
            </div>
            
            <div className="relative">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-2">
                $0
              </div>
              <div className="text-gray-600 dark:text-gray-400 font-medium">Gas Fees</div>
            </div>
            
            <div className="relative">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-2">
                24/7
              </div>
              <div className="text-gray-600 dark:text-gray-400 font-medium">Support</div>
            </div>
            
            <div className="relative">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-2">
                100K+
              </div>
              <div className="text-gray-600 dark:text-gray-400 font-medium">Happy Users</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}