// components/sections/Pricing.tsx
'use client'

import { useState } from 'react'
import { Check, X, Star, HelpCircle } from 'lucide-react'

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | 'enterprise'>('pro')

  const plans = [
    {
      id: 'free',
      name: 'Starter',
      description: 'Perfect for small events and personal use',
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
        'Basic payment options',
      ],
      buttonText: 'Get Started Free',
      popular: false,
    },
    {
      id: 'pro',
      name: 'Professional',
      description: 'For growing event businesses and professionals',
      price: {
        monthly: 49,
        yearly: 39,
      },
      features: [
        'Unlimited tickets per event',
        'Advanced QR check-in',
        'Priority support',
        'Up to 5 organizer accounts',
        'Advanced analytics',
        'Unlimited events',
        'Secondary marketplace',
        'Custom branding',
      ],
      limitations: [],
      buttonText: 'Start Free Trial',
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large organizations and festivals',
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
      ],
      limitations: [],
      buttonText: 'Contact Sales',
      popular: false,
    },
  ]

  return (
    <section className="py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Simple, Transparent{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Pricing
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
            Choose the perfect plan for your needs. No hidden fees, no surprises.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 mb-12">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white dark:bg-gray-700 shadow-md'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-white dark:bg-gray-700 shadow-md'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Yearly <span className="text-primary font-bold ml-1">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 border-2 transition-all duration-300 ${
                plan.popular
                  ? 'border-primary shadow-2xl scale-105'
                  : 'border-gray-200 dark:border-gray-700 shadow-lg'
              } ${selectedPlan === plan.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
              onClick={() => setSelectedPlan(plan.id as any)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
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
                <h4 className="font-semibold mb-4">What's included:</h4>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.limitations.length > 0 && (
                  <>
                    <h4 className="font-semibold mb-4 mt-6 text-gray-500">Limitations:</h4>
                    <ul className="space-y-3">
                      {plan.limitations.map((limitation, index) => (
                        <li key={index} className="flex items-center text-gray-500">
                          <X className="h-5 w-5 text-gray-400 mr-3" />
                          <span>{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <button
                className={`w-full py-4 rounded-xl font-semibold transition-all ${
                  plan.popular
                    ? 'bg-primary text-white hover:bg-primary-dark'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Callout */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
            <HelpCircle className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Questions? We have answers
            </span>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Still not sure which plan is right for you?
          </p>
          <button className="px-8 py-3 border-2 border-primary text-primary rounded-xl font-semibold hover:bg-primary/10">
            Compare All Features
          </button>
        </div>
      </div>
    </section>
  )
}