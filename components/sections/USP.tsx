// components/sections/USP.tsx
import { Shield, Zap, Globe, Users } from 'lucide-react'

export function USP() {
  const features = [
    {
      icon: <Shield className="h-8 w-8" />,
      title: 'Secure & Transparent',
      description: 'Every ticket is an on-chain NFT with verifiable ownership and transfer history.',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: '100% Gasless',
      description: 'Zero gas fees for users. Powered by Biconomy meta-transactions.',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: 'Hybrid Payments',
      description: 'Pay with crypto or traditional methods like Paystack, Flutterwave, and USSD.',
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: 'Global Access',
      description: 'Attend events worldwide with digital tickets that work anywhere.',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ]

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Why Choose{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              CACK-pass?
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            We're redefining event ticketing with blockchain technology and seamless user experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <div className={`${feature.bgColor} w-16 h-16 rounded-xl flex items-center justify-center mb-6`}>
                <div className={feature.color}>
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

        {/* Stats Section */}
        <div className="mt-20 p-8 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-3xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-gray-600 dark:text-gray-400">Uptime</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">0s</div>
              <div className="text-gray-600 dark:text-gray-400">Gas Fees</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-gray-600 dark:text-gray-400">Support</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">100K+</div>
              <div className="text-gray-600 dark:text-gray-400">Happy Users</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}