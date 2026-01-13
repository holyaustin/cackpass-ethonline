// components/sections/FormSection.tsx
'use client'

import { useState } from 'react'
import { Mail, Phone, MessageSquare, Send, User, Calendar, Globe } from 'lucide-react'
import { toast } from 'sonner'

export function FormSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    role: '',
    eventType: '',
    message: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email || !formData.name) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      toast.success('Message sent successfully!')
      setIsSubmitted(true)
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false)
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: '',
          role: '',
          eventType: '',
          message: '',
        })
      }, 3000)
    } catch (error) {
      toast.error('Failed to send message. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-bold mb-8 font-display">
              Get in{' '}
              <span className="gradient-text">Touch</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Have questions? Want to learn more? Our team is here to help you 
              transform your event experience.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h3 className="text-3xl font-bold mb-8">
                Let's Build Something Amazing Together
              </h3>
              
              <div className="space-y-8 mb-12">
                <div className="flex items-start space-x-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Mail className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-2">Email Us</h4>
                    <a 
                      href="mailto:support@cackpass.com"
                      className="text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors text-lg"
                    >
                      support@cackpass.com
                    </a>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      Response within 24 hours
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Phone className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-2">Call Us</h4>
                    <a 
                      href="tel:+2348001234567"
                      className="text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors text-lg"
                    >
                      +234 800 123 4567
                    </a>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      Available 9AM - 6PM WAT
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-accent-500 to-accent-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-2">Live Chat</h4>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                      Available 24/7 for instant support
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      Chat with our support team
                    </p>
                  </div>
                </div>
              </div>

              {/* Benefits List */}
              <div className="glass-card rounded-3xl p-8">
                <h4 className="text-xl font-bold mb-6">What You'll Get:</h4>
                <ul className="space-y-4">
                  <li className="flex items-center">
                    <div className="w-8 h-8 bg-primary-500/10 rounded-lg flex items-center justify-center mr-4">
                      <CheckIcon />
                    </div>
                    <span>Personalized consultation with our experts</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-8 h-8 bg-primary-500/10 rounded-lg flex items-center justify-center mr-4">
                      <CheckIcon />
                    </div>
                    <span>Free event setup and migration assistance</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-8 h-8 bg-primary-500/10 rounded-lg flex items-center justify-center mr-4">
                      <CheckIcon />
                    </div>
                    <span>Custom integration guidance</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-8 h-8 bg-primary-500/10 rounded-lg flex items-center justify-center mr-4">
                      <CheckIcon />
                    </div>
                    <span>No-obligation demo and trial</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Contact Form */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-accent-500 rounded-3xl blur opacity-0 group-hover:opacity-20 transition duration-500" />
              
              <div className="relative glass-card rounded-3xl p-8">
                {isSubmitted ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Send className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Message Sent!</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      We'll get back to you within 24 hours.
                    </p>
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-2xl font-bold mb-6">Send us a message</h3>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Full Name *
                          </label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                              type="text"
                              name="name"
                              value={formData.name}
                              onChange={handleChange}
                              required
                              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="John Doe"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Email Address *
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleChange}
                              required
                              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="john@example.com"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Phone Number
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleChange}
                              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="+234 800 123 4567"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Company
                          </label>
                          <input
                            type="text"
                            name="company"
                            value={formData.company}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Your company"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Your Role
                          </label>
                          <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Select role</option>
                            <option value="organizer">Event Organizer</option>
                            <option value="manager">Event Manager</option>
                            <option value="marketer">Marketing Manager</option>
                            <option value="entrepreneur">Entrepreneur</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Event Type
                          </label>
                          <select
                            name="eventType"
                            value={formData.eventType}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">Select event type</option>
                            <option value="conference">Conference</option>
                            <option value="concert">Concert</option>
                            <option value="festival">Festival</option>
                            <option value="sports">Sports Event</option>
                            <option value="corporate">Corporate Event</option>
                            <option value="virtual">Virtual Event</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Message
                        </label>
                        <div className="relative">
                          <MessageSquare className="absolute left-4 top-4 text-gray-400 h-5 w-5" />
                          <textarea
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            rows={4}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Tell us about your needs, event size, or any questions..."
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-xl font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-5 w-5" />
                            Send Message
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CheckIcon() {
  return (
    <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  )
}