// components/sections/FormSection.tsx
'use client'

import { useState } from 'react'
import { Mail, Phone, MessageSquare, Send, User, Calendar, Building } from 'lucide-react'
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
    <section className="py-12 md:py-24 bg-background dark:bg-dark-background">
      <div className="responsive-container">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-responsive-md font-bold mb-4 md:mb-6 font-display">
              Get in{' '}
              <span className="text-primary dark:text-dark-primary">Touch</span>
            </h2>
            <p className="section-subtitle">
              Have questions? Want to learn more? Our team is here to help you 
              transform your event experience.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-12">
            {/* Contact Info */}
            <div>
              <h3 className="text-xl md:text-2xl font-bold mb-6 md:mb-8">
                Let's Build Something Amazing Together
              </h3>
              
              <div className="space-y-6 md:space-y-8 mb-8 md:mb-12">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-primary/10 dark:bg-dark-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 md:h-6 md:w-6 text-primary dark:text-dark-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">Email Us</h4>
                    <a 
                      href="mailto:support@CACK-pass.com"
                      className="text-text-light dark:text-dark-secondary hover:text-primary dark:hover:text-dark-primary transition-colors text-base md:text-lg"
                    >
                      support@CACK-pass.com
                    </a>
                    <p className="text-sm text-text-light/70 dark:text-dark-secondary/70 mt-1">
                      Response within 24 hours
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-secondary/10 dark:bg-dark-secondary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 md:h-6 md:w-6 text-secondary dark:text-dark-secondary" />
                  </div>
                  <div>
                    <h4 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">Call Us</h4>
                    <a 
                      href="tel:+2348001234567"
                      className="text-text-light dark:text-dark-secondary hover:text-primary dark:hover:text-dark-primary transition-colors text-base md:text-lg"
                    >
                      +234 800 123 4567
                    </a>
                    <p className="text-sm text-text-light/70 dark:text-dark-secondary/70 mt-1">
                      Available 9AM - 6PM WAT
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-primary/10 dark:bg-dark-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-primary dark:text-dark-primary" />
                  </div>
                  <div>
                    <h4 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">Live Chat</h4>
                    <p className="text-text-light dark:text-dark-secondary text-base md:text-lg">
                      Available 24/7 for instant support
                    </p>
                    <p className="text-sm text-text-light/70 dark:text-dark-secondary/70 mt-1">
                      Chat with our support team
                    </p>
                  </div>
                </div>
              </div>

              {/* Benefits List */}
              <div className="card p-6 md:p-8">
                <h4 className="text-lg md:text-xl font-bold mb-4 md:mb-6">What You'll Get:</h4>
                <ul className="space-y-3 md:space-y-4">
                  <li className="flex items-center">
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                      <CheckIcon />
                    </div>
                    <span className="text-sm md:text-base">Personalized consultation with our experts</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                      <CheckIcon />
                    </div>
                    <span className="text-sm md:text-base">Free event setup and migration assistance</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                      <CheckIcon />
                    </div>
                    <span className="text-sm md:text-base">Custom integration guidance</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                      <CheckIcon />
                    </div>
                    <span className="text-sm md:text-base">No-obligation demo and trial</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Contact Form */}
            <div className="card p-6 md:p-8">
              {isSubmitted ? (
                <div className="text-center py-8 md:py-12">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Send className="h-8 w-8 md:h-10 md:w-10 text-green-500" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-4">Message Sent!</h3>
                  <p className="text-text-light dark:text-dark-secondary mb-6 text-sm md:text-base">
                    We'll get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-primary hover:text-primary-dark dark:text-dark-primary dark:hover:text-dark-primary-dark font-medium"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-xl md:text-2xl font-bold mb-6">Send us a message</h3>
                  
                  <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Full Name *
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-light dark:text-dark-secondary h-4 w-4 md:h-5 md:w-5" />
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="input-field pl-10"
                            placeholder="John Doe"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Email Address *
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-light dark:text-dark-secondary h-4 w-4 md:h-5 md:w-5" />
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="input-field pl-10"
                            placeholder="john@example.com"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-light dark:text-dark-secondary h-4 w-4 md:h-5 md:w-5" />
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="input-field pl-10"
                            placeholder="+234 800 123 4567"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Company
                        </label>
                        <div className="relative">
                          <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-light dark:text-dark-secondary h-4 w-4 md:h-5 md:w-5" />
                          <input
                            type="text"
                            name="company"
                            value={formData.company}
                            onChange={handleChange}
                            className="input-field pl-10"
                            placeholder="Your company"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Your Role
                        </label>
                        <select
                          name="role"
                          value={formData.role}
                          onChange={handleChange}
                          className="input-field"
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
                          className="input-field"
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
                        <MessageSquare className="absolute left-3 top-3 text-text-light dark:text-dark-secondary h-4 w-4 md:h-5 md:w-5" />
                        <textarea
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          rows={4}
                          className="input-field pl-10"
                          placeholder="Tell us about your needs, event size, or any questions..."
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 md:py-4 bg-primary text-white dark:bg-dark-primary dark:text-white rounded-xl font-bold hover:bg-primary-dark dark:hover:bg-dark-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
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
    </section>
  )
}

function CheckIcon() {
  return (
    <svg className="h-3 w-3 md:h-4 md:w-4 text-primary dark:text-dark-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  )
}