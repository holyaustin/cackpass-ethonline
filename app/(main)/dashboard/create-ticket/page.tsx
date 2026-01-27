// app/(main)/dashboard/create-ticket/page.tsx
'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Ticket, Calendar, MapPin, Users, Image as ImageIcon, DollarSign, Upload, Sparkles } from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function CreateTicketPage() {
  const { authenticated, ready } = usePrivy()
  const [formData, setFormData] = useState({
    eventName: '',
    eventDate: '',
    venue: '',
    ticketType: 'general',
    price: '',
    quantity: '1',
    description: '',
  })
  const [preview, setPreview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      alert('Ticket created successfully!')
      // Reset form
      setFormData({
        eventName: '',
        eventDate: '',
        venue: '',
        ticketType: 'general',
        price: '',
        quantity: '1',
        description: '',
      })
    } catch (error) {
      console.error('Failed to create ticket:', error)
      alert('Failed to create ticket. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Handle image upload logic here
      console.log('Uploading image:', file.name)
    }
  }

  if (!ready) return <LoadingSpinner fullScreen />
  if (!authenticated) return <div className="p-8 text-center">Please sign in to create tickets</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50 dark:from-gray-950 dark:to-gray-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Create Digital Ticket</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Design your custom digital collectible ticket</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="glass-card rounded-2xl p-6">
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Event Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Event Name *
                  </label>
                  <input
                    type="text"
                    name="eventName"
                    value={formData.eventName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., AfroBeats Festival"
                    required
                  />
                </div>

                {/* Date & Venue */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Event Date *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="date"
                        name="eventDate"
                        value={formData.eventDate}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Venue *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        name="venue"
                        value={formData.venue}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="e.g., Lagos Arena"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Ticket Type & Price */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Ticket Type
                    </label>
                    <select
                      name="ticketType"
                      value={formData.ticketType}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="general">General Admission</option>
                      <option value="vip">VIP Pass</option>
                      <option value="backstage">Backstage Pass</option>
                      <option value="earlybird">Early Bird</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Price (USD) *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Number of Tickets
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      min="1"
                      max="1000"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Add event description..."
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Event Image
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-primary transition-colors">
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <p className="font-medium mb-1">Upload Event Image</p>
                      <p className="text-sm text-gray-500">Drag & drop or click to browse</p>
                      <p className="text-xs text-gray-400 mt-2">PNG, JPG up to 5MB</p>
                    </label>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 btn-primary py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Ticket className="h-5 w-5" />
                        Create Ticket
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setPreview(!preview)}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {preview ? 'Edit' : 'Preview'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Preview Section */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-6">Ticket Preview</h3>
            
            <div className="bg-gradient-to-br from-orange-500 to-orange-400 rounded-2xl p-6 text-white">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                      <Ticket className="h-6 w-6" />
                    </div>
                    <span className="text-2xl font-bold">CACK-pass</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm">
                      {formData.ticketType.toUpperCase()}
                    </span>
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm">
                      DIGITAL
                    </span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    ${formData.price || '0.00'}
                  </div>
                  <div className="text-sm opacity-90">Per Ticket</div>
                </div>
              </div>
              
              {/* Event Details */}
              <div className="mb-6">
                <h4 className="text-2xl font-bold mb-2">
                  {formData.eventName || 'Event Name'}
                </h4>
                <div className="space-y-1 opacity-90">
                  <p>{formData.venue || 'Venue Location'}</p>
                  <p>
                    {formData.eventDate 
                      ? new Date(formData.eventDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Event Date'
                    }
                  </p>
                </div>
              </div>
              
              {/* QR Code Placeholder */}
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Digital Collectible</div>
                    <div className="text-sm opacity-80">Scan to verify</div>
                  </div>
                  <div className="w-16 h-16 bg-white rounded-lg p-2">
                    <div className="grid grid-cols-4 gap-1">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div 
                          key={i}
                          className={`w-2 h-2 rounded-sm ${
                            i % 2 === 0 ? 'bg-orange-500' : 'bg-teal-500'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="text-sm opacity-80 text-center">
                Digital Collectible #{Math.floor(Math.random() * 10000).toString().padStart(4, '0')}
              </div>
            </div>
            
            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-500/10 rounded-xl">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                <span className="font-semibold">Note:</span> Your ticket will be minted as a digital collectible on the blockchain. Once created, it cannot be edited.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}