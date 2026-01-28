// /app/profile/page.tsx - UPDATED for profile updates
'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { 
  User, Mail, MapPin, Calendar, Upload, Save, Globe, 
  Loader2, AlertCircle, Camera, Hash, Briefcase, Heart
} from 'lucide-react'
import { toast } from 'sonner'

interface ProfileData {
  fullName: string
  bio: string
  location: string
  dateOfBirth: string
  interests: string[]
  profilePicture: string
}

export default function ProfilePage() {
  const { user, authenticated, ready } = usePrivy()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [profileData, setProfileData] = useState<ProfileData>({
    fullName: '',
    bio: '',
    location: '',
    dateOfBirth: '',
    interests: [],
    profilePicture: '',
  })
  const [tempInterest, setTempInterest] = useState('')
  const [userData, setUserData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

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
      
      // Get auth token
      const token = await getAuthToken()
      
      if (!token) {
        throw new Error('No authentication token found')
      }
      
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch profile')
      }

      const data = await response.json()
      
      // Set user data
      setUserData(data.user)
      
      // Set profile data (if exists)
      if (data.detailedProfile) {
        setProfileData({
          fullName: data.detailedProfile.fullName || '',
          bio: data.detailedProfile.bio || '',
          location: data.detailedProfile.location || '',
          dateOfBirth: data.detailedProfile.dateOfBirth ? 
            new Date(data.detailedProfile.dateOfBirth).toISOString().split('T')[0] : '',
          interests: data.detailedProfile.interests || [],
          profilePicture: data.detailedProfile.profilePicture || '',
        })
      }
      
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to load profile')
      toast.error('Failed to load profile data')
    } finally {
      setIsLoading(false)
    }
  }

  const getAuthToken = async (): Promise<string> => {
    // Get token from localStorage
    const token = localStorage.getItem('privy:auth_token') || 
                  localStorage.getItem('privy-token')
    if (!token) {
      throw new Error('Please login again')
    }
    return token
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

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    try {
      // Convert to base64 for preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileData(prev => ({
          ...prev,
          profilePicture: reader.result as string
        }))
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('Error uploading image:', err)
      toast.error('Failed to upload image')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsSaving(true)
    try {
      const token = await getAuthToken()
      
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save profile')
      }

      toast.success('Profile updated successfully!')
      
      // Go back to dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
      
    } catch (err) {
      console.error('Error saving profile:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save profile'
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  if (!ready || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Error Loading Profile</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchProfileData}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
          >
            ← Back to Dashboard
          </button>
          
          <h1 className="text-3xl font-bold mb-2">Update Your Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Add more details to personalize your experience
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Profile Picture</h2>
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32 mb-4">
                {profileData.profilePicture ? (
                  <img
                    src={profileData.profilePicture}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover border-4 border-primary"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="h-16 w-16 text-primary/50" />
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePictureUpload}
                className="hidden"
                id="profile-picture"
              />
              <label
                htmlFor="profile-picture"
                className="btn-outline flex items-center gap-2 cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                {profileData.profilePicture ? 'Change Photo' : 'Upload Photo'}
              </label>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Personal Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    value={profileData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter your full name"
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Bio
                </label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Tell us a bit about yourself..."
                  maxLength={500}
                  disabled={isSaving}
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {profileData.bio.length}/500 characters
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      value={profileData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="City, State"
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="date"
                      value={profileData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary"
                      max={new Date().toISOString().split('T')[0]}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interests */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Interests</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              Add your interests to get personalized event recommendations
            </p>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={tempInterest}
                onChange={(e) => setTempInterest(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInterest())}
                className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="E.g., Music, Sports, Technology, Art..."
                maxLength={30}
                disabled={isSaving}
              />
              <button
                type="button"
                onClick={handleAddInterest}
                disabled={!tempInterest.trim() || isSaving}
                className="px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>

            {/* Selected Interests */}
            <div className="flex flex-wrap gap-2 min-h-[48px]">
              {profileData.interests.map((interest) => (
                <div
                  key={interest}
                  className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-2 rounded-full"
                >
                  <Heart className="h-3 w-3" />
                  <span className="text-sm">{interest}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveInterest(interest)}
                    className="hover:text-primary-dark text-lg"
                    aria-label={`Remove ${interest}`}
                    disabled={isSaving}
                  >
                    ×
                  </button>
                </div>
              ))}
              {profileData.interests.length === 0 && (
                <p className="text-gray-500 text-sm italic">
                  No interests added yet
                </p>
              )}
            </div>
          </div>

          {/* Account Info Display */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Account Information</h2>
            <div className="space-y-4">
              {userData?.email && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <Mail className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                    <p className="font-medium">{userData.email}</p>
                  </div>
                </div>
              )}

              {userData?.walletAddress && (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase className="h-5 w-5 text-gray-500" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Embedded Wallet</p>
                  </div>
                  <code className="text-sm font-mono break-all">
                    {userData.walletAddress}
                  </code>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <Globe className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Country</p>
                  <p className="font-medium">{userData?.country || 'Not set'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <Hash className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Organizer Status</p>
                  <p className="font-medium">
                    {userData?.isOrganizer ? 'Event Organizer' : 'Attendee'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="flex-1 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}