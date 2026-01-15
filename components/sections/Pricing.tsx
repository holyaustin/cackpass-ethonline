// components/sections/Pricing.tsx
'use client'

import { useState } from 'react'
import { Check, X, Star, HelpCircle, Ticket, Users, Globe, Shield } from 'lucide-react'

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly')
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | 'enterprise'>('pro')

  const plans = [
    {
      id: 'free',
      name: 'Starter',
      description: 'Perfect for small events and personal use',
      icon: <Ticket className="h-6 w-6" />,
      price: {
        monthly: 0,
        yearly: 0,
      },
      features: [
        'Up to 100 tickets per event',
        'Basic digital tickets',
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
      color: 'bg-gray-100 dark:bg-gray-200',
      textColor: 'text-text dark:text-dark-text',
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
        'Smart digital tickets',
        'Priority support',
        'Up to 5 organizer accounts',
        'Advanced analytics dashboard',
        'Unlimited events',
        'Secondary marketplace',
        'Custom branding',
        'Flexible payments',
      ],
      limitations: [],
      buttonText: 'Start Free Trial',
      popular: true,
      color: 'bg-primary dark:bg-dark-primary',
      textColor: 'text-white',
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
      color: 'bg-secondary dark:bg-dark-secondary',
      textColor: 'text-white',
    },
  ]

  return (
    <section className="py-12 md:py-24 bg-background dark:bg-dark-background">
      <div className="responsive-container">
        <div className="text-center mb-8 md:mb-16">
          <h2 className="text-responsive-md font-bold mb-4 md:mb-6 font-display">
            Simple, Transparent{' '}
            <span className="text-primary dark:text-dark-primary">Pricing</span>
          </h2>
          <p className="section-subtitle">
            Choose the perfect plan for your needs. All plans include smart digital tickets.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex bg-surface dark:bg-dark-surface rounded-2xl p-1 mb-8 md:mb-12">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-primary text-white dark:bg-dark-primary dark:text-white shadow-sm'
                  : 'text-text dark:text-dark-text hover:text-primary dark:hover:text-dark-primary'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-primary text-white dark:bg-dark-primary dark:text-white shadow-sm'
                  : 'text-text dark:text-dark-text hover:text-primary dark:hover:text-dark-primary'
              }`}
            >
              Yearly <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs md:text-sm ml-2">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`${plan.popular ? 'md:-translate-y-4' : ''}`}
            >
              {plan.popular && (
                <div className="hidden md:block mb-4">
                  <div className="bg-primary dark:bg-dark-primary text-white px-4 py-2 rounded-full font-bold flex items-center justify-center gap-2">
                    <Star className="h-4 w-4 fill-current" />
                    Most Popular
                  </div>
                </div>
              )}
              
              <div
                className={`card rounded-3xl p-6 md:p-8 border-2 transition-all duration-300 h-full ${
                  plan.popular
                    ? 'border-primary dark:border-dark-primary shadow-sm'
                    : 'border-transparent'
                }`}
              >
                <div className="text-center mb-6 md:mb-8">
                  <div className={`w-14 h-14 ${plan.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <div className={plan.textColor}>
                      {plan.icon}
                    </div>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-text-light dark:text-dark-secondary text-sm md:text-base">{plan.description}</p>
                </div>

                <div className="text-center mb-6 md:mb-8">
                  <div className="flex items-baseline justify-center">
                    <span className="text-3xl md:text-4xl font-bold">
                      ${billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly}
                    </span>
                    <span className="text-text-light dark:text-dark-secondary ml-2">/month</span>
                  </div>
                  {plan.price.monthly > 0 && billingCycle === 'yearly' && (
                    <p className="text-sm text-text-light dark:text-dark-secondary mt-2">
                      Billed annually (${plan.price.yearly * 12})
                    </p>
                  )}
                </div>

                <div className="mb-6 md:mb-8">
                  <h4 className="font-semibold mb-4">What's included:</h4>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-4 w-4 md:h-5 md:w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-sm md:text-base">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.limitations.length > 0 && (
                    <>
                      <h4 className="font-semibold mb-4 mt-6 text-text-light dark:text-dark-secondary">Limitations:</h4>
                      <ul className="space-y-3">
                        {plan.limitations.map((limitation, index) => (
                          <li key={index} className="flex items-start text-text-light dark:text-dark-secondary">
                            <X className="h-4 w-4 md:h-5 md:w-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                            <span className="text-sm md:text-base">{limitation}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>

                <button
                  className={`w-full py-3 md:py-4 rounded-xl font-bold transition-all ${
                    plan.popular
                      ? 'btn-primary'
                      : 'btn-outline'
                  }`}
                >
                  {plan.buttonText}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Callout */}
        <div className="mt-12 md:mt-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-primary/10 dark:bg-dark-primary/10 rounded-full mb-4 md:mb-6">
            <HelpCircle className="h-4 w-4 md:h-5 md:w-5 text-primary dark:text-dark-primary" />
            <span className="text-sm md:text-base font-medium text-primary dark:text-dark-primary">
              Questions? We have answers
            </span>
          </div>
          <p className="text-text-light dark:text-dark-secondary mb-6 md:mb-8 text-sm md:text-base">
            Still not sure which plan is right for you?
          </p>
          <button className="btn-outline px-6 py-3 md:px-8 md:py-4">
            Compare All Features
          </button>
        </div>

        {/* Guarantee Banner */}
        <div className="mt-12 md:mt-20 bg-surface dark:bg-dark-surface rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0 md:mr-8">
              <div className="flex items-center gap-3 mb-3 md:mb-4">
                <Shield className="h-6 w-6 md:h-8 md:w-8 text-primary dark:text-dark-primary" />
                <h3 className="text-lg md:text-xl font-bold">30-Day Money Back Guarantee</h3>
              </div>
              <p className="text-text-light dark:text-dark-secondary text-sm md:text-base">
                Try CACK-pass risk-free. If you're not satisfied, get a full refund within 30 days.
              </p>
            </div>
            
            <div className="text-center md:text-right">
              <div className="text-2xl md:text-3xl font-bold mb-2">Instant</div>
              <div className="text-text-light dark:text-dark-secondary text-sm md:text-base">Ticket Delivery</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}