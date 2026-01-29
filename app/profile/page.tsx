// /app/profile/page.tsx - UPDATED with interests moved to left column
'use client'

import { useState, useEffect, useRef } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { 
  User, Mail, MapPin, Calendar, Upload, Save, Globe, 
  Loader2, AlertCircle, Camera, Hash, Briefcase, Heart,
  X, Building, Users, Shield, Check, Crown, UserCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface ProfileData {
  firstName: string
  lastName: string
  bio: string
  location: string
  dateOfBirth: string
  interests: string[]
  profilePicture: string
  username?: string
}

export default function ProfilePage() {
  const { user, authenticated, ready } = usePrivy()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    bio: '',
    location: '',
    dateOfBirth: '',
    interests: [],
    profilePicture: '',
  })
  const [tempInterest, setTempInterest] = useState('')
  const [userData, setUserData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const getWalletAddress = () => {
    if (!user) return null
    
    if (user.wallet?.address) {
      return user.wallet.address
    }
    
    if (user.linkedAccounts && Array.isArray(user.linkedAccounts)) {
      for (const account of user.linkedAccounts) {
        if ((account.type === 'wallet' || account.type === 'smart_wallet') && 
            'address' in account && typeof (account as any).address === 'string') {
          return (account as any).address
        }
      }
    }
    
    if (userData?.walletAddress) {
      return userData.walletAddress
    }
    
    return null
  }

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/')
    } else if (ready && authenticated) {
      fetchProfileData()
    }
  }, [ready, authenticated, router])

  const fetchProfileData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const walletAddress = getWalletAddress()
      if (!walletAddress) {
        throw new Error('No wallet address found.')
      }
      
      const response = await fetch(`/api/auth/user?walletAddress=${walletAddress}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch profile')
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch profile')
      }
      
      setUserData(data.user)
      
      const existingFirstName = data.user.firstName || ''
      const existingLastName = data.user.lastName || ''
      
      let existingProfileData: any = {}
      if (data.detailedProfile) {
        existingProfileData = data.detailedProfile
      }
      
      const profile = {
        firstName: existingProfileData.firstName || existingFirstName || '',
        lastName: existingProfileData.lastName || existingLastName || '',
        bio: existingProfileData.bio || '',
        location: existingProfileData.location || '',
        dateOfBirth: existingProfileData.dateOfBirth ? 
          new Date(existingProfileData.dateOfBirth).toISOString().split('T')[0] : '',
        interests: existingProfileData.interests || [],
        profilePicture: existingProfileData.profilePicture || '',
        username: data.user.username || ''
      }
      
      setProfileData(profile)
      
      if (profile.profilePicture) {
        setImagePreview(profile.profilePicture)
      }
      
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to load profile')
      toast.error('Failed to load profile data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof ProfileData, value: string | string[]) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAddInterest = () => {
    if (tempInterest.trim() && !profileData.interests.includes(tempInterest.trim())) {
      setProfileData(prev => ({
        ...prev,
        interests: [...prev.interests, tempInterest.trim()]
      }))
      setTempInterest('')
    }
  }

  const handleRemoveInterest = (interest: string) => {
    setProfileData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }))
  }

  const toggleOrganizerStatus = async () => {
    if (userData?.isOrganizer) {
      toast.info('Organizer status cannot be disabled. Contact support if needed.')
      return
    }

    try {
      setIsSaving(true)
      const walletAddress = getWalletAddress()
      if (!walletAddress) {
        throw new Error('No wallet address found')
      }
      
      const response = await fetch(`/api/auth/user?walletAddress=${walletAddress}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...profileData,
          isOrganizer: true,
          email: userData?.email || '',
          country: userData?.country || '',
          phoneNumber: userData?.phoneNumber || '',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update organizer status')
      }

      setUserData(data.user)
      toast.success('🎉 You are now an event organizer!')
      
    } catch (err) {
      console.error('Error updating organizer status:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setIsSaving(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPEG, PNG, etc.)')
      return
    }

    setIsUploadingImage(true)

    try {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setImagePreview(base64String)
        setProfileData(prev => ({
          ...prev,
          profilePicture: base64String
        }))
        toast.success('Profile picture updated!')
      }
      reader.onerror = () => {
        throw new Error('Failed to read image file')
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('Error uploading image:', err)
      toast.error('Failed to upload image')
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeProfilePicture = () => {
    setImagePreview(null)
    setProfileData(prev => ({
      ...prev,
      profilePicture: ''
    }))
    toast.info('Profile picture removed')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsSaving(true)
    try {
      const walletAddress = getWalletAddress()
      if (!walletAddress) {
        throw new Error('No wallet address found')
      }
      
      const submissionData = {
        firstName: profileData.firstName.trim(),
        lastName: profileData.lastName.trim(),
        bio: profileData.bio.trim(),
        location: profileData.location.trim(),
        dateOfBirth: profileData.dateOfBirth,
        interests: profileData.interests,
        profilePicture: profileData.profilePicture,
        email: userData?.email || '',
        country: userData?.country || '',
        phoneNumber: userData?.phoneNumber || '',
        isOrganizer: userData?.isOrganizer || false,
        username: profileData.username || userData?.username || ''
      }
      
      const response = await fetch(`/api/auth/user?walletAddress=${walletAddress}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save profile')
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to save profile')
      }

      toast.success('Profile updated successfully!')
      
      setUserData(data.user)
      
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
      
    } catch (err) {
      console.error('Error saving profile:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save profile'
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const fullName = `${profileData.firstName} ${profileData.lastName}`.trim()

  if (!ready || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="relative">
            <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <User className="h-8 w-8 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2 text-gray-800 dark:text-gray-200">Error Loading Profile</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchProfileData}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors group"
          >
            <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Update Your Profile</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Personalize your experience and manage your account
              </p>
            </div>
            
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium ${userData?.isOrganizer ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}`}>
              {userData?.isOrganizer ? (
                <>
                  <Crown className="h-4 w-4" />
                  <span>Event Organizer</span>
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  <span>Event Attendee</span>
                </>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEFT COLUMN - Profile, Personal Info, and Interests */}
            <div className="space-y-8">
              {/* Profile Picture Section */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  Profile Picture
                </h2>
                
                <div className="flex flex-col items-center">
                  {/* Circular Profile Image */}
                  <div className="relative mb-6">
                    <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-lg group">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Profile"
                          className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <div className="relative w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-16 w-16 text-primary/50" />
                          </div>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="h-10 w-10 text-white" />
                      </div>
                    </div>

                    {imagePreview && (
                      <button
                        type="button"
                        onClick={removeProfilePicture}
                        className="absolute -top-2 -right-2 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg z-10"
                        aria-label="Remove profile picture"
                        disabled={isUploadingImage}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="w-full max-w-xs">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureUpload}
                      className="hidden"
                      id="profile-picture-upload"
                      disabled={isUploadingImage}
                    />

                    <button
                      type="button"
                      onClick={triggerFileInput}
                      disabled={isUploadingImage}
                      className="w-full py-3 px-4 bg-primary/10 text-primary rounded-xl font-medium hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
                    >
                      {isUploadingImage ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          {imagePreview ? 'Change Photo' : 'Upload Photo'}
                        </>
                      )}
                    </button>

                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 text-center">
                      <p>JPG, PNG, or WebP format</p>
                      <p>Maximum 5MB</p>
                      <p>Square images work best</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interests - MOVED TO LEFT COLUMN */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Interests
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-5">
                  Add your interests to get personalized event recommendations
                </p>
                
                <div className="flex gap-2 mb-5">
                  <input
                    type="text"
                    value={tempInterest}
                    onChange={(e) => setTempInterest(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInterest())}
                    className="flex-1 px-4 py-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="E.g., Music, Sports, Technology, Art..."
                    maxLength={30}
                    disabled={isSaving}
                  />
                  <button
                    type="button"
                    onClick={handleAddInterest}
                    disabled={!tempInterest.trim() || isSaving}
                    className="px-5 py-3.5 bg-primary text-white rounded-xl hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Add
                  </button>
                </div>

                {/* Selected Interests */}
                <div className="flex flex-wrap gap-2 min-h-[48px]">
                  {profileData.interests.map((interest) => (
                    <div
                      key={interest}
                      className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2.5 rounded-full group"
                    >
                      <Heart className="h-3.5 w-3.5" />
                      <span className="text-sm font-medium">{interest}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveInterest(interest)}
                        className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors ml-1"
                        aria-label={`Remove ${interest}`}
                        disabled={isSaving}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {profileData.interests.length === 0 && (
                    <div className="text-center w-full py-4">
                      <p className="text-gray-500 text-sm italic">
                        No interests added yet. Add some to discover relevant events!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Information */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">
                  Personal Information
                </h2>
                
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                        First Name <span className="text-gray-500 text-xs">(from database)</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type="text"
                          value={profileData.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          placeholder={userData?.firstName || "Enter first name"}
                          disabled={isSaving}
                        />
                      </div>
                      {userData?.firstName && (
                        <p className="text-xs text-gray-500 mt-1">
                          Currently: <span className="font-medium">{userData.firstName}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                        Last Name <span className="text-gray-500 text-xs">(from database)</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type="text"
                          value={profileData.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          placeholder={userData?.lastName || "Enter last name"}
                          disabled={isSaving}
                        />
                      </div>
                      {userData?.lastName && (
                        <p className="text-xs text-gray-500 mt-1">
                          Currently: <span className="font-medium">{userData.lastName}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                      Bio <span className="text-gray-500 text-xs">({profileData.bio.length}/500)</span>
                    </label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none transition-all"
                      placeholder="Tell us a bit about yourself..."
                      maxLength={500}
                      disabled={isSaving}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-gray-500">
                        Brief description about yourself
                      </p>
                      <p className="text-xs text-gray-500">
                        {profileData.bio.length}/500 characters
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5">
                    <div>
                      <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                        Location <span className="text-gray-500 text-xs">(from database)</span>
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type="text"
                          value={profileData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          placeholder="City, State"
                          disabled={isSaving}
                        />
                      </div>
                      {userData?.location && (
                        <p className="text-xs text-gray-500 mt-1">
                          Currently: <span className="font-medium">{userData.location}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                        Date of Birth
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type="date"
                          value={profileData.dateOfBirth}
                          onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                          className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          max={new Date().toISOString().split('T')[0]}
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - Account Info, Organizer Status, and Profile Summary */}
            <div className="space-y-8">
              {/* Current Profile Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-primary" />
                  Current Profile Summary
                </h2>
                
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Full Name</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {fullName || 'Not set'}
                    </p>
                    {fullName && (
                      <p className="text-xs text-gray-500 mt-1">
                        First: <span className="font-medium">{profileData.firstName}</span>, 
                        Last: <span className="font-medium">{profileData.lastName}</span>
                      </p>
                    )}
                  </div>

                  {profileData.username && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Username</p>
                      <p className="font-medium text-gray-900 dark:text-white">{profileData.username}</p>
                    </div>
                  )}

                  {profileData.bio && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Bio Preview</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                        {profileData.bio}
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Interests</p>
                    <div className="flex flex-wrap gap-1">
                      {profileData.interests.length > 0 ? (
                        profileData.interests.map((interest, index) => (
                          <span key={index} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                            {interest}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 italic">No interests added yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Organizer Status Card */}
              <div className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm ${userData?.isOrganizer ? 'opacity-90' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Building className="h-5 w-5 text-primary" />
                      Event Organizer Status
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {userData?.isOrganizer 
                        ? 'You can create and manage events'
                        : 'Upgrade to create and manage your own events'}
                    </p>
                  </div>
                  {userData?.isOrganizer && (
                    <Shield className="h-6 w-6 text-green-500" />
                  )}
                </div>

                <div className={`p-4 rounded-xl border ${userData?.isOrganizer ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {userData?.isOrganizer ? 'Active Organizer' : 'Become an Organizer'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {userData?.isOrganizer ? 'Full access granted' : 'Request organizer access'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleOrganizerStatus}
                      disabled={userData?.isOrganizer || isSaving}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${userData?.isOrganizer 
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-default' 
                        : 'bg-primary text-white hover:bg-primary-dark'}`}
                    >
                      {userData?.isOrganizer ? (
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4" />
                          Active
                        </div>
                      ) : (
                        'Enable'
                      )}
                    </button>
                  </div>
                  
                  <ul className="space-y-2 text-sm">
                    {userData?.isOrganizer ? (
                      <>
                        <li className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <Check className="h-4 w-4" />
                          Create unlimited events
                        </li>
                        <li className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <Check className="h-4 w-4" />
                          Manage attendees and tickets
                        </li>
                        <li className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <Check className="h-4 w-4" />
                          Access analytics dashboard
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <div className="w-4 h-4 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
                            <span className="text-xs">1</span>
                          </div>
                          Create and manage events
                        </li>
                        <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <div className="w-4 h-4 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
                            <span className="text-xs">2</span>
                          </div>
                          Sell tickets and manage payments
                        </li>
                        <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <div className="w-4 h-4 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
                            <span className="text-xs">3</span>
                          </div>
                          Access event analytics
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                {!userData?.isOrganizer && (
                  <p className="text-xs text-gray-500 mt-4">
                    Note: Once enabled, organizer status cannot be disabled. Contact support for assistance.
                  </p>
                )}
              </div>

              {/* Account Information */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">Account Information</h2>
                <div className="space-y-4">
                  {userData?.email && (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                        <p className="font-medium text-gray-900 dark:text-white">{userData.email}</p>
                      </div>
                    </div>
                  )}

                  {userData?.walletAddress && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Briefcase className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Wallet Address</p>
                        </div>
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                        <code className="text-xs font-mono break-all text-gray-700 dark:text-gray-300">
                          {userData.walletAddress}
                        </code>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Country</p>
                      <p className="font-medium text-gray-900 dark:text-white">{userData?.country || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Hash className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Phone Number</p>
                      <p className="font-medium text-gray-900 dark:text-white">{userData?.phoneNumber || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Login Method</p>
                      <p className="font-medium text-gray-900 dark:text-white capitalize">
                        {userData?.loginMethod || 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="sticky bottom-6 bg-gradient-to-t from-gray-50 dark:from-gray-900 via-gray-50/80 dark:via-gray-900/80 to-transparent pt-6 pb-2 -mx-4 px-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Ready to update your profile?
                  </p>
                  <p className="text-xs text-gray-500">
                    Your changes will be saved to the database
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-8 py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary/25"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        Save Profile
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}