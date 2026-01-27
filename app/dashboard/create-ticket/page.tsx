// app/dashboard/create-ticket/page.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Calendar, Clock, MapPin, Tag, 
  FileText, DollarSign, Users, Image as ImageIcon,
  Upload, X, Check, Globe, Video, Wifi, Camera,
  Bold, Italic, Link as LinkIcon, Smile, Save,
  Loader2
} from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from 'sonner'
import { ethers } from 'ethers' // Added ethers import

// Category options with icons
const CATEGORIES = [
  { value: 'music', label: 'Music & Concerts', icon: '🎵' },
  { value: 'business', label: 'Business & Tech', icon: '💼' },
  { value: 'arts', label: 'Arts & Culture', icon: '🎨' },
  { value: 'sports', label: 'Sports & Fitness', icon: '⚽' },
  { value: 'food', label: 'Food & Drink', icon: '🍽️' },
  { value: 'networking', label: 'Networking', icon: '🤝' },
  { value: 'workshop', label: 'Workshops & Classes', icon: '🔧' },
  { value: 'conference', label: 'Conferences', icon: '🎓' },
  { value: 'festival', label: 'Festivals & Fairs', icon: '🎪' },
  { value: 'other', label: 'Other', icon: '✨' },
]

// Recent locations mock data
const RECENT_LOCATIONS = [
  { text: 'Lagos, Nigeria', isVirtual: false },
  { text: 'Online Webinar', isVirtual: true },
  { text: 'Abuja Conference Center', isVirtual: false },
]

// Currency options
const CURRENCIES = [
  { value: 'USD', label: 'USD', symbol: '$' },
  { value: 'EUR', label: 'EUR', symbol: '€' },
  { value: 'GBP', label: 'GBP', symbol: '£' },
  { value: 'NGN', label: 'NGN', symbol: '₦' },
]

// Ticket types enum (for paid events)
const TICKET_TYPES = [
  { value: 'GeneralAdmission', label: 'General Admission' },
  { value: 'ReservedSeating', label: 'Reserved Seating' },
  { value: 'VIPPremium', label: 'VIP Premium' },
  { value: 'Others', label: 'Others' },
]

// Type definitions
interface UploadProgress {
  image: number;
  metadata: number;
  blockchain: number;
  total: number;
}

interface MintParams {
  eventId: number;
  ticketType: number;
  metadataURI: string;
  recipient: string;
  price: bigint;
  userWalletAddress: string;
}

interface MintResult {
  success: boolean;
  transactionHash?: string;
  ticketId?: number;
  error?: string;
  gasPaidBy?: string;
}

export default function CreateTicketPage() {
  const { user, authenticated, ready } = usePrivy() // Added user from usePrivy
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ // Added uploadProgress state
    image: 0,
    metadata: 0,
    blockchain: 0,
    total: 0
  })
  const [transactionHash, setTransactionHash] = useState<string>('') // Added transactionHash state
  
  // Form state - updated to include ticketType
  const [formData, setFormData] = useState({
    eventName: '',
    startDate: '',
    startTime: '18:00',
    endDate: '',
    endTime: '20:00',
    category: '',
    customCategory: '',
    location: '',
    description: '',
    isFree: true,
    priceAmount: '0.00',
    currency: 'USD',
    ticketType: 'GeneralAdmission', // Added ticket type
    unlimitedCapacity: true,
    capacity: '',
    image: null as File | null,
    imagePreview: '',
  })

  // Additional state
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [showPriceInput, setShowPriceInput] = useState(false)
  const [showCapacityInput, setShowCapacityInput] = useState(false)
  const [showVirtualOptions, setShowVirtualOptions] = useState(false)
  const [showVirtualLinkField, setShowVirtualLinkField] = useState(false)
  const [virtualOptions, setVirtualOptions] = useState({
    zoomMeeting: false,
    googleMeet: false,
    hasVirtualLink: false,
    virtualLink: '',
  })
  const [charCount, setCharCount] = useState(0)

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  // Set default dates on mount
  useEffect(() => {
    if (ready && authenticated) {
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0]
      }

      setFormData(prev => ({
        ...prev,
        startDate: formatDate(today),
        endDate: formatDate(tomorrow),
        startTime: '18:00',
        endTime: '20:00',
      }))
    }
  }, [ready, authenticated])

  // Handle category change
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, category: value }))
    setShowCustomCategory(value === 'other')
  }

  // Handle location change for virtual detection
  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, location: value }))
    
    // Check if location contains virtual keywords
    const virtualKeywords = ['virtual', 'online', 'zoom', 'meet', 'webinar', 'stream']
    const isVirtual = virtualKeywords.some(keyword => 
      value.toLowerCase().includes(keyword)
    )
    setShowVirtualOptions(isVirtual)
  }

  // Handle price type change
  const handlePriceTypeChange = (isFree: boolean) => {
    setFormData(prev => ({ 
      ...prev, 
      isFree,
      priceAmount: isFree ? '0.00' : ''
    }))
    setShowPriceInput(!isFree)
  }

  // Handle capacity toggle
  const handleCapacityToggle = (unlimited: boolean) => {
    setFormData(prev => ({ 
      ...prev, 
      unlimitedCapacity: unlimited,
      capacity: unlimited ? '' : '100'
    }))
    setShowCapacityInput(!unlimited)
  }

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, GIF)')
      return
    }

    setFormData(prev => ({ ...prev, image: file }))

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, imagePreview: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  // Handle recent location click
  const handleRecentLocationClick = (location: string, isVirtual: boolean) => {
    setFormData(prev => ({ ...prev, location }))
    if (isVirtual) {
      setShowVirtualOptions(true)
    }
  }

  // Handle virtual option change
  const handleVirtualOptionChange = (option: keyof typeof virtualOptions, checked: boolean) => {
    setVirtualOptions(prev => ({
      ...prev,
      [option]: checked,
      ...(option === 'hasVirtualLink' && !checked ? { virtualLink: '' } : {})
    }))
    
    if (option === 'hasVirtualLink') {
      setShowVirtualLinkField(checked)
    }
  }

  // Handle description formatting
  const handleFormatText = (format: 'bold' | 'italic' | 'link' | 'emoji') => {
    const textarea = descriptionRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = formData.description.substring(start, end)

    let formattedText = selectedText
    
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`
        break
      case 'italic':
        formattedText = `*${selectedText}*`
        break
      case 'link':
        const url = prompt('Enter URL:')
        if (url) formattedText = `[${selectedText}](${url})`
        else return
        break
      case 'emoji':
        // In a real app, you'd open an emoji picker
        formattedText = `${selectedText}😊`
        break
    }

    const newDescription = formData.description.substring(0, start) + 
                          formattedText + 
                          formData.description.substring(end)
    
    setFormData(prev => ({ ...prev, description: newDescription }))
    setCharCount(newDescription.length)

    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length)
    }, 0)
  }

  // Mock upload function (replace with actual implementation)
  const uploadToPinata = async (file: File): Promise<{success: boolean, cid: string}> => {
    // This is a mock implementation
    // In production, implement actual Pinata upload
    await new Promise(resolve => setTimeout(resolve, 2000))
    return {
      success: true,
      cid: `Qm${Math.random().toString(36).substring(2)}`
    }
  }

  // Mock metadata creation function
  const createTicketMetadata = (
    formData: any,
    imageCid: string,
    ticketTypeLabel: string,
    price: string
  ) => {
    return {
      name: formData.eventName,
      description: formData.description,
      image: `ipfs://${imageCid}`,
      attributes: [
        {
          trait_type: "Event Type",
          value: formData.category
        },
        {
          trait_type: "Ticket Type",
          value: ticketTypeLabel
        },
        {
          trait_type: "Location",
          value: formData.location
        },
        {
          trait_type: "Price",
          value: price
        },
        {
          trait_type: "Start Date",
          value: formData.startDate
        },
        {
          trait_type: "End Date",
          value: formData.endDate
        }
      ]
    }
  }

  // Mock JSON upload function
  const uploadJSONToPinata = async (
    data: any,
    fileName: string
  ): Promise<{success: boolean, cid: string}> => {
    // This is a mock implementation
    // In production, implement actual Pinata upload
    await new Promise(resolve => setTimeout(resolve, 2000))
    return {
      success: true,
      cid: `Qm${Math.random().toString(36).substring(2)}`
    }
  }

  // Mock blockchain minting function
  const mintTicketOnChain = async (params: MintParams): Promise<MintResult> => {
    // This is a mock implementation
    // In production, implement actual blockchain interaction
    await new Promise(resolve => setTimeout(resolve, 3000))
    return {
      success: true,
      transactionHash: `0x${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`,
      ticketId: Math.floor(Math.random() * 10000),
      gasPaidBy: '0xGaslessWalletAddress'
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.wallet?.address) {
      toast.error('Please connect your wallet to create tickets')
      return
    }

    setIsLoading(true)
    setUploadProgress({ image: 0, metadata: 0, blockchain: 0, total: 0 })

    try {
      // Validate form
      if (!formData.eventName.trim()) {
        throw new Error('Event name is required')
      }
      
      if (!formData.startDate || !formData.endDate) {
        throw new Error('Event dates are required')
      }
      
      if (!formData.location.trim()) {
        throw new Error('Event location is required')
      }
      
      if (!formData.description.trim()) {
        throw new Error('Event description is required')
      }
      
      if (!formData.isFree && !formData.priceAmount) {
        throw new Error('Price is required for paid tickets')
      }
      
      if (!formData.isFree && parseFloat(formData.priceAmount) <= 0) {
        throw new Error('Price must be greater than 0 for paid tickets')
      }
      
      if (!formData.unlimitedCapacity && (!formData.capacity || parseInt(formData.capacity) <= 0)) {
        throw new Error('Valid capacity is required')
      }

      const isFreeEvent = formData.isFree
      let imageCid = ''
      let metadataCid = ''
      let transactionHash = ''
      let ticketId = 0

      // For free events: Only save to database
      if (isFreeEvent) {
        toast.info('Creating free event (database only)...')
        setUploadProgress(prev => ({ ...prev, total: 100 }))
        
        // Skip IPFS and blockchain for free events
        transactionHash = 'FREE_EVENT_NO_TX'
        ticketId = Date.now() // Generate temporary ID for free events
        
      } else {
        // For paid events: Full flow (IPFS + Blockchain)
        
        // Step 1: Upload image to Pinata
        setUploadProgress(prev => ({ ...prev, total: 25 }))
        
        if (formData.image) {
          toast.info('Uploading image to IPFS...')
          const uploadResult = await uploadToPinata(formData.image)
          
          if (!uploadResult.success) {
            throw new Error('Failed to upload image to IPFS')
          }
          
          imageCid = uploadResult.cid
          toast.success(`Image uploaded! CID: ${imageCid.slice(0, 10)}...`)
        }
        
        setUploadProgress(prev => ({ ...prev, image: 100, total: 50 }))

        // Step 2: Create and upload metadata to Pinata
        toast.info('Creating ticket metadata...')
        
        const metadata = createTicketMetadata(
          formData,
          imageCid,
          formData.ticketType,
          formData.priceAmount
        )

        setUploadProgress(prev => ({ ...prev, total: 75 }))
        
        const metadataResult = await uploadJSONToPinata(
          metadata,
          `${formData.eventName.replace(/\s+/g, '-').toLowerCase()}-metadata`
        )
        
        if (!metadataResult.success) {
          throw new Error('Failed to upload metadata to IPFS')
        }
        
        metadataCid = metadataResult.cid
        toast.success(`Metadata uploaded! IPFS URI: ipfs://${metadataCid}`)
        setUploadProgress(prev => ({ ...prev, metadata: 100, total: 85 }))

        // Step 3: Mint ticket on blockchain (gasless)
        toast.info('Minting ticket on blockchain (gasless)...')
        
        // Convert price to wei
        const priceInWei = ethers.parseEther(formData.priceAmount)
        
        const mintParams = {
          eventId: Math.floor(Math.random() * 10000) + 1, // Generate unique event ID
          ticketType: 1, // 1 = Paid
          metadataURI: `ipfs://${metadataCid}`,
          recipient: user.wallet.address, // User's embedded wallet
          price: priceInWei,
          userWalletAddress: user.wallet.address
        }

        setUploadProgress(prev => ({ ...prev, total: 95 }))
        
        const mintResult = await mintTicketOnChain(mintParams)
        
        if (!mintResult.success) {
          throw new Error(`Failed to mint ticket: ${mintResult.error}`)
        }
        
        transactionHash = mintResult.transactionHash!
        ticketId = mintResult.ticketId || 0
        toast.success('Ticket minted on blockchain (gasless)!')
        toast.info(`Gas paid by: ${mintResult.gasPaidBy?.slice(0, 10)}...`)
        setUploadProgress(prev => ({ ...prev, blockchain: 100, total: 100 }))
      }

      // Step 4: Store in database (for both free and paid events)
      toast.info('Saving to database...')
      
      const eventData = {
        title: formData.eventName,
        startDateTime: new Date(`${formData.startDate}T${formData.startTime}`).toISOString(),
        endDateTime: new Date(`${formData.endDate}T${formData.endTime}`).toISOString(),
        category: formData.category,
        customCategory: formData.category === 'other' ? formData.customCategory : undefined,
        location: formData.location,
        description: formData.description,
        isFree: isFreeEvent,
        price: isFreeEvent ? 0 : parseFloat(formData.priceAmount),
        currency: formData.currency,
        ticketType: formData.ticketType, // Added ticket type
        unlimitedCapacity: formData.unlimitedCapacity,
        capacity: formData.unlimitedCapacity ? undefined : parseInt(formData.capacity),
        isVirtual: showVirtualOptions,
        virtualOptions: showVirtualOptions ? virtualOptions : undefined,
        imageCid: isFreeEvent ? undefined : imageCid,
        metadataCid: isFreeEvent ? undefined : metadataCid,
        transactionHash,
        ticketId,
        organizerWallet: user.wallet.address,
        status: 'published',
        isOnChain: !isFreeEvent, // Flag to indicate if on blockchain
        gaslessWallet: !isFreeEvent ? process.env.GASSLESS_PRIVATE_KEY_ADDRESS : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Call your backend API to save to MongoDB
      const dbResponse = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })

      const dbResult = await dbResponse.json()
      
      if (!dbResponse.ok) {
        throw new Error(dbResult.error || 'Failed to save to database')
      }

      // Success!
      const successMessage = isFreeEvent 
        ? 'Free event created successfully!' 
        : 'Paid ticket created and minted successfully!'
      
      toast.success(successMessage)
      
      if (!isFreeEvent) {
        setTransactionHash(transactionHash)
      }
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push(`/dashboard/tickets?created=${dbResult.eventId}`)
      }, 3000)

    } catch (error) {
      console.error('Ticket creation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create ticket')
    } finally {
      setIsLoading(false)
    }
  }

  if (!ready) return <LoadingSpinner fullScreen />
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please login</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Login to create tickets
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4 max-w-2xl">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
            <h1 className="text-xl font-bold">Create Event</h1>
            <div className="w-20"></div> {/* Spacer for balance */}
          </div>
        </div>
      </div>

      {/* Main Form */}
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 1. Event Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Event Name
            </label>
            <input
              type="text"
              value={formData.eventName}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, eventName: e.target.value }))
              }}
              placeholder="What's your event called?"
              maxLength={75}
              required
              autoFocus
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-lg"
            />
            <div className="mt-1 text-right text-sm text-gray-500">
              {formData.eventName.length}/75 characters
            </div>
          </div>

          {/* 2. Start & End Date/Time */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Start
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      required
                      className="w-full pl-7 pr-3 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                      required
                      className="w-full pl-7 pr-3 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* End */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  End
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      required
                      className="w-full pl-7 pr-3 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                      required
                      className="w-full pl-7 pr-3 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Event Category */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Event Category
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={formData.category}
                onChange={handleCategoryChange}
                required
                className="w-full pl-10 pr-3 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
              >
                <option value="">Select category...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Custom Category Input */}
            {showCustomCategory && (
              <div className="mt-4">
                <input
                  type="text"
                  value={formData.customCategory}
                  onChange={(e) => setFormData(prev => ({ ...prev, customCategory: e.target.value }))}
                  placeholder="Specify your category..."
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
          </div>

          {/* 4. Event Location */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Event Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={formData.location}
                onChange={handleLocationChange}
                placeholder="Enter location or virtual link"
                required
                className="w-full pl-10 pr-3 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Recent Locations */}
            {formData.location.length === 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Recent Locations
                </div>
                <div className="flex flex-wrap gap-2">
                  {RECENT_LOCATIONS.map((loc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleRecentLocationClick(loc.text, loc.isVirtual)}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm transition-colors flex items-center gap-2"
                    >
                      {loc.isVirtual ? (
                        <Wifi className="h-3 w-3 text-blue-500" />
                      ) : (
                        <MapPin className="h-3 w-3 text-green-500" />
                      )}
                      {loc.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Virtual Options */}
            {showVirtualOptions && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                  Virtual Options
                </div>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={virtualOptions.zoomMeeting}
                      onChange={(e) => handleVirtualOptionChange('zoomMeeting', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Video className="h-4 w-4 text-blue-500" />
                    <span>Create Zoom meeting</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={virtualOptions.googleMeet}
                      onChange={(e) => handleVirtualOptionChange('googleMeet', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Globe className="h-4 w-4 text-blue-500" />
                    <span>Create Google Meet</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={virtualOptions.hasVirtualLink}
                      onChange={(e) => handleVirtualOptionChange('hasVirtualLink', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <LinkIcon className="h-4 w-4 text-blue-500" />
                    <span>I have a virtual event link</span>
                  </label>
                </div>

                {/* Virtual Link Input */}
                {showVirtualLinkField && (
                  <div className="mt-4">
                    <input
                      type="url"
                      value={virtualOptions.virtualLink}
                      onChange={(e) => setVirtualOptions(prev => ({ ...prev, virtualLink: e.target.value }))}
                      placeholder="Paste your virtual event link"
                      className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Event Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Event Description
            </label>
            
            {/* Toolbar */}
            <div className="flex gap-1 mb-2">
              <button
                type="button"
                onClick={() => handleFormatText('bold')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                title="Bold"
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleFormatText('italic')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                title="Italic"
              >
                <Italic className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleFormatText('link')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                title="Add Link"
              >
                <LinkIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleFormatText('emoji')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                title="Add Emoji"
              >
                <Smile className="h-4 w-4" />
              </button>
            </div>

            <textarea
              ref={descriptionRef}
              value={formData.description}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, description: e.target.value }))
                setCharCount(e.target.value.length)
              }}
              placeholder="Tell people about your event..."
              rows={4}
              required
              maxLength={2000}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div className="mt-1 text-right text-sm text-gray-500">
              {charCount}/2000 characters
            </div>
          </div>

          {/* 6. Ticket Price */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Ticket Price
            </label>
            
            {/* Price Toggle */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <input
                  type="radio"
                  id="free-ticket"
                  name="ticket-price-type"
                  checked={formData.isFree}
                  onChange={() => handlePriceTypeChange(true)}
                  className="hidden"
                />
                <label
                  htmlFor="free-ticket"
                  className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    formData.isFree
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${formData.isFree ? 'bg-green-500/10' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <span className="text-2xl">🎟️</span>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Free</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">$0.00</div>
                    </div>
                  </div>
                </label>
              </div>
              
              <div>
                <input
                  type="radio"
                  id="paid-ticket"
                  name="ticket-price-type"
                  checked={!formData.isFree}
                  onChange={() => handlePriceTypeChange(false)}
                  className="hidden"
                />
                <label
                  htmlFor="paid-ticket"
                  className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    !formData.isFree
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${!formData.isFree ? 'bg-blue-500/10' : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <span className="text-2xl">💰</span>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Paid</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Enter amount</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Price Input (shown when Paid is selected) */}
            {showPriceInput && (
              <div className="mt-4 space-y-4">
                <div className="text-sm font-medium mb-2">Ticket Price Details</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                        {
                          CURRENCIES.find(c => c.value === formData.currency)?.symbol || '$'
                        }
                      </div>
                      <input
                        type="number"
                        value={formData.priceAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, priceAmount: e.target.value }))}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required={!formData.isFree}
                        className="w-full pl-10 pr-3 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full px-3 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {CURRENCIES.map((currency) => (
                        <option key={currency.value} value={currency.value}>
                          {currency.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-1 text-sm text-gray-500">Per ticket</div>
                
                {/* Ticket Type Dropdown (only for paid events) */}
                <div>
                  <div className="text-sm font-medium mb-2">Ticket Type</div>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      value={formData.ticketType}
                      onChange={(e) => setFormData(prev => ({ ...prev, ticketType: e.target.value }))}
                      required={!formData.isFree}
                      className="w-full pl-10 pr-3 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                    >
                      {TICKET_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 7. Ticket Capacity */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Ticket Capacity
            </label>
            
            {/* Capacity Toggle */}
            <div className="mb-4">
              <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-all">
                <input
                  type="checkbox"
                  checked={formData.unlimitedCapacity}
                  onChange={(e) => handleCapacityToggle(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <span className="text-xl font-bold">∞</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Unlimited tickets</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">No capacity limit</div>
                  </div>
                </div>
              </label>
            </div>

            {/* Capacity Input (shown when unlimited is unchecked) */}
            {showCapacityInput && (
              <div className="mt-4">
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                    placeholder="Maximum number of tickets"
                    min="1"
                    required={!formData.unlimitedCapacity}
                    className="w-full pl-10 pr-3 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 8. Event Image */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Event Image
            </label>
            
            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center hover:border-primary transition-colors">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              
              {formData.imagePreview ? (
                <div className="relative">
                  <img
                    src={formData.imagePreview}
                    alt="Event preview"
                    className="w-full max-w-md mx-auto h-64 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, image: null, imagePreview: '' }))
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <Camera className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="font-medium mb-1">Upload Event Image</p>
                  <p className="text-sm text-gray-500">PNG, JPG, or GIF • Max 5MB</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    Choose Image
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-8">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-4 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating...
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
  )
}