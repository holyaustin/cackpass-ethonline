// app/organizer/events/create/page.tsx - UPDATED VERSION
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Upload, Calendar, MapPin, Ticket, DollarSign, Users, Shield, 
  RefreshCw, Globe, Lock, Unlock, Plus, Trash2, Save, X
} from 'lucide-react'
import { toast } from 'sonner'

interface TicketTypeForm {
  name: string
  description: string
  category: string
  price: number
  maxSupply: number
  isActive: boolean
}

export default function CreateEventPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [bannerPreview, setBannerPreview] = useState<string>('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    venue: '',
    location: '',
    startDate: '',
    endDate: '',
    isFree: false,
    isActive: true,
    merkleRoot: '', // For whitelist
    maxTicketsPerUser: 0, // 0 = unlimited
    allowResale: true,
    resaleRoyalty: 10, // 10% default royalty
    enableWhitelist: false,
  })
  
  // Ticket types
  const [ticketTypes, setTicketTypes] = useState<TicketTypeForm[]>([
    {
      name: 'General Admission',
      description: 'Standard entry ticket',
      category: 'GeneralAdmission',
      price: 50,
      maxSupply: 1000,
      isActive: true,
    }
  ])
  
  // Handle banner upload
  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Banner image must be less than 5MB')
      return
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }
    
    const reader = new FileReader()
    reader.onloadend = () => {
      setBannerPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }
  
  // Add new ticket type
  const addTicketType = () => {
    setTicketTypes([
      ...ticketTypes,
      {
        name: '',
        description: '',
        category: 'GeneralAdmission',
        price: 0,
        maxSupply: 100,
        isActive: true,
      }
    ])
  }
  
  // Remove ticket type
  const removeTicketType = (index: number) => {
    if (ticketTypes.length <= 1) {
      toast.error('At least one ticket type is required')
      return
    }
    setTicketTypes(ticketTypes.filter((_, i) => i !== index))
  }
  
  // FIXED: Properly typed update function
  const updateTicketType = <K extends keyof TicketTypeForm>(
    index: number, 
    field: K, 
    value: TicketTypeForm[K]
  ) => {
    const updated = [...ticketTypes]
    updated[index] = {
      ...updated[index],
      [field]: value
    }
    setTicketTypes(updated)
  }
  
  // Helper function to update specific fields with proper type handling
  const updateTicketName = (index: number, name: string) => {
    updateTicketType(index, 'name', name)
  }
  
  const updateTicketDescription = (index: number, description: string) => {
    updateTicketType(index, 'description', description)
  }
  
  const updateTicketCategory = (index: number, category: string) => {
    updateTicketType(index, 'category', category)
  }
  
  const updateTicketPrice = (index: number, price: number) => {
    updateTicketType(index, 'price', price)
  }
  
  const updateTicketMaxSupply = (index: number, maxSupply: number) => {
    updateTicketType(index, 'maxSupply', maxSupply)
  }
  
  const updateTicketActive = (index: number, isActive: boolean) => {
    updateTicketType(index, 'isActive', isActive)
  }
  
  // Generate merkle root placeholder (in production, generate from backend)
  const generateMerkleRoot = () => {
    const mockRoot = '0x' + Array(64).fill(0).map(() => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
    setEventForm({ ...eventForm, merkleRoot: mockRoot })
    toast.success('Merkle root generated (mock)')
  }
  
  // Submit event
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // Validate form
      if (!eventForm.title.trim()) {
        throw new Error('Event title is required')
      }
      
      if (!eventForm.startDate || !eventForm.endDate) {
        throw new Error('Start and end dates are required')
      }
      
      const start = new Date(eventForm.startDate)
      const end = new Date(eventForm.endDate)
      if (start >= end) {
        throw new Error('End date must be after start date')
      }
      
      // Validate ticket types
      const validTicketTypes = ticketTypes.filter(t => 
        t.name.trim() && t.maxSupply > 0
      )
      
      if (validTicketTypes.length === 0) {
        throw new Error('At least one valid ticket type is required')
      }
      
      // Prepare data for API
      const eventData = {
        ...eventForm,
        ticketTypes: validTicketTypes.map(t => ({
          ...t,
          price: eventForm.isFree ? 0 : t.price
        })),
        bannerImage: bannerPreview,
      }
      
      // Get auth token from localStorage
      const token = localStorage.getItem('privy_token')
      if (!token) {
        throw new Error('Authentication required')
      }
      
      // Call API
      const response = await fetch('/api/events/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(eventData),
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create event')
      }
      
      toast.success('Event created successfully!')
      router.push(`/organizer/events/${result.eventId}`)
      
    } catch (error) {
      console.error('Event creation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create event')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Create New Event</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Fill in the details below to create your event. All transactions are gasless!
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Banner Upload */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Event Banner</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Upload a banner image (max 5MB)
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8">
                {bannerPreview ? (
                  <div className="relative w-full max-w-2xl">
                    <img
                      src={bannerPreview}
                      alt="Banner preview"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setBannerPreview('')}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Drag & drop or click to upload
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      className="hidden"
                      id="banner-upload"
                    />
                    <label
                      htmlFor="banner-upload"
                      className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark cursor-pointer"
                    >
                      Choose Banner
                    </label>
                  </>
                )}
              </div>
            </div>
            
            {/* Basic Information */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow">
              <h2 className="text-xl font-bold mb-6">Basic Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter event title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Venue
                  </label>
                  <input
                    type="text"
                    value={eventForm.venue}
                    onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., Lagos Convention Center"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.startDate}
                    onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    End Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.endDate}
                    onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Describe your event..."
                  />
                </div>
              </div>
            </div>
            
            {/* Ticket Types */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <Ticket className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Ticket Types</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Configure different ticket categories
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addTicketType}
                  className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Type
                </button>
              </div>
              
              <div className="space-y-6">
                {ticketTypes.map((ticket, index) => (
                  <div key={index} className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold">Ticket Type {index + 1}</h3>
                      {ticketTypes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTicketType(index)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={ticket.name}
                          onChange={(e) => updateTicketName(index, e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="e.g., VIP Pass"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Category
                        </label>
                        <select
                          value={ticket.category}
                          onChange={(e) => updateTicketCategory(index, e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="GeneralAdmission">General Admission</option>
                          <option value="ReservedSeating">Reserved Seating</option>
                          <option value="VIPPremium">VIP Premium</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Price (ETH)
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={ticket.price}
                            onChange={(e) => updateTicketPrice(index, parseFloat(e.target.value) || 0)}
                            disabled={eventForm.isFree}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Max Supply *
                        </label>
                        <div className="relative">
                          <Users className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                          <input
                            type="number"
                            required
                            min="1"
                            value={ticket.maxSupply}
                            onChange={(e) => updateTicketMaxSupply(index, parseInt(e.target.value) || 1)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="1000"
                          />
                        </div>
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2">
                          Description
                        </label>
                        <textarea
                          value={ticket.description}
                          onChange={(e) => updateTicketDescription(index, e.target.value)}
                          rows={2}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Describe this ticket type..."
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={ticket.isActive}
                            onChange={(e) => updateTicketActive(index, e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm font-medium">Active (available for sale)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Free Event Toggle */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Free Event</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Enable to make all tickets free
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventForm.isFree}
                      onChange={(e) => setEventForm({ ...eventForm, isFree: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>
            
            {/* Advanced Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full mb-6"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <Shield className="h-5 w-5 text-purple-500" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl font-bold">Advanced Settings</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Whitelist, resale controls, and more
                    </p>
                  </div>
                </div>
                <div className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              
              {showAdvanced && (
                <div className="space-y-6 pt-6 border-t">
                  {/* Whitelist Settings */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Lock className="h-5 w-5 text-gray-500" />
                        <div>
                          <h4 className="font-medium">Whitelist/Presale</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Restrict ticket sales to specific addresses
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={eventForm.enableWhitelist}
                          onChange={(e) => setEventForm({ 
                            ...eventForm, 
                            enableWhitelist: e.target.checked,
                            merkleRoot: e.target.checked ? eventForm.merkleRoot : ''
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    
                    {eventForm.enableWhitelist && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Merkle Root
                          </label>
                          <div className="flex gap-3">
                            <input
                              type="text"
                              value={eventForm.merkleRoot}
                              onChange={(e) => setEventForm({ ...eventForm, merkleRoot: e.target.value })}
                              placeholder="0x..."
                              className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                            />
                            <button
                              type="button"
                              onClick={generateMerkleRoot}
                              className="px-4 py-3 bg-gray-100 dark:bg-gray-600 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-500 flex items-center gap-2"
                            >
                              <RefreshCw className="h-4 w-4" />
                              Generate
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Merkle root for whitelist verification. Generate after uploading whitelist CSV.
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Max Tickets Per User
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={eventForm.maxTicketsPerUser}
                            onChange={(e) => setEventForm({ ...eventForm, maxTicketsPerUser: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="0 for unlimited"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Resale Settings */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <RefreshCw className="h-5 w-5 text-gray-500" />
                        <div>
                          <h4 className="font-medium">Secondary Market</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Control ticket resale on secondary market
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={eventForm.allowResale}
                          onChange={(e) => setEventForm({ ...eventForm, allowResale: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    
                    {eventForm.allowResale && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium mb-2">
                          Resale Royalty (%)
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="50"
                            step="1"
                            value={eventForm.resaleRoyalty}
                            onChange={(e) => setEventForm({ ...eventForm, resaleRoyalty: parseInt(e.target.value) })}
                            className="flex-1"
                          />
                          <span className="w-16 text-center font-medium">
                            {eventForm.resaleRoyalty}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Percentage you earn from secondary sales (0-50%)
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Event Status */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-gray-500" />
                        <div>
                          <h4 className="font-medium">Event Status</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Make event visible to the public
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={eventForm.isActive}
                          onChange={(e) => setEventForm({ ...eventForm, isActive: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Event...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Create Event
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}