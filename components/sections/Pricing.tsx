// components/sections/Pricing.tsx
'use client'

import { useState } from 'react'
import { Check, X, Star, HelpCircle, Zap, Users, Globe, Shield } from 'lucide-react'

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly')
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | 'enterprise'>('pro')

  const plans = [
    {
      id: 'free',
      name: 'Starter',
      description: 'Perfect for small events and personal use',
      icon: <Zap className="h-6 w-6" />,
      price: {
        monthly: 0,
        yearly: 0,
      },
      features: [
        'Up to 100 tickets per event',
        'Basic QR check-in',
        'Email support',
        '1 organizer account',
        'Basic analytics',
        'Limited to 3 events per month',
      ],
      limitations: [
        'No secondary marketplace',
        'No custom branding',
        'Basic payment options only',
      ],
      buttonText: 'Get Started Free',
      popular: false,
      color: 'from-gray-500 to-gray-600',
    },
    {
      id: 'pro',
      name: 'Professional',
      description: 'For growing event businesses and professionals',
      icon: <Users className="h-6 w-6" />,
      price: {
        monthly: 49,
        yearly: 39,
      },
      features: [
        'Unlimited tickets per event',
        'Advanced QR check-in',
        'Priority support',
        'Up to 5 organizer accounts',
        'Advanced analytics dashboard',
        'Unlimited events',
        'Secondary marketplace',
        'Custom branding',
        'Hybrid payments',
      ],
      limitations: [],
      buttonText: 'Start Free Trial',
      popular: true,
      color: 'from-primary-600 to-accent-600',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large organizations and festivals',
      icon: <Globe className="h-6 w-6" />,
      price: {
        monthly: 199,
        yearly: 159,
      },
      features: [
        'Everything in Professional',
        'Dedicated account manager',
        '24/7 phone support',
        'Unlimited organizer accounts',
        'Custom integrations',
        'White-label solution',
        'API access',
        'On-site training',
        'SLA guarantee',
      ],
      limitations: [],
      buttonText: 'Contact Sales',
      popular: false,
      color: 'from-purple-600 to-pink-600',
    },
  ]

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-bold mb-8 font-display">
            Simple, Transparent{' '}
            <span className="gradient-text">Pricing</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
            Choose the perfect plan for your needs. No hidden fees, no surprises. 
            All plans include gasless transactions.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex glass-card rounded-2xl p-1 mb-16">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-8 py-3 rounded-xl font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-8 py-3 rounded-xl font-bold transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Yearly <span className="text-white bg-green-500 px-2 py-1 rounded-full text-sm ml-2">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`group relative ${
                plan.popular ? 'md:scale-105 md:-translate-y-4' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-primary-600 to-accent-600 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg">
                    <Star className="h-4 w-4 fill-current" />
                    Most Popular
                  </div>
                </div>
              )}
              
              <div className={`absolute -inset-0.5 bg-gradient-to-r ${plan.color} rounded-3xl blur opacity-0 group-hover:opacity-20 transition duration-500`} />
              
              <div
                className={`relative glass-card rounded-3xl p-8 border-2 transition-all duration-300 ${
                  plan.popular
                    ? 'border-primary-500 shadow-2xl'
                    : 'border-gray-200 dark:border-gray-700'
                } ${selectedPlan === plan.id ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}
                onClick={() => setSelectedPlan(plan.id as any)}
              >
                <div className="text-center mb-8">
                  <div className={`w-16 h-16 bg-gradient-to-r ${plan.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <div className="text-white">
                      {plan.icon}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{plan.description}</p>
                </div>

                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center">
                    <span className="text-5xl font-bold">
                      ${billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly}
                    </span>
                    <span className="text-gray-500 ml-2">/month</span>
                  </div>
                  {plan.price.monthly > 0 && billingCycle === 'yearly' && (
                    <p className="text-sm text-gray-500 mt-2">
                      Billed annually (${plan.price.yearly * 12})
                    </p>
                  )}
                </div>

                <div className="mb-8">
                  <h4 className="font-semibold mb-4 text-lg">What's included:</h4>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.limitations.length > 0 && (
                    <>
                      <h4 className="font-semibold mb-4 mt-6 text-gray-500">Limitations:</h4>
                      <ul className="space-y-3">
                        {plan.limitations.map((limitation, index) => (
                          <li key={index} className="flex items-start text-gray-500">
                            <X className="h-5 w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                            <span>{limitation}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>

                <button
                  className={`w-full py-4 rounded-xl font-bold transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white hover:shadow-lg hover:scale-105'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {plan.buttonText}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Callout */}
        <div className="mt-24 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary-500/10 to-accent-500/10 rounded-full backdrop-blur-sm mb-6">
            <HelpCircle className="h-5 w-5 text-primary-500" />
            <span className="text-sm font-medium bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              Questions? We have answers
            </span>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Still not sure which plan is right for you?
          </p>
          <button className="px-8 py-3 border-2 border-primary-500 text-primary-500 rounded-xl font-bold hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-all">
            Compare All Features
          </button>
        </div>

        {/* Guarantee Banner */}
        <div className="mt-20 bg-gradient-to-r from-primary-500/10 via-accent-500/10 to-secondary-500/10 rounded-3xl p-8 md:p-12 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-8 md:mb-0 md:mr-8">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-8 w-8 text-primary-500" />
                <h3 className="text-2xl font-bold">30-Day Money Back Guarantee</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Try CACK-pass risk-free. If you're not satisfied, get a full refund within 30 days.
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-3xl font-bold mb-2">$0</div>
              <div className="text-gray-600 dark:text-gray-400">Gas fees forever</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}