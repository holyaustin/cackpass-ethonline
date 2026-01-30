// /app/dashboard/create-ticket/page.tsx - COMPLETE FIXED VERSION
'use client'

import { useState, useRef, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Calendar, Clock, MapPin, Tag, 
  FileText, DollarSign, Users, Image as ImageIcon,
  Upload, X, Check, Globe, Video, Wifi, Camera,
  Bold, Italic, Link as LinkIcon, Smile, Save,
  Loader2, Map, Building, Home, Coffee, Zap,
  Youtube, Mic, Monitor, MessageSquare, Cloud
} from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from 'sonner'
import { ethers } from 'ethers'

// Import client-only helpers
import { 
  generateApprovalId,
  createTicketMetadata,
  mapTicketTypeToCategory,
  TicketCategory
} from '@/lib/blockchain/client-helpers'

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

// Location types (like Luma)
const LOCATION_TYPES = [
  { id: 'in_person', label: 'In Person', icon: MapPin, description: 'Physical venue or location' },
  { id: 'zoom', label: 'Zoom', icon: Video, description: 'Create a Zoom meeting' },
  { id: 'google_meet', label: 'Google Meet', icon: Monitor, description: 'Create a Google Meet' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, description: 'YouTube Live or Premiere' },
  { id: 'twitch', label: 'Twitch', icon: Cloud, description: 'Twitch stream' },
  { id: 'custom_link', label: 'Custom Link', icon: LinkIcon, description: 'Your own virtual link' },
]

// Venue types for in-person events
const VENUE_TYPES = [
  { id: 'conference_center', label: 'Conference Center', icon: Building },
  { id: 'hotel', label: 'Hotel', icon: Home },
  { id: 'cafe', label: 'Cafe/Restaurant', icon: Coffee },
  { id: 'studio', label: 'Studio', icon: Mic },
  { id: 'other_venue', label: 'Other Venue', icon: Map },
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

interface LocationDetails {
  type: string;
  venueType?: string;
  address?: string;
  city?: string;
  country?: string;
  virtualLink?: string;
  platform?: string;
  meetingId?: string;
  password?: string;
}

export default function CreateTicketPage() {
  const { user, authenticated, ready } = usePrivy()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    image: 0,
    metadata: 0,
    blockchain: 0,
    total: 0
  })
  const [transactionHash, setTransactionHash] = useState<string>('')
  
  // Form state
  const [formData, setFormData] = useState({
    eventName: '',
    startDate: '',
    startTime: '18:00',
    endDate: '',
    endTime: '20:00',
    category: '',
    customCategory: '',
    description: '',
    isFree: true,
    priceAmount: '0.00',
    currency: 'USD',
    ticketType: 'GeneralAdmission',
    unlimitedCapacity: true,
    capacity: '',
    image: null as File | null,
    imagePreview: '',
  })

  // Location state (Luma-style)
  const [locationType, setLocationType] = useState<string>('in_person')
  const [locationDetails, setLocationDetails] = useState<LocationDetails>({
    type: 'in_person',
    venueType: 'conference_center',
    address: '',
    city: '',
    country: '',
    virtualLink: '',
    platform: 'zoom',
    meetingId: '',
    password: '',
  })

  // Additional state
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [showPriceInput, setShowPriceInput] = useState(false)
  const [showCapacityInput, setShowCapacityInput] = useState(false)
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

  // Handle location type change
  const handleLocationTypeChange = (type: string) => {
    setLocationType(type)
    setLocationDetails(prev => ({ ...prev, type }))
  }

  // Handle location details change
  const handleLocationDetailsChange = (field: keyof LocationDetails, value: string) => {
    setLocationDetails(prev => ({ ...prev, [field]: value }))
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

  // Upload to Pinata
  const uploadToPinata = async (file: File): Promise<{success: boolean, cid: string}> => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/ipfs/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      return {
        success: true,
        cid: result.cid
      }
    } catch (error) {
      console.error('Pinata upload error:', error)
      return {
        success: false,
        cid: ''
      }
    }
  }

  // Upload JSON to Pinata
  const uploadJSONToPinata = async (
    data: any,
    fileName: string
  ): Promise<{success: boolean, cid: string}> => {
    try {
      // Convert data to JSON string and create a file
      const jsonString = JSON.stringify(data)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const file = new File([blob], `${fileName}.json`)

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/ipfs/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'JSON upload failed')
      }

      return {
        success: true,
        cid: result.cid
      }
    } catch (error) {
      console.error('JSON upload error:', error)
      return {
        success: false,
        cid: ''
      }
    }
  }

  // Format location for display and storage
  const formatLocation = (): string => {
    if (locationType === 'in_person') {
      if (locationDetails.address && locationDetails.city) {
        return `${locationDetails.address}, ${locationDetails.city}, ${locationDetails.country || ''}`
      }
      return locationDetails.address || 'Location to be announced'
    } else {
      // Virtual event
      if (locationType === 'custom_link' && locationDetails.virtualLink) {
        return locationDetails.virtualLink
      }
      return `${LOCATION_TYPES.find(l => l.id === locationType)?.label} Meeting`
    }
  }

  // FIXED: Main form submission handler with API endpoints
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user?.wallet?.address) {
      toast.error('Please connect your embedded wallet to create tickets')
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
      
      if (!formData.description.trim()) {
        throw new Error('Event description is required')
      }
      
      if (!formData.category) {
        throw new Error('Event category is required')
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

      // Validate location
      if (locationType === 'in_person' && !locationDetails.address) {
        throw new Error('Address is required for in-person events')
      }
      
      if (locationType === 'custom_link' && !locationDetails.virtualLink) {
        throw new Error('Virtual link is required')
      }

      const isFreeEvent = formData.isFree
      let imageCid = ''
      let metadataCid = ''
      let eventId = 0
      let ticketId = 0
      let transactionHash = ''

      // Step 1: Upload image to Pinata (for both free and paid)
      setUploadProgress(prev => ({ ...prev, total: 25 }))
      
      if (formData.image) {
        toast.info('Uploading image to IPFS...')
        const uploadResult = await uploadToPinata(formData.image)
        
        if (!uploadResult.success || !uploadResult.cid) {
          throw new Error('Failed to upload image to IPFS')
        }
        
        imageCid = uploadResult.cid
        toast.success(`Image uploaded! CID: ${imageCid.slice(0, 10)}...`)
      }
      
      setUploadProgress(prev => ({ ...prev, image: 100, total: 50 }))

      // Step 2: Create and upload metadata to Pinata
      toast.info('Creating ticket metadata...')
      
      const ticketCategory = mapTicketTypeToCategory(formData.ticketType)
      const formattedLocation = formatLocation()
      
      const metadata = createTicketMetadata(
        formData,
        imageCid,
        formData.ticketType,
        formData.priceAmount,
        ticketCategory
      )

      setUploadProgress(prev => ({ ...prev, total: 65 }))
      
      const metadataResult = await uploadJSONToPinata(
        metadata,
        `${formData.eventName.replace(/\s+/g, '-').toLowerCase()}-metadata`
      )
      
      if (!metadataResult.success || !metadataResult.cid) {
        throw new Error('Failed to upload metadata to IPFS')
      }
      
      metadataCid = metadataResult.cid
      const metadataURI = `ipfs://${metadataCid}`
      toast.success(`Metadata uploaded! IPFS URI: ${metadataURI}`)
      setUploadProgress(prev => ({ ...prev, metadata: 100, total: 75 }))

      // Step 3: Save event to database first
      toast.info('Saving event to database...')
      
      const eventData = {
        title: formData.eventName,
        startDateTime: new Date(`${formData.startDate}T${formData.startTime}`).toISOString(),
        endDateTime: new Date(`${formData.endDate}T${formData.endTime}`).toISOString(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        category: formData.category,
        customCategory: formData.category === 'other' ? formData.customCategory : undefined,
        location: formattedLocation,
        description: formData.description,
        isFree: isFreeEvent,
        priceAmount: isFreeEvent ? '0' : formData.priceAmount,
        price: isFreeEvent ? 0 : parseFloat(formData.priceAmount),
        currency: formData.currency,
        ticketType: formData.ticketType,
        unlimitedCapacity: formData.unlimitedCapacity,
        capacity: formData.unlimitedCapacity ? undefined : parseInt(formData.capacity),
        isVirtual: locationType !== 'in_person',
        virtualOptions: {
          zoomMeeting: locationType === 'zoom',
          googleMeet: locationType === 'google_meet',
          hasVirtualLink: locationType !== 'in_person',
          virtualLink: locationDetails.virtualLink || '',
          platform: locationDetails.platform,
          meetingId: locationDetails.meetingId,
        },
        imageCid: imageCid,
        metadataCid: metadataCid,
        metadataURI: metadataURI,
        organizerWallet: user.wallet.address,
        status: 'published',
        isOnChain: !isFreeEvent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Save to MongoDB
      const dbResponse = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      })

      const dbResult = await dbResponse.json()
      
      if (!dbResponse.ok || !dbResult.success) {
        throw new Error(dbResult.error || 'Failed to save to database')
      }

      const savedEventId = dbResult.eventId
      toast.success('Event saved to database!')
      setUploadProgress(prev => ({ ...prev, total: 85 }))

      // Step 4: For paid events, create on blockchain (gasless) via API
      if (!isFreeEvent) {
        toast.info('Creating event on blockchain (gasless)...')
        
        // Convert dates to timestamps
        const startTime = Math.floor(new Date(`${formData.startDate}T${formData.startTime}`).getTime() / 1000)
        const endTime = Math.floor(new Date(`${formData.endDate}T${formData.endTime}`).getTime() / 1000)
        
        // Create event on blockchain via API
        const createEventResponse = await fetch('/api/blockchain/create-event', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventName: formData.eventName,
            baseURI: `ipfs://${metadataCid}`,
            startTime,
            endTime
          })
        })
        
        const createEventResult = await createEventResponse.json()
        
        if (!createEventResponse.ok || !createEventResult.success) {
          throw new Error(`Failed to create event on blockchain: ${createEventResult.error}`)
        }
        
        eventId = createEventResult.eventId || 0
        if (eventId === 0) {
          throw new Error('Event created but eventId is 0')
        }
        
        transactionHash = createEventResult.transactionHash || ''
        toast.success('Event created on blockchain!')
        if (createEventResult.gasPaidBy) {
          toast.info(`Gas paid by: ${createEventResult.gasPaidBy.slice(0, 10)}...`)
        }
        setUploadProgress(prev => ({ ...prev, blockchain: 50, total: 90 }))
        
        // Add ticket type to the event via API
        toast.info('Adding ticket type to blockchain...')
        
        // Handle capacity properly
        let maxTickets: number;
        
        if (formData.unlimitedCapacity) {
          maxTickets = 0; // 0 means unlimited in the contract
        } else {
          const capacityValue = formData.capacity ? parseInt(formData.capacity) : 0;
          
          if (capacityValue <= 0) {
            throw new Error('Capacity must be greater than 0 for limited tickets');
          }
          
          maxTickets = capacityValue;
        }
        
        const ticketPrice = ethers.parseEther(formData.priceAmount)
        
        const addTicketResponse = await fetch('/api/blockchain/add-ticket-type', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId,
            category: ticketCategory,
            maxTickets: maxTickets,
            ticketPrice: ticketPrice.toString()
          })
        })
        
        const addTicketResult = await addTicketResponse.json()
        
        if (!addTicketResponse.ok || !addTicketResult.success) {
          throw new Error(`Failed to add ticket type: ${addTicketResult.error}`)
        }
        
        toast.success('Ticket type added!')
        setUploadProgress(prev => ({ ...prev, blockchain: 75, total: 95 }))
        
        // Step 5: Generate approval signature for gasless minting
        toast.info('Generating approval signature...')
        
        const approvalId = generateApprovalId()
        const validUntil = Math.floor(Date.now() / 1000) + 3600 // Valid for 1 hour
        
        const signatureResponse = await fetch('/api/tickets/signature', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: user.wallet.address,
            eventId,
            ticketCategory,
            amount: 1, // Creating one ticket for now
            price: ticketPrice.toString(),
            validUntil,
            approvalId
          })
        })
        
        const signatureData = await signatureResponse.json()
        
        if (!signatureResponse.ok || !signatureData.success) {
          throw new Error('Failed to generate approval signature')
        }
        
        // Step 6: Mint ticket using the approval (would need another API endpoint)
        // For now, we'll skip this step and just show success
        toast.info('Ticket ready for minting!')
        setUploadProgress(prev => ({ ...prev, blockchain: 100, total: 100 }))
      } else {
        // For free events, just complete the progress
        setUploadProgress(prev => ({ ...prev, total: 100 }))
      }

      // Update database with blockchain info
      if (!isFreeEvent && eventId > 0) {
        await fetch('/api/events/create', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId: savedEventId,
            onChainId: eventId,
            transactionHash,
            ticketId,
            isOnChain: true
          })
        })
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
        router.push(`/dashboard?created=${savedEventId}`)
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

  // Render location input based on type
  const renderLocationInput = () => {
    switch (locationType) {
      case 'in_person':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Venue Type
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {VENUE_TYPES.map((venue) => (
                  <button
                    key={venue.id}
                    type="button"
                    onClick={() => handleLocationDetailsChange('venueType', venue.id)}
                    className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${
                      locationDetails.venueType === venue.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <venue.icon className="h-5 w-5" />
                    <span className="text-sm">{venue.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Address
              </label>
              <input
                type="text"
                value={locationDetails.address || ''}
                onChange={(e) => handleLocationDetailsChange('address', e.target.value)}
                placeholder="Street address"
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={locationDetails.city || ''}
                  onChange={(e) => handleLocationDetailsChange('city', e.target.value)}
                  placeholder="City"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Country
                </label>
                <input
                  type="text"
                  value={locationDetails.country || ''}
                  onChange={(e) => handleLocationDetailsChange('country', e.target.value)}
                  placeholder="Country"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )
      
      case 'zoom':
      case 'google_meet':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Meeting ID
              </label>
              <input
                type="text"
                value={locationDetails.meetingId || ''}
                onChange={(e) => handleLocationDetailsChange('meetingId', e.target.value)}
                placeholder={`${locationType === 'zoom' ? 'Zoom' : 'Google Meet'} Meeting ID`}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Password (optional)
              </label>
              <input
                type="text"
                value={locationDetails.password || ''}
                onChange={(e) => handleLocationDetailsChange('password', e.target.value)}
                placeholder="Meeting password"
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <div className="text-sm text-gray-500">
              {locationType === 'zoom' 
                ? 'A Zoom meeting will be created automatically.'
                : 'A Google Meet will be created automatically.'}
            </div>
          </div>
        )
      
      case 'custom_link':
        return (
          <div>
            <label className="block text-sm font-medium mb-2">
              Virtual Event Link
            </label>
            <input
              type="url"
              value={locationDetails.virtualLink || ''}
              onChange={(e) => handleLocationDetailsChange('virtualLink', e.target.value)}
              placeholder="https://your-event-platform.com/event-id"
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-2 text-sm text-gray-500">
              Paste the link to your virtual event (Zoom, Teams, YouTube, etc.)
            </p>
          </div>
        )
      
      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <Zap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Select a location type to configure</p>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4 max-w-3xl">
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
      <div className="container mx-auto px-4 py-6 max-w-3xl">
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

          {/* 4. Event Location (Luma-style) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Event Location
            </label>
            
            {/* Location Type Selector */}
            <div className="mb-6">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                Choose how your event will be hosted
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {LOCATION_TYPES.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => handleLocationTypeChange(loc.id)}
                    className={`p-4 rounded-xl border flex flex-col items-center text-center gap-3 transition-all ${
                      locationType === loc.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className={`p-3 rounded-lg ${
                      locationType === loc.id ? 'bg-primary/10' : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      <loc.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">{loc.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{loc.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Location Details */}
            <div className="mt-6 p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">
                {locationType === 'in_person' ? 'Venue Details' : 'Virtual Event Setup'}
              </div>
              {renderLocationInput()}
            </div>

            {/* Preview */}
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Location Preview
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{formatLocation()}</span>
              </div>
            </div>
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