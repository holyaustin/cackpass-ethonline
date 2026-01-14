// components/sections/FAQ.tsx
'use client'

import { useState } from 'react'
import { ChevronDown, HelpCircle, MessageSquare, Phone, Mail, Globe } from 'lucide-react'

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const [selectedCategory, setSelectedCategory] = useState('all')

  const faqs = [
    {
      question: 'How does TicketPass work?',
      answer: 'TicketPass provides smart digital tickets for events. Organizers create events and issue digital tickets, while attendees purchase them instantly through our platform. Each ticket is a digital collectible that can be easily accessed and shared.',
      category: 'general',
      keywords: ['basics', 'how it works'],
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept multiple payment methods: Credit/debit cards, Paystack (Nigerian cards and bank transfers), Flutterwave (Pan-African payments), USSD codes for Nigerian banks, and mobile money where available.',
      category: 'payments',
      keywords: ['cards', 'paystack', 'flutterwave', 'ussd'],
    },
    {
      question: 'How do I verify ticket authenticity?',
      answer: 'Every digital ticket has a unique verification code and QR code. Organizers can scan tickets using our app to instantly verify authenticity and prevent fraud.',
      category: 'verification',
      keywords: ['verification', 'QR code', 'security'],
    },
    {
      question: 'Can I resell tickets I purchased?',
      answer: 'Yes! You can securely resell tickets on our platform. Original organizers can set resale rules and price caps to ensure fair pricing for all fans.',
      category: 'resale',
      keywords: ['resale', 'marketplace', 'transfer'],
    },
    {
      question: 'How long does ticket delivery take?',
      answer: 'Ticket delivery is instant. As soon as your payment is confirmed, your digital ticket is available in your account and sent to your email.',
      category: 'delivery',
      keywords: ['delivery', 'instant', 'email'],
    },
    {
      question: 'Do you offer refunds for purchased tickets?',
      answer: 'Refund policies are set by individual event organizers. Most events offer refunds up to 48 hours before the event. Check the specific refund policy on each event page.',
      category: 'refunds',
      keywords: ['refunds', 'policy', 'organizer'],
    },
    {
      question: 'How do I become an event organizer?',
      answer: 'Sign up for a free account, complete your profile verification, and you can start creating events immediately. We offer different plans based on your needs.',
      category: 'organizers',
      keywords: ['organizer', 'create', 'events'],
    },
    {
      question: 'Is my personal and payment data secure?',
      answer: 'Yes, we use industry-standard encryption for all data. Personal information is stored securely in compliance with data protection regulations. Payment information is processed by PCI-DSS compliant providers.',
      category: 'security',
      keywords: ['security', 'encryption', 'privacy'],
    },
    {
      question: 'Do you support international events?',
      answer: 'Absolutely! TicketPass supports events worldwide. We handle multiple currencies, time zones, and international payment methods.',
      category: 'international',
      keywords: ['international', 'global', 'currencies'],
    },
    {
      question: 'Can I use TicketPass on my mobile phone?',
      answer: 'Yes! Our platform is fully responsive and works perfectly on mobile devices. You can also download our mobile app for iOS and Android for the best experience.',
      category: 'mobile',
      keywords: ['mobile', 'app', 'responsive'],
    },
  ]

  const categories = [
    { id: 'all', name: 'All Questions', icon: '❓' },
    { id: 'general', name: 'General', icon: '📱' },
    { id: 'payments', name: 'Payments', icon: '💳' },
    { id: 'organizers', name: 'For Organizers', icon: '🎪' },
    { id: 'security', name: 'Security', icon: '🔒' },
  ]

  const filteredFaqs = faqs.filter(faq => 
    selectedCategory === 'all' || faq.category === selectedCategory
  )

  return (
    <section className="py-12 md:py-24 bg-background dark:bg-dark-background">
      <div className="responsive-container">
        <div className="text-center mb-8 md:mb-16">
          <h2 className="text-responsive-md font-bold mb-4 md:mb-6 font-display">
            Frequently Asked{' '}
            <span className="text-primary dark:text-dark-primary">Questions</span>
          </h2>
          <p className="section-subtitle">
            Find answers to common questions about TicketPass smart ticketing
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-8 md:mb-16">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 md:px-6 md:py-3 rounded-xl font-bold transition-all flex items-center gap-2 text-sm md:text-base ${
                selectedCategory === category.id
                  ? 'bg-primary text-white dark:bg-dark-primary dark:text-white shadow-sm'
                  : 'card text-text dark:text-dark-text hover:shadow-sm'
              }`}
            >
              <span>{category.icon}</span>
              {category.name}
            </button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-4xl mx-auto mb-12 md:mb-24">
          <div className="space-y-3 md:space-y-4">
            {filteredFaqs.map((faq, index) => (
              <div
                key={index}
                className="group"
              >
                <div className="card rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full px-4 py-4 md:px-6 md:py-6 text-left flex items-center justify-between hover:bg-background/50 dark:hover:bg-dark-background/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 dark:bg-dark-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <HelpCircle className="h-4 w-4 md:h-5 md:w-5 text-primary dark:text-dark-primary" />
                      </div>
                      <h3 className="text-base md:text-lg font-semibold text-left">{faq.question}</h3>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 md:h-5 md:w-5 text-text-light dark:text-dark-secondary transition-transform flex-shrink-0 ${
                        openIndex === index ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  
                  {openIndex === index && (
                    <div className="px-4 pb-4 md:px-6 md:pb-6">
                      <div className="pl-0 md:pl-14">
                        <p className="text-text-light dark:text-dark-secondary mb-3 md:mb-4 text-sm md:text-base">{faq.answer}</p>
                        <div className="flex flex-wrap gap-2">
                          {faq.keywords.map((keyword, i) => (
                            <span key={i} className="px-2 py-1 bg-primary/10 text-primary dark:bg-dark-primary/10 dark:text-dark-primary rounded-full text-xs">
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
        <div className="bg-primary dark:bg-dark-primary rounded-2xl md:rounded-3xl p-6 md:p-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0 md:mr-8">
              <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-4">
                Still have questions?
              </h3>
              <p className="opacity-90 text-sm md:text-base">
                Our support team is here to help 24/7
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button className="px-4 py-3 md:px-6 md:py-3 bg-white text-primary dark:text-dark-primary rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto">
                <MessageSquare className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base">Live Chat</span>
              </button>
              <button className="px-4 py-3 md:px-6 md:py-3 border-2 border-white text-white rounded-xl font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto">
                <Phone className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base">Call Support</span>
              </button>
              <button className="px-4 py-3 md:px-6 md:py-3 border-2 border-white text-white rounded-xl font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto">
                <Mail className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base">Email Us</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-12 md:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8">
          <div className="card p-4 md:p-6 text-center">
            <Globe className="h-8 w-8 md:h-10 md:w-10 text-primary dark:text-dark-primary mx-auto mb-3 md:mb-4" />
            <h4 className="text-base md:text-lg font-bold mb-2">Documentation</h4>
            <p className="text-text-light dark:text-dark-secondary mb-3 md:mb-4 text-sm md:text-base">
              Comprehensive guides and tutorials
            </p>
            <button className="text-primary hover:text-primary-dark dark:text-dark-primary dark:hover:text-dark-primary-dark font-medium text-sm md:text-base">
              Read Docs →
            </button>
          </div>
          
          <div className="card p-4 md:p-6 text-center">
            <MessageSquare className="h-8 w-8 md:h-10 md:w-10 text-primary dark:text-dark-primary mx-auto mb-3 md:mb-4" />
            <h4 className="text-base md:text-lg font-bold mb-2">Community</h4>
            <p className="text-text-light dark:text-dark-secondary mb-3 md:mb-4 text-sm md:text-base">
              Join our community of organizers
            </p>
            <button className="text-primary hover:text-primary-dark dark:text-dark-primary dark:hover:text-dark-primary-dark font-medium text-sm md:text-base">
              Join Community →
            </button>
          </div>
          
          <div className="card p-4 md:p-6 text-center">
            <HelpCircle className="h-8 w-8 md:h-10 md:w-10 text-primary dark:text-dark-primary mx-auto mb-3 md:mb-4" />
            <h4 className="text-base md:text-lg font-bold mb-2">Help Center</h4>
            <p className="text-text-light dark:text-dark-secondary mb-3 md:mb-4 text-sm md:text-base">
              Browse help articles and tutorials
            </p>
            <button className="text-primary hover:text-primary-dark dark:text-dark-primary dark:hover:text-dark-primary-dark font-medium text-sm md:text-base">
              Visit Help Center →
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}