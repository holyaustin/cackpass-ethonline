// components/sections/FAQ.tsx
'use client'

import { useState } from 'react'
import { ChevronDown, HelpCircle, MessageSquare, Phone } from 'lucide-react'

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = [
    {
      question: 'How does gasless ticketing work?',
      answer: 'We use Biconomy meta-transactions to cover gas fees on your behalf. When you mint a ticket, our relayer pays the gas fees, and you never need to hold any cryptocurrency for transaction fees. The ticket is minted directly to your wallet without any gas cost to you.',
      category: 'general',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept multiple payment methods: Crypto (ETH, USDC), Paystack (Nigerian cards and bank transfers), Flutterwave (Pan-African payments), USSD codes for Nigerian banks, and traditional card payments via our international payment processors.',
      category: 'payments',
    },
    {
      question: 'How do I verify ticket authenticity?',
      answer: 'Every ticket is an NFT on the blockchain. You can verify authenticity by checking the on-chain ownership and using our QR code verification system. Organizers can scan tickets using our scanner app to instantly verify validity.',
      category: 'verification',
    },
    {
      question: 'Can I resell my tickets?',
      answer: 'Yes! You can resell tickets on our secure secondary marketplace. The original organizer earns royalties on secondary sales. Resale prices can be capped by event organizers to prevent scalping.',
      category: 'resale',
    },
    {
      question: 'How long does ticket minting take?',
      answer: 'Ticket minting is near-instant. For crypto payments, minting happens within seconds once the transaction is confirmed. For fiat payments, minting occurs immediately after payment confirmation from our payment providers.',
      category: 'technical',
    },
    {
      question: 'Do you offer refunds?',
      answer: 'Refund policies are set by individual event organizers. Most events offer refunds up to 48 hours before the event. You can check the refund policy on each event page before purchasing.',
      category: 'refunds',
    },
    {
      question: 'How do I become an event organizer?',
      answer: 'Sign up for an organizer account, complete the verification process, and you can start creating events immediately. We offer different tiers depending on your needs, from free for small events to enterprise plans for large festivals.',
      category: 'organizers',
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes, we use industry-standard encryption for all data. Personal information is stored securely, and wallet information is never shared with third parties. We comply with global data protection regulations.',
      category: 'security',
    },
  ]

  const categories = [
    { id: 'all', name: 'All Questions' },
    { id: 'general', name: 'General' },
    { id: 'payments', name: 'Payments' },
    { id: 'technical', name: 'Technical' },
    { id: 'organizers', name: 'For Organizers' },
  ]

  const [selectedCategory, setSelectedCategory] = useState('all')

  const filteredFaqs = faqs.filter(faq => 
    selectedCategory === 'all' || faq.category === selectedCategory
  )

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Frequently Asked{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Questions
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Find answers to common questions about CACK-pass
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                selectedCategory === category.id
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          <div className="space-y-4">
            {filteredFaqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <HelpCircle className="h-5 w-5 text-primary" />
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
                    <div className="pl-14">
                      <p className="text-gray-600 dark:text-gray-400">{faq.answer}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-20 bg-gradient-to-r from-primary to-secondary rounded-3xl p-8 md:p-12 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-8 md:mb-0 md:mr-8">
              <h3 className="text-2xl font-bold mb-2">
                Still have questions?
              </h3>
              <p className="opacity-90">
                Our support team is here to help 24/7
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="px-6 py-3 bg-white text-primary rounded-xl font-semibold hover:bg-gray-100 flex items-center justify-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Live Chat
              </button>
              <button className="px-6 py-3 border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 flex items-center justify-center gap-2">
                <Phone className="h-5 w-5" />
                Call Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}