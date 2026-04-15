'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { 
  ArrowLeft, Calendar, Clock, MapPin, Tag, 
  FileText, DollarSign, Users, Camera,
  X, Globe, Video, Link as LinkIcon, Save,
  Loader2, Map, Building, Home, Coffee, Zap,
  Monitor, Trash2, CheckCircle, AlertCircle
} from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from 'sonner'

// ==================== CONSTANTS (same as create-ticket) ====================
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

const LOCATION_TYPES = [
  { id: 'in_person', label: 'In Person', icon: MapPin, description: 'Physical venue or location' },
  { id: 'zoom', label: 'Zoom', icon: Video, description: 'Zoom meeting' },
  { id: 'google_meet', label: 'Google Meet', icon: Monitor, description: 'Google Meet' },
  { id: 'custom_link', label: 'Custom Link', icon: LinkIcon, description: 'Your own virtual link' },
]

const VENUE_TYPES = [
  { id: 'conference_center', label: 'Conference Center', icon: Building },
  { id: 'hotel', label: 'Hotel', icon: Home },
  { id: 'cafe', label: 'Cafe/Restaurant', icon: Coffee },
  { id: 'studio', label: 'Studio', icon: Zap },
  { id: 'stadium', label: 'Stadium/Arena', icon: Map },
  { id: 'other_venue', label: 'Other Venue', icon: MapPin },
]

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

const CURRENCIES = [
  { value: 'NGN', label: 'NGN', symbol: '₦' },
  { value: 'USD', label: 'USD', symbol: '$' },
  { value: 'EUR', label: 'EUR', symbol: '€' },
  { value: 'GBP', label: 'GBP', symbol: '£' },
]

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
  meetingId?: string;
  password?: string;
}

interface EventData {
  _id: string
  title: string
  description: string
  startDate: string
  endDate: string
  startDateTime: string
  endDateTime: string
  venue: string
  location: { address: string }
  isVirtual: boolean
  virtualOptions: {
    zoomMeeting: boolean
    googleMeet: boolean
    hasVirtualLink: boolean
    virtualLink: string
  }
  category: string
  customCategory?: string
  isFree: boolean
  price: number
  currency: string
  ticketType: string
  unlimitedCapacity: boolean
  capacity?: number
  imageCid?: string
  bannerImage?: string
  status: string
  isActive: boolean
  organizerWallet: string
}

export default function EditEventPage() {
  const params = useParams()
  const router = useRouter()
  const { user, authenticated, ready } = usePrivy()
  const eventId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [event, setEvent] = useState<EventData | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    eventName: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    category: '',
    customCategory: '',
    description: '',
    isFree: true,
    priceAmount: '0.00',
    currency: 'NGN',
    ticketType: 'GeneralAdmission',
    unlimitedCapacity: true,
    capacity: '',
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

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [dateError, setDateError] = useState<string>('')
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [charCount, setCharCount] = useState(0)

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return
      try {
        const res = await fetch(`/api/events/${eventId}`)
        const data = await res.json()
        if (!data.success) throw new Error(data.error)
        const ev = data.event

        // Format dates for input fields
        const start = new Date(ev.startDateTime || ev.startDate)
        const end = new Date(ev.endDateTime || ev.endDate)
        const startDateStr = start.toISOString().split('T')[0]
        const startTimeStr = start.toTimeString().slice(0, 5)
        const endDateStr = end.toISOString().split('T')[0]
        const endTimeStr = end.toTimeString().slice(0, 5)

        setFormData({
          eventName: ev.title,
          startDate: startDateStr,
          startTime: startTimeStr,
          endDate: endDateStr,
          endTime: endTimeStr,
          category: ev.category,
          customCategory: ev.customCategory || '',
          description: ev.description,
          isFree: ev.isFree,
          priceAmount: ev.price.toString(),
          currency: ev.currency,
          ticketType: ev.ticketType,
          unlimitedCapacity: ev.unlimitedCapacity,
          capacity: ev.capacity?.toString() || '',
        })
        setCharCount(ev.description?.length || 0)

        // Location
        if (ev.isVirtual) {
          if (ev.virtualOptions?.zoomMeeting) setLocationType('zoom')
          else if (ev.virtualOptions?.googleMeet) setLocationType('google_meet')
          else if (ev.virtualOptions?.hasVirtualLink) setLocationType('custom_link')
          setLocationDetails({
            type: locationType,
            address: '',
            city: '',
            country: '',
            virtualLink: ev.virtualOptions?.virtualLink || '',
            meetingId: '',
            password: '',
          })
        } else {
          setLocationType('in_person')
          setLocationDetails({
            type: 'in_person',
            venueType: 'other_venue',
            address: ev.venue || ev.location?.address || '',
            city: '',
            country: 'Nigeria',
            virtualLink: '',
          })
        }

        setEvent(ev)
        setImagePreview(ev.imageCid ? `https://gateway.pinata.cloud/ipfs/${ev.imageCid}` : ev.bannerImage || '')
      } catch (error) {
        console.error(error)
        toast.error('Failed to load event')
        router.push('/dashboard')
      } finally {
        setIsLoading(false)
      }
    }
    fetchEvent()
  }, [eventId, router])

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setFormData(prev => ({ ...prev, category: val }))
    setShowCustomCategory(val === 'other')
  }

  const handlePriceTypeChange = (isFree: boolean) => {
    setFormData(prev => ({ ...prev, isFree, priceAmount: isFree ? '0.00' : prev.priceAmount }))
  }

  const handleCapacityToggle = (unlimited: boolean) => {
    setFormData(prev => ({ ...prev, unlimitedCapacity: unlimited, capacity: unlimited ? '' : prev.capacity }))
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
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const uploadToPinata = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/ipfs/upload', { method: 'POST', body: formData })
    const result = await res.json()
    if (!res.ok || !result.success) throw new Error(result.error || 'Upload failed')
    return result.cid
  }

  const formatLocation = (): string => {
    if (locationType === 'in_person') {
      return locationDetails.address || 'Location to be announced'
    } else if (locationType === 'custom_link' && locationDetails.virtualLink) {
      return locationDetails.virtualLink
    } else {
      return `${LOCATION_TYPES.find(l => l.id === locationType)?.label} Meeting`
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event) return

    // Validation
    if (!formData.eventName.trim()) return toast.error('Event name required')
    if (!formData.startDate || !formData.endDate) return toast.error('Dates required')
    if (!formData.description.trim()) return toast.error('Description required')
    if (!formData.category) return toast.error('Category required')
    if (!formData.isFree && (!formData.priceAmount || parseFloat(formData.priceAmount) <= 0))
      return toast.error('Valid price required')
    if (!formData.unlimitedCapacity && (!formData.capacity || parseInt(formData.capacity) <= 0))
      return toast.error('Valid capacity required')
    if (locationType === 'in_person' && !locationDetails.address)
      return toast.error('Address required for in-person events')
    if (locationType === 'custom_link' && !locationDetails.virtualLink)
      return toast.error('Virtual link required')

    setIsSaving(true)
    try {
      let imageCid = event.imageCid || ''
      if (imageFile) {
        toast.info('Uploading new image...')
        imageCid = await uploadToPinata(imageFile)
      }

      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`).toISOString()
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`).toISOString()
      const isVirtual = locationType !== 'in_person'
      const virtualOptions = {
        zoomMeeting: locationType === 'zoom',
        googleMeet: locationType === 'google_meet',
        hasVirtualLink: locationType !== 'in_person',
        virtualLink: locationDetails.virtualLink || '',
      }

      const updateData = {
        title: formData.eventName,
        description: formData.description,
        startDateTime,
        endDateTime,
        startDate: formData.startDate,
        endDate: formData.endDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        category: formData.category,
        customCategory: formData.category === 'other' ? formData.customCategory : undefined,
        venue: formatLocation(),
        location: { address: formatLocation() },
        isVirtual,
        virtualOptions,
        isFree: formData.isFree,
        price: parseFloat(formData.priceAmount),
        currency: formData.currency,
        ticketType: formData.ticketType,
        unlimitedCapacity: formData.unlimitedCapacity,
        capacity: formData.unlimitedCapacity ? undefined : parseInt(formData.capacity || '0'),
        imageCid,
        status: 'published',
        isActive: true,
      }

      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Update failed')

      toast.success('Event updated successfully!')
      router.push(`/events/${eventId}`)
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Failed to update event')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLocationDetailsChange = (field: keyof LocationDetails, value: string) => {
    setLocationDetails(prev => ({ ...prev, [field]: value }))
  }

  const renderLocationInput = () => {
    if (locationType === 'in_person') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Venue Type</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {VENUE_TYPES.map(venue => (
                <button
                  key={venue.id}
                  type="button"
                  onClick={() => handleLocationDetailsChange('venueType', venue.id)}
                  className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${
                    locationDetails.venueType === venue.id ? 'border-primary bg-primary/5' : 'border-gray-200'
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
              className="w-full px-4 py-3 border rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <input
                type="text"
                value={locationDetails.city || ''}
                onChange={(e) => handleLocationDetailsChange('city', e.target.value)}
                className="w-full px-4 py-3 border rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Country</label>
              <select
                value={locationDetails.country || ''}
                onChange={(e) => handleLocationDetailsChange('country', e.target.value)}
                className="w-full px-4 py-3 border rounded-xl"
              >
                {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.flag} {c.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )
    } else if (locationType === 'zoom' || locationType === 'google_meet') {
      return (
        <div className="space-y-4">
          <div><label className="block text-sm font-medium mb-2">Meeting ID</label><input type="text" value={locationDetails.meetingId || ''} onChange={(e) => handleLocationDetailsChange('meetingId', e.target.value)} className="w-full px-4 py-3 border rounded-xl" /></div>
          <div><label className="block text-sm font-medium mb-2">Password (optional)</label><input type="text" value={locationDetails.password || ''} onChange={(e) => handleLocationDetailsChange('password', e.target.value)} className="w-full px-4 py-3 border rounded-xl" /></div>
        </div>
      )
    } else if (locationType === 'custom_link') {
      return (
        <div><label className="block text-sm font-medium mb-2">Custom Virtual Link</label><input type="url" value={locationDetails.virtualLink || ''} onChange={(e) => handleLocationDetailsChange('virtualLink', e.target.value)} className="w-full px-4 py-3 border rounded-xl" /></div>
      )
    }
    return null
  }

  if (isLoading) return <LoadingSpinner fullScreen text="Loading event details..." />
  if (!event) return <div className="p-8 text-center">Event not found</div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="sticky top-0 z-10 bg-white border-b">
        <div className="container mx-auto px-4 py-4 max-w-3xl flex justify-between items-center">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600"><ArrowLeft className="h-5 w-5" /> Back</button>
          <h1 className="text-xl font-bold">Edit Event</h1>
          <div className="w-20"></div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Event Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Event Name</label>
            <input type="text" value={formData.eventName} onChange={e => setFormData(prev => ({ ...prev, eventName: e.target.value }))} maxLength={75} required className="w-full px-4 py-3 border rounded-xl text-lg" />
            <div className="mt-1 text-right text-sm text-gray-500">{formData.eventName.length}/75</div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={formData.startDate} onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))} required className="px-4 py-3 border rounded-xl" />
                <input type="time" value={formData.startTime} onChange={e => setFormData(prev => ({ ...prev, startTime: e.target.value }))} required className="px-4 py-3 border rounded-xl" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={formData.endDate} onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))} required className="px-4 py-3 border rounded-xl" />
                <input type="time" value={formData.endTime} onChange={e => setFormData(prev => ({ ...prev, endTime: e.target.value }))} required className="px-4 py-3 border rounded-xl" />
              </div>
            </div>
          </div>
          {dateError && <div className="text-red-500 text-sm">{dateError}</div>}

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select value={formData.category} onChange={handleCategoryChange} required className="w-full px-4 py-3 border rounded-xl">
              <option value="">Select category...</option>
              {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>)}
            </select>
            {showCustomCategory && (
              <input type="text" value={formData.customCategory} onChange={e => setFormData(prev => ({ ...prev, customCategory: e.target.value }))} placeholder="Custom category" className="mt-4 w-full px-4 py-3 border rounded-xl" />
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-2">Location Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {LOCATION_TYPES.map(loc => (
                <button key={loc.id} type="button" onClick={() => setLocationType(loc.id)} className={`p-4 rounded-xl border flex flex-col items-center gap-2 ${locationType === loc.id ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                  <loc.icon className="h-5 w-5" />
                  <div className="text-sm font-medium">{loc.label}</div>
                </button>
              ))}
            </div>
            <div className="p-6 border rounded-xl bg-white">{renderLocationInput()}</div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium mb-1">Location Preview</div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" /><span>{formatLocation()}</span></div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea value={formData.description} onChange={e => { setFormData(prev => ({ ...prev, description: e.target.value })); setCharCount(e.target.value.length) }} rows={8} required maxLength={5000} className="w-full px-4 py-3 border rounded-xl resize-none" />
            <div className="text-right text-sm text-gray-500">{charCount}/5000</div>
          </div>

          {/* Ticket Price */}
          <div>
            <label className="block text-sm font-medium mb-3">Ticket Price</label>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <label className={`block p-4 border-2 rounded-xl cursor-pointer ${formData.isFree ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                <input type="radio" name="priceType" checked={formData.isFree} onChange={() => handlePriceTypeChange(true)} className="hidden" />
                <div className="flex items-center gap-3"><div className="text-2xl">🎟️</div><div><div className="font-semibold">Free</div><div className="text-sm">₦0.00</div></div></div>
              </label>
              <label className={`block p-4 border-2 rounded-xl cursor-pointer ${!formData.isFree ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                <input type="radio" name="priceType" checked={!formData.isFree} onChange={() => handlePriceTypeChange(false)} className="hidden" />
                <div className="flex items-center gap-3"><div className="text-2xl">💰</div><div><div className="font-semibold">Paid</div><div className="text-sm">Enter amount</div></div></div>
              </label>
            </div>

            {!formData.isFree && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{CURRENCIES.find(c => c.value === formData.currency)?.symbol || '₦'}</span>
                    <input type="number" value={formData.priceAmount} onChange={e => setFormData(prev => ({ ...prev, priceAmount: e.target.value }))} step="100" min="0" className="w-full pl-10 pr-3 py-3 border rounded-xl" />
                  </div>
                  <select value={formData.currency} onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))} className="px-3 py-3 border rounded-xl">
                    {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Ticket Category</label>
                  <select value={formData.ticketType} onChange={e => setFormData(prev => ({ ...prev, ticketType: e.target.value }))} className="w-full px-4 py-3 border rounded-xl">
                    {TICKET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-sm font-medium mb-3">Capacity</label>
            <label className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer mb-4">
              <input type="checkbox" checked={formData.unlimitedCapacity} onChange={e => handleCapacityToggle(e.target.checked)} className="w-5 h-5" />
              <div className="text-xl font-bold">∞</div>
              <div><div className="font-semibold">Unlimited tickets</div><div className="text-sm text-gray-600">No capacity limit</div></div>
            </label>
            {!formData.unlimitedCapacity && (
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="number" value={formData.capacity} onChange={e => setFormData(prev => ({ ...prev, capacity: e.target.value }))} placeholder="Maximum tickets" min="1" required className="w-full pl-10 pr-3 py-3 border rounded-xl" />
              </div>
            )}
          </div>

          {/* Event Image */}
          <div>
            <label className="block text-sm font-medium mb-3">Event Image</label>
            <div className="border-2 border-dashed rounded-xl p-8 text-center">
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="max-w-md mx-auto h-64 object-cover rounded-lg" />
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview('') }} className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <>
                  <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="font-medium">Upload Event Image</p>
                  <p className="text-sm text-gray-500">PNG, JPG, GIF • Max 5MB</p>
                  <button type="button" onClick={() => document.getElementById('edit-image')?.click()} className="mt-4 px-6 py-2 bg-primary text-white rounded-lg">Choose Image</button>
                  <input id="edit-image" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-8">
            <button type="button" onClick={() => router.back()} className="flex-1 py-4 border-2 rounded-xl font-semibold" disabled={isSaving}>Cancel</button>
            <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-primary text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {isSaving ? <><Loader2 className="h-5 w-5 animate-spin" /> Saving...</> : <><Save className="h-5 w-5" /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}