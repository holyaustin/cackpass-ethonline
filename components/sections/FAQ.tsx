// components/sections/FAQ.tsx
'use client'

import { useState } from 'react'
import { ChevronDown, HelpCircle, MessageSquare, Phone, Mail, Globe } from 'lucide-react'

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const [selectedCategory, setSelectedCategory] = useState('all')

  const faqs = [
    {
      question: 'How does gasless ticketing actually work?',
      answer: 'We use Biconomy meta-transactions and account abstraction to cover gas fees on your behalf. When you mint a ticket, our relayer pays the gas fees, and you never need to hold any cryptocurrency for transaction costs. The NFT ticket is minted directly to your embedded wallet without any gas fees.',
      category: 'general',
      keywords: ['gasless', 'meta-transactions', 'Biconomy'],
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept multiple payment methods: Crypto (ETH, USDC, USDT), Paystack (Nigerian cards and bank transfers), Flutterwave (Pan-African payments), USSD codes for Nigerian banks, and traditional card payments via Stripe for international users.',
      category: 'payments',
      keywords: ['crypto', 'paystack', 'flutterwave', 'ussd'],
    },
    {
      question: 'How do I verify ticket authenticity?',
      answer: 'Every ticket is an NFT on the blockchain with a unique token ID. You can verify authenticity by checking on-chain ownership via our verification tool or using our QR code scanner app. Organizers can scan tickets to instantly verify validity and prevent fraud.',
      category: 'verification',
      keywords: ['NFT', 'blockchain', 'verification', 'QR'],
    },
    {
      question: 'Can I resell my tickets on your platform?',
      answer: 'Yes! You can securely resell tickets on our built-in secondary marketplace. Original organizers earn royalties (configurable from 0-50%) on secondary sales. Resale prices can be capped by event organizers to prevent scalping.',
      category: 'resale',
      keywords: ['resale', 'marketplace', 'royalties'],
    },
    {
      question: 'How long does ticket minting take?',
      answer: 'Ticket minting is near-instant. For crypto payments, minting happens within seconds once the transaction is confirmed. For fiat payments, minting occurs immediately after payment confirmation from our payment providers. All tickets are gasless regardless of payment method.',
      category: 'technical',
      keywords: ['minting', 'instant', 'gasless'],
    },
    {
      question: 'Do you offer refunds for purchased tickets?',
      answer: 'Refund policies are set by individual event organizers. Most events offer refunds up to 48 hours before the event. You can check the specific refund policy on each event page before purchasing. Platform fees are refundable within 30 days.',
      category: 'refunds',
      keywords: ['refunds', 'policy', 'organizer'],
    },
    {
      question: 'How do I become an event organizer?',
      answer: 'Sign up for a free account, verify your identity, and you can start creating events immediately. We offer different tiers: Free (up to 3 events), Professional (unlimited events), and Enterprise (custom solutions). No technical knowledge required.',
      category: 'organizers',
      keywords: ['organizer', 'create', 'events'],
    },
    {
      question: 'Is my personal and payment data secure?',
      answer: 'Yes, we use industry-standard encryption (AES-256) for all data. Personal information is stored securely in compliance with GDPR and CCPA. Payment information is processed by PCI-DSS compliant providers. We never store your crypto private keys.',
      category: 'security',
      keywords: ['security', 'encryption', 'GDPR', 'privacy'],
    },
    {
      question: 'Do you support international events?',
      answer: 'Absolutely! CACK-pass supports events worldwide. We handle currency conversion, multiple time zones, and international payment methods. Our platform supports 30+ languages and works in 150+ countries.',
      category: 'international',
      keywords: ['international', 'global', 'currencies'],
    },
    {
      question: 'What blockchain do you use?',
      answer: 'We currently operate on Lisk Sepolia testnet for development and will launch on Lisk Mainnet. We also support Ethereum and Polygon for maximum compatibility. All tickets are interoperable ERC-1155 NFTs.',
      category: 'technical',
      keywords: ['blockchain', 'Lisk', 'Ethereum', 'Polygon'],
    },
    {
      question: 'Can I integrate CACK-pass with my existing website?',
      answer: 'Yes! We offer API access for Professional and Enterprise plans. You can embed ticket widgets, use webhooks for real-time updates, and even white-label the entire platform for Enterprise customers.',
      category: 'integration',
      keywords: ['API', 'integration', 'widgets', 'white-label'],
    },
    {
      question: 'How do attendees check in at events?',
      answer: 'Attendees can check in using QR codes displayed in their mobile wallet. Organizers use our scanner app (available for iOS and Android) to scan tickets. We also support offline check-in and bulk check-in options.',
      category: 'checkin',
      keywords: ['check-in', 'QR', 'scanner', 'mobile'],
    },
  ]

  const categories = [
    { id: 'all', name: 'All Questions', icon: '❓' },
    { id: 'general', name: 'General', icon: '📱' },
    { id: 'payments', name: 'Payments', icon: '💳' },
    { id: 'technical', name: 'Technical', icon: '⚙️' },
    { id: 'organizers', name: 'For Organizers', icon: '🎪' },
    { id: 'security', name: 'Security', icon: '🔒' },
  ]

  const filteredFaqs = faqs.filter(faq => 
    selectedCategory === 'all' || faq.category === selectedCategory
  )

  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-bold mb-8 font-display">
            Frequently Asked{' '}
            <span className="gradient-text">Questions</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Find answers to common questions about CACK-pass gasless ticketing
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                selectedCategory === category.id
                  ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-lg'
                  : 'glass-card text-gray-700 dark:text-gray-300 hover:shadow-lg'
              }`}
            >
              <span className="text-lg">{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-4xl mx-auto mb-24">
          <div className="space-y-4">
            {filteredFaqs.map((faq, index) => (
              <div
                key={index}
                className="group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-accent-500 rounded-3xl blur opacity-0 group-hover:opacity-10 transition duration-500" />
                
                <div className="relative glass-card rounded-3xl overflow-hidden">
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-gradient-to-r from-primary-500/10 to-accent-500/10 rounded-2xl flex items-center justify-center">
                        <HelpCircle className="h-6 w-6 text-primary-500" />
                      </div>
                      <h3 className="text-lg font-semibold">{faq.question}</h3>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-400 transition-transform ${
                        openIndex === index ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  
                  {openIndex === index && (
                    <div className="px-8 pb-6">
                      <div className="pl-18">
                        <p className="text-gray-600 dark:text-gray-400 mb-4">{faq.answer}</p>
                        <div className="flex flex-wrap gap-2">
                          {faq.keywords.map((keyword, i) => (
                            <span key={i} className="px-3 py-1 bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-full text-sm">
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Support Section */}
        <div className="bg-gradient-to-r from-primary-600 via-accent-600 to-secondary-600 rounded-3xl p-8 md:p-12 text-white overflow-hidden">
          <div className="relative">
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
            
            <div className="relative flex flex-col md:flex-row items-center justify-between">
              <div className="mb-8 md:mb-0 md:mr-8">
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  Still have questions?
                </h3>
                <p className="opacity-90">
                  Our support team is here to help 24/7
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="px-6 py-3 bg-white text-primary-600 rounded-xl font-bold hover:bg-gray-100 flex items-center justify-center gap-3">
                  <MessageSquare className="h-5 w-5" />
                  Live Chat
                </button>
                <button className="px-6 py-3 border-2 border-white text-white rounded-xl font-bold hover:bg-white/10 flex items-center justify-center gap-3">
                  <Phone className="h-5 w-5" />
                  Call Support
                </button>
                <button className="px-6 py-3 border-2 border-white text-white rounded-xl font-bold hover:bg-white/10 flex items-center justify-center gap-3">
                  <Mail className="h-5 w-5" />
                  Email Us
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-6 rounded-2xl text-center">
            <Globe className="h-12 w-12 text-primary-500 mx-auto mb-4" />
            <h4 className="text-xl font-bold mb-2">Documentation</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Comprehensive guides and API documentation
            </p>
            <button className="text-primary-600 hover:text-primary-700 font-medium">
              Read Docs →
            </button>
          </div>
          
          <div className="glass-card p-6 rounded-2xl text-center">
            <MessageSquare className="h-12 w-12 text-primary-500 mx-auto mb-4" />
            <h4 className="text-xl font-bold mb-2">Community</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Join our Discord community of organizers
            </p>
            <button className="text-primary-600 hover:text-primary-700 font-medium">
              Join Community →
            </button>
          </div>
          
          <div className="glass-card p-6 rounded-2xl text-center">
            <HelpCircle className="h-12 w-12 text-primary-500 mx-auto mb-4" />
            <h4 className="text-xl font-bold mb-2">Help Center</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Browse help articles and tutorials
            </p>
            <button className="text-primary-600 hover:text-primary-700 font-medium">
              Visit Help Center →
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}