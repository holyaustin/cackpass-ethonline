'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Calendar, Clock, MapPin, Tag, 
  DollarSign, Users, Upload, X, Check,
  Save, Loader2, Map, Building, Home, Coffee, Zap,
  Monitor, Video, Plus, Trash2, Camera
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'

// Lazy load heavy components
const LoadingSpinner = dynamic(() => 
  import('@/components/common/LoadingSpinner').then(mod => ({ default: mod.LoadingSpinner })),
  { ssr: false }
)

// Skeleton components for better UX
function FormSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i}>
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        </div>
      ))}
    </div>
  )
}

// Category options
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

// Location types
const LOCATION_TYPES = [
  { id: 'in_person', label: 'In Person', icon: MapPin, description: 'Physical venue or location' },
  { id: 'zoom', label: 'Zoom', icon: Video, description: 'Zoom meeting' },
  { id: 'google_meet', label: 'Google Meet', icon: Monitor, description: 'Google Meet' },
  { id: 'custom_link', label: 'Custom Link', icon: Map, description: 'Your own virtual link' },
]

// Venue types
const VENUE_TYPES = [
  { id: 'conference_center', label: 'Conference Center', icon: Building },
  { id: 'hotel', label: 'Hotel', icon: Home },
  { id: 'cafe', label: 'Cafe/Restaurant', icon: Coffee },
  { id: 'studio', label: 'Studio', icon: Zap },
  { id: 'stadium', label: 'Stadium/Arena', icon: Map },
  { id: 'other_venue', label: 'Other Venue', icon: MapPin },
]

// Countries
const COUNTRIES = [
  { value: 'Nigeria', label: 'Nigeria', flag: '🇳🇬' },
  { value: 'USA', label: 'United States', flag: '🇺🇸' },
  { value: 'UK', label: 'United Kingdom', flag: '🇬🇧' },
  { value: 'Kenya', label: 'Kenya', flag: '🇰🇪' },
  { value: 'Ghana', label: 'Ghana', flag: '🇬🇭' },
  { value: 'South Africa', label: 'South Africa', flag: '🇿🇦' },
  { value: 'Canada', label: 'Canada', flag: '🇨🇦' },
  { value: 'Other', label: 'Other Country', flag: '🌍' },
]

// Currencies
const CURRENCIES = [
  { value: 'NGN', label: 'NGN', symbol: '₦' },
  { value: 'USD', label: 'USD', symbol: '$' },
  { value: 'EUR', label: 'EUR', symbol: '€' },
  { value: 'GBP', label: 'GBP', symbol: '£' },
]

// Ticket types enum
const TICKET_TYPES = [
  { value: 'GeneralAdmission', label: 'General Admission' },
  { value: 'ReservedSeating', label: 'Reserved Seating' },
  { value: 'VIPPremium', label: 'VIP Premium' },
  { value: 'Others', label: 'Others' },
]

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

// Type guards for wallet accounts
function isWalletAccount(account: any): account is { type: 'wallet'; address: string; walletClientType?: string } {
  if (typeof account !== 'object' || account === null) return false
  if (account.type !== 'wallet') return false
  if (!('address' in account)) return false
  return typeof account.address === 'string'
}

function isEmbeddedWallet(account: any): account is { type: 'wallet'; address: string; walletClientType: 'privy' } {
  if (!isWalletAccount(account)) return false
  if (!('walletClientType' in account)) return false
  return account.walletClientType === 'privy'
}

function isEmailAccount(account: any): account is { type: 'email'; address: string } {
  if (typeof account !== 'object' || account === null) return false
  if (account.type !== 'email') return false
  if (!('address' in account)) return false
  return typeof account.address === 'string'
}

function isOAuthAccount(account: any): account is { type: 'oauth'; provider: string; email?: string; name?: string; username?: string } {
  if (typeof account !== 'object' || account === null) return false
  if (account.type !== 'oauth') return false
  return 'provider' in account
}

// Helper function to extract wallet address from Privy user
function extractWalletAddress(user: any): string | null {
  if (user?.wallet?.address && typeof user.wallet.address === 'string') {
    return user.wallet.address
  }
  
  const linkedAccounts = user?.linkedAccounts || []
  const embeddedWallet = linkedAccounts.find(isEmbeddedWallet)
  if (embeddedWallet) return embeddedWallet.address
  
  const anyWallet = linkedAccounts.find(isWalletAccount)
  if (anyWallet) return anyWallet.address
  
  return null
}

// Helper function to extract email from Privy user
function extractEmailFromPrivyUser(privyUser: any): string {
  const linkedAccounts = privyUser.linkedAccounts || []
  
  for (const account of linkedAccounts) {
    if (isEmailAccount(account) && account.address) {
      return account.address
    }
    if (isOAuthAccount(account) && account.email) {
      return account.email
    }
  }
  
  if (privyUser.email) {
    if (typeof privyUser.email === 'object' && privyUser.email.address) {
      return privyUser.email.address
    } else if (typeof privyUser.email === 'string') {
      return privyUser.email
    }
  }
  
  if (privyUser.emailAddresses && Array.isArray(privyUser.emailAddresses)) {
    const emailObj = privyUser.emailAddresses.find((e: any) => e && e.address)
    if (emailObj && emailObj.address) {
      return emailObj.address
    }
  }
  
  return ''
}

// Helper function to fetch user email from database - memoized
let emailCache: { [key: string]: string } = {}
async function fetchUserEmailFromDatabase(walletAddress: string): Promise<string> {
  if (emailCache[walletAddress]) return emailCache[walletAddress]
  
  try {
    const response = await fetch(`/api/auth/user?walletAddress=${walletAddress}`)
    if (!response.ok) return ''
    const data = await response.json()
    const email = data.user?.email || ''
    if (email) emailCache[walletAddress] = email
    return email
  } catch (error) {
    console.error('Error fetching user email:', error)
    return ''
  }
}

export default function CreateTicketPage() {
  const { user, authenticated, ready } = usePrivy()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isFetchingEmail, setIsFetchingEmail] = useState(true)
  const [formLoaded, setFormLoaded] = useState(false)
  
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
    currency: 'NGN',
    ticketType: 'GeneralAdmission',
    unlimitedCapacity: true,
    capacity: '',
    image: null as File | null,
    imagePreview: '',
  })

  // Location state
  const [locationType, setLocationType] = useState<string>('in_person')
  const [locationDetails, setLocationDetails] = useState<LocationDetails>({
    type: 'in_person',
    venueType: 'conference_center',
    address: '',
    city: '',
    country: 'Nigeria',
    virtualLink: '',
  })

  const [dateError, setDateError] = useState<string>('')
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [showPriceInput, setShowPriceInput] = useState(false)
  const [showCapacityInput, setShowCapacityInput] = useState(false)
  const [charCount, setCharCount] = useState(0)

  // Set form as loaded immediately for instant render
  useEffect(() => {
    setFormLoaded(true)
  }, [])

  // Set default dates on mount
  useEffect(() => {
    if (ready && authenticated) {
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      const formatDate = (date: Date) => date.toISOString().split('T')[0]

      setFormData(prev => ({
        ...prev,
        startDate: formatDate(today),
        endDate: formatDate(tomorrow),
      }))
    }
  }, [ready, authenticated])

  // Load user data - optimized with early return
  useEffect(() => {
    const loadUserData = async () => {
      if (!ready || !authenticated || !user) {
        setIsFetchingEmail(false)
        return
      }
      
      const wallet = extractWalletAddress(user)
      setWalletAddress(wallet)
      
      if (!wallet) {
        setIsFetchingEmail(false)
        return
      }
      
      let email = extractEmailFromPrivyUser(user)
      
      if (!email) {
        // Delay email fetch to not block form render
        setTimeout(async () => {
          email = await fetchUserEmailFromDatabase(wallet)
          setUserEmail(email)
          setIsFetchingEmail(false)
        }, 100)
      } else {
        setUserEmail(email)
        setIsFetchingEmail(false)
      }
    }
    
    loadUserData()
  }, [ready, authenticated, user])

  // Validate dates - debounced
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.startDate && formData.endDate) {
        const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`)
        const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`)
        
        if (endDateTime <= startDateTime) {
          setDateError('End date/time must be after start date/time')
        } else {
          setDateError('')
        }
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [formData.startDate, formData.endDate, formData.startTime, formData.endTime])

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, category: value }))
    setShowCustomCategory(value === 'other')
  }

  const handlePriceTypeChange = (isFree: boolean) => {
    setFormData(prev => ({ 
      ...prev, 
      isFree,
      priceAmount: isFree ? '0.00' : '5000.00',
      currency: 'NGN'
    }))
    setShowPriceInput(!isFree)
  }

  const handleCapacityToggle = (unlimited: boolean) => {
    setFormData(prev => ({ 
      ...prev, 
      unlimitedCapacity: unlimited,
      capacity: unlimited ? '' : '100'
    }))
    setShowCapacityInput(!unlimited)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    setFormData(prev => ({ ...prev, image: file }))

    const reader = new FileReader()
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, imagePreview: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const handleLocationTypeChange = (type: string) => {
    setLocationType(type)
    setLocationDetails(prev => ({ ...prev, type }))
  }

  const handleLocationDetailsChange = (field: keyof LocationDetails, value: string) => {
    setLocationDetails(prev => ({ ...prev, [field]: value }))
  }

  // Upload image to IPFS via Pinata - lazy loaded
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

      return { success: true, cid: result.cid }
    } catch (error) {
      console.error('Upload error:', error)
      return { success: false, cid: '' }
    }
  }

  const formatLocation = (): string => {
    if (locationType === 'in_person') {
      if (locationDetails.address && locationDetails.city) {
        return `${locationDetails.address}, ${locationDetails.city}, ${locationDetails.country || ''}`
      }
      return locationDetails.address || 'Location to be announced'
    } else if (locationType === 'custom_link' && locationDetails.virtualLink) {
      return locationDetails.virtualLink
    } else {
      return `${LOCATION_TYPES.find(l => l.id === locationType)?.label} Meeting`
    }
  }

  // Email sending function - lazy loaded only when needed
  const sendOrganizerEmail = async (eventData: any, eventId: string) => {
    try {
      let organizerEmail = userEmail
      
      if (!organizerEmail && walletAddress) {
        organizerEmail = await fetchUserEmailFromDatabase(walletAddress)
        if (organizerEmail) setUserEmail(organizerEmail)
      }
      
      if (!organizerEmail) {
        console.error('No organizer email found!')
        toast.warning('Event created but email notification could not be sent - no email found')
        return
      }

      const eventDate = new Date(eventData.startDateTime)
      const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      const formattedTime = eventDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })

      const emailPayload = {
        organizerEmail,
        organizerName: organizerEmail.split('@')[0] || 'Organizer',
        eventTitle: eventData.title,
        eventId,
        eventUrl: `${window.location.origin}/events/${eventId}`,
        eventDate: formattedDate,
        eventTime: formattedTime,
        venue: eventData.venue,
        isFree: eventData.isFree,
        price: eventData.isFree ? 'FREE' : `${eventData.currency === 'NGN' ? '₦' : '$'}${eventData.priceAmount}`,
        ticketType: eventData.ticketType,
        capacity: eventData.unlimitedCapacity ? 'Unlimited' : eventData.capacity,
      }

      const response = await fetch('/api/email/organizer-event-created', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload)
      })

      if (!response.ok) {
        toast.warning(`Event created but email notification failed`)
      } else {
        toast.success(`Event created! Confirmation email sent to ${organizerEmail}`)
      }
      
    } catch (emailError) {
      console.error('Email error:', emailError)
      toast.warning('Event created but email notification could not be sent')
    }
  }

  // Main submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!walletAddress) {
      toast.error('Please ensure your wallet is connected')
      return
    }

    if (dateError) {
      toast.error(dateError)
      return
    }

    // Validate required fields
    if (!formData.eventName.trim()) {
      toast.error('Event name is required')
      return
    }
    
    if (!formData.startDate || !formData.endDate) {
      toast.error('Event dates are required')
      return
    }
    
    if (!formData.description.trim()) {
      toast.error('Event description is required')
      return
    }
    
    if (!formData.category) {
      toast.error('Event category is required')
      return
    }
    
    if (!formData.isFree && (!formData.priceAmount || parseFloat(formData.priceAmount) <= 0)) {
      toast.error('Valid price is required for paid tickets')
      return
    }
    
    if (!formData.unlimitedCapacity && (!formData.capacity || parseInt(formData.capacity) <= 0)) {
      toast.error('Valid capacity is required')
      return
    }

    // Validate location
    if (locationType === 'in_person' && !locationDetails.address) {
      toast.error('Address is required for in-person events')
      return
    }
    
    if (locationType === 'custom_link' && !locationDetails.virtualLink) {
      toast.error('Virtual link is required')
      return
    }

    setIsLoading(true)

    try {
      let imageCid = ''
      const formattedLocation = formatLocation()

      // Upload image if provided
      if (formData.image) {
        toast.info('Uploading image...')
        const uploadResult = await uploadToPinata(formData.image)
        
        if (!uploadResult.success) {
          throw new Error('Failed to upload image')
        }
        
        imageCid = uploadResult.cid
        toast.success('Image uploaded!')
      }

      // Prepare base event data
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
        venue: formattedLocation,
        location: { address: formattedLocation },
        description: formData.description,
        isFree: formData.isFree,
        priceAmount: formData.isFree ? '0' : formData.priceAmount,
        price: formData.isFree ? 0 : parseFloat(formData.priceAmount),
        currency: formData.currency,
        ticketType: formData.ticketType,
        unlimitedCapacity: formData.unlimitedCapacity,
        capacity: formData.unlimitedCapacity ? undefined : parseInt(formData.capacity || '0'),
        isVirtual: locationType !== 'in_person',
        virtualOptions: {
          zoomMeeting: locationType === 'zoom',
          googleMeet: locationType === 'google_meet',
          hasVirtualLink: locationType !== 'in_person',
          virtualLink: locationDetails.virtualLink || '',
        },
        imageCid: imageCid,
        organizerWallet: walletAddress,
        status: 'published',
        isOnChain: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      console.log('📝 [SUBMIT] Saving event to database:', eventData)

      toast.info('Saving event to database...')
      
      const dbResponse = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })

      const dbResult = await dbResponse.json()
      
      console.log('📝 [SUBMIT] Database response:', { status: dbResponse.status, result: dbResult })
      
      if (!dbResponse.ok || !dbResult.success) {
        throw new Error(dbResult.error || 'Failed to save event')
      }

      const savedEventId = dbResult.eventId
      const ticketTypesCreated = dbResult.ticketTypesCreated || 0
      const redirectUrl = dbResult.redirectUrl || `/events/${savedEventId}`
      
      console.log(`✅ [SUBMIT] Event saved with ID: ${savedEventId}`)
      console.log(`✅ [SUBMIT] Ticket types created: ${ticketTypesCreated}`)
      console.log(`✅ [SUBMIT] Redirect URL: ${redirectUrl}`)
      
      if (ticketTypesCreated === 0) {
        toast.warning('Event created but ticket types were not created. Please check your configuration.')
      } else {
        toast.success(`Event saved! Created ${ticketTypesCreated} ticket type(s).`)
      }

      // Send email notification in background
      sendOrganizerEmail(eventData, savedEventId)

      const successMessage = formData.isFree 
        ? 'Free event created successfully!'
        : `Paid event created successfully! Ticket price: ${formData.currency === 'NGN' ? '₦' : '$'}${formData.priceAmount}`
      
      toast.success(successMessage)
      
      toast.info(
        <div className="space-y-2">
          <div className="font-semibold">Event Created!</div>
          <div className="text-sm">Redirecting to event page...</div>
          <div className="text-xs text-green-600 mt-1">
            ✓ {ticketTypesCreated} ticket type(s) created
          </div>
        </div>,
        { duration: 2000 }
      )
      
      // Redirect to the newly created event page after 2 seconds
      setTimeout(() => {
        router.push(redirectUrl)
      }, 2000)

    } catch (error) {
      console.error('❌ [SUBMIT] Event creation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create event')
    } finally {
      setIsLoading(false)
    }
  }

  // Loading states - show minimal loading
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Suspense fallback={<div>Loading...</div>}>
          <LoadingSpinner fullScreen text="Loading..." />
        </Suspense>
      </div>
    )
  }
  
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please login</h2>
          <p className="text-gray-600 mb-6">Login to create events</p>
        </div>
      </div>
    )
  }

  // Show warning if no email found - but don't block form render
  if (isFetchingEmail) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="container mx-auto px-4 py-4 max-w-3xl">
            <div className="flex items-center justify-between">
              <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600">
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
              <h1 className="text-xl font-bold">Create Event</h1>
              <div className="w-20"></div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          <FormSkeleton />
        </div>
      </div>
    )
  }

  if (!userEmail || userEmail === '') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
            <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-3">Email Required</h2>
          <p className="text-gray-600 mb-6">
            Please complete your profile with an email address before creating events.
            This is where event confirmations will be sent.
          </p>
          <button
            onClick={() => router.push('/complete-profile')}
            className="w-full py-3 bg-primary text-white rounded-xl font-medium"
          >
            Complete Profile
          </button>
        </div>
      </div>
    )
  }

  const renderLocationInput = () => {
    switch (locationType) {
      case 'in_person':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Venue Type</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {VENUE_TYPES.map((venue) => (
                  <button
                    key={venue.id}
                    type="button"
                    onClick={() => handleLocationDetailsChange('venueType', venue.id)}
                    className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${
                      locationDetails.venueType === venue.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <venue.icon className="h-5 w-5" />
                    <span className="text-sm">{venue.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Address</label>
              <input
                type="text"
                value={locationDetails.address || ''}
                onChange={(e) => handleLocationDetailsChange('address', e.target.value)}
                placeholder="Street address"
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">City</label>
                <input
                  type="text"
                  value={locationDetails.city || ''}
                  onChange={(e) => handleLocationDetailsChange('city', e.target.value)}
                  placeholder="City"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Country</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={locationDetails.country || ''}
                    onChange={(e) => handleLocationDetailsChange('country', e.target.value)}
                    className="w-full pl-10 pr-3 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl appearance-none"
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.value} value={country.value}>
                        {country.flag} {country.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )
      
      case 'zoom':
      case 'google_meet':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Meeting ID</label>
              <input
                type="text"
                value={locationDetails.meetingId || ''}
                onChange={(e) => handleLocationDetailsChange('meetingId', e.target.value)}
                placeholder="Meeting ID"
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password (optional)</label>
              <input
                type="text"
                value={locationDetails.password || ''}
                onChange={(e) => handleLocationDetailsChange('password', e.target.value)}
                placeholder="Meeting password"
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
              />
            </div>
          </div>
        )
      
      case 'custom_link':
        return (
          <div>
            <label className="block text-sm font-medium mb-2">Custom Virtual Event Link</label>
            <input
              type="url"
              value={locationDetails.virtualLink || ''}
              onChange={(e) => handleLocationDetailsChange('virtualLink', e.target.value)}
              placeholder="https://your-event-platform.com/event-id"
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
            />
          </div>
        )
      
      default:
        return <div className="text-center py-8 text-gray-500">Select a location type</div>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600">
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
            <h1 className="text-xl font-bold">Create Event</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Email info banner */}
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-green-700 dark:text-green-300">
              Confirmation email will be sent to: <strong>{userEmail}</strong>
            </span>
          </div>
        </div>

        {formLoaded ? (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Event Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Event Name</label>
              <input
                type="text"
                value={formData.eventName}
                onChange={(e) => setFormData(prev => ({ ...prev, eventName: e.target.value }))}
                placeholder="What's your event called?"
                maxLength={75}
                required
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-lg"
              />
              <div className="mt-1 text-right text-sm text-gray-500">{formData.eventName.length}/75</div>
            </div>

            {/* Date & Time */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Start</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                        required
                        className="w-full pl-10 pr-3 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
                      />
                    </div>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                        required
                        className="w-full pl-10 pr-3 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">End</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                        required
                        className="w-full pl-10 pr-3 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
                      />
                    </div>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                        required
                        className="w-full pl-10 pr-3 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </div>
              {dateError && <div className="text-sm text-red-500">{dateError}</div>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-2">Event Category</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={formData.category}
                  onChange={handleCategoryChange}
                  required
                  className="w-full pl-10 pr-3 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl appearance-none"
                >
                  <option value="">Select category...</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
              </div>
              {showCustomCategory && (
                <div className="mt-4">
                  <input
                    type="text"
                    value={formData.customCategory}
                    onChange={(e) => setFormData(prev => ({ ...prev, customCategory: e.target.value }))}
                    placeholder="Specify your category..."
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium mb-2">Event Location</label>
              <div className="mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {LOCATION_TYPES.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => handleLocationTypeChange(loc.id)}
                      className={`p-4 rounded-xl border flex flex-col items-center text-center gap-3 transition-all ${
                        locationType === loc.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <loc.icon className="h-5 w-5" />
                      <div>
                        <div className="font-medium text-sm">{loc.label}</div>
                        <div className="text-xs text-gray-500">{loc.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-6 p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                {renderLocationInput()}
              </div>
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-sm font-medium mb-1">Location Preview</div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{formatLocation()}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Event Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, description: e.target.value }))
                  setCharCount(e.target.value.length)
                }}
                placeholder="Tell people about your event..."
                rows={8}
                required
                maxLength={5000}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl resize-none"
              />
              <div className="mt-1 text-right text-sm text-gray-500">{charCount}/5000</div>
            </div>

            {/* Ticket Price */}
            <div>
              <label className="block text-sm font-medium mb-3">Ticket Price</label>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <input type="radio" id="free-ticket" name="ticket-price-type" checked={formData.isFree} onChange={() => handlePriceTypeChange(true)} className="hidden" />
                  <label htmlFor="free-ticket" className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    formData.isFree ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800"><span className="text-2xl">🎟️</span></div>
                      <div><div className="font-semibold">Free</div><div className="text-sm text-gray-600">₦0.00</div></div>
                    </div>
                  </label>
                </div>
                <div>
                  <input type="radio" id="paid-ticket" name="ticket-price-type" checked={!formData.isFree} onChange={() => handlePriceTypeChange(false)} className="hidden" />
                  <label htmlFor="paid-ticket" className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    !formData.isFree ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800"><span className="text-2xl">💰</span></div>
                      <div><div className="font-semibold">Paid</div><div className="text-sm text-gray-600">Enter amount</div></div>
                    </div>
                  </label>
                </div>
              </div>

              {showPriceInput && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                          {CURRENCIES.find(c => c.value === formData.currency)?.symbol || '₦'}
                        </div>
                        <input
                          type="number"
                          value={formData.priceAmount}
                          onChange={(e) => setFormData(prev => ({ ...prev, priceAmount: e.target.value }))}
                          placeholder="0.00"
                          min="0"
                          step="100"
                          required
                          className="w-full pl-10 pr-3 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
                        />
                      </div>
                    </div>
                    <div>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full px-3 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Ticket Type</label>
                    <select
                      value={formData.ticketType}
                      onChange={(e) => setFormData(prev => ({ ...prev, ticketType: e.target.value }))}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
                    >
                      {TICKET_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Capacity */}
            <div>
              <label className="block text-sm font-medium mb-3">Ticket Capacity</label>
              <div className="mb-4">
                <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.unlimitedCapacity}
                    onChange={(e) => handleCapacityToggle(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-primary"
                  />
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"><span className="text-xl font-bold">∞</span></div>
                  <div><div className="font-semibold">Unlimited tickets</div><div className="text-sm text-gray-600">No capacity limit</div></div>
                </label>
              </div>
              {showCapacityInput && (
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                    placeholder="Maximum number of tickets"
                    min="1"
                    required
                    className="w-full pl-10 pr-3 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
                  />
                </div>
              )}
            </div>

            {/* Event Image */}
            <div>
              <label className="block text-sm font-medium mb-3">Event Image</label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center">
                <input type="file" id="image-upload" onChange={handleImageUpload} accept="image/*" className="hidden" />
                {formData.imagePreview ? (
                  <div className="relative">
                    <img src={formData.imagePreview} alt="Event preview" className="w-full max-w-md mx-auto h-64 object-cover rounded-lg" />
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, image: null, imagePreview: '' }))} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full">
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
                    <button type="button" onClick={() => document.getElementById('image-upload')?.click()} className="mt-4 px-6 py-2 bg-primary text-white rounded-lg">
                      Choose Image
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-8">
              <button type="button" onClick={() => router.back()} className="flex-1 py-4 border-2 border-gray-300 rounded-xl font-semibold" disabled={isLoading}>
                Cancel
              </button>
              <button type="submit" disabled={isLoading} className="flex-1 py-4 bg-primary text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? <><Loader2 className="h-5 w-5 animate-spin" /> Creating...</> : <><Save className="h-5 w-5" /> Create Event</>}
              </button>
            </div>
          </form>
        ) : (
          <FormSkeleton />
        )}
      </div>
    </div>
  )
}