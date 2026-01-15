//app/profile/page.tsx

'use client'

import { useState, useEffect, Suspense } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { User, Mail, MapPin, Calendar, Upload, Save, Globe, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ProfileData {
  fullName: string
  bio: string
  location: string
  country: string
  dateOfBirth: string
  interests: string[]
  profilePicture: string
}

// Error boundary component
function ProfileErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true)
      setError(event.error)
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Something went wrong</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Loading component
function ProfileLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <User className="h-8 w-8 text-primary animate-pulse" />
          </div>
        </div>
        <p className="text-text-light dark:text-dark-secondary">Loading profile...</p>
      </div>
    </div>
  )
}

function ProfileContent() {
  const { user, authenticated, ready } = usePrivy()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [profileData, setProfileData] = useState<ProfileData>({
    fullName: '',
    bio: '',
    location: '',
    country: '',
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
      
      // Get auth token from header
      const token = await getAuthToken()
      
      if (!token) {
        throw new Error('No authentication token found')
      }
      
      // Check user status
      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch profile')
      }

      const data = await response.json()
      
      // If user has wallet and profile complete, redirect to dashboard
      if (data.hasWallet && !data.needsProfileCompletion) {
        router.push('/dashboard')
        return
      }
      
      // Format date for input field
      let formattedDate = ''
      if (data.profile?.dateOfBirth) {
        const date = new Date(data.profile.dateOfBirth)
        formattedDate = date.toISOString().split('T')[0]
      }
      
      setProfileData({
        fullName: data.profile?.fullName || '',
        bio: data.profile?.bio || '',
        location: data.profile?.location || '',
        country: data.profile?.country || '',
        dateOfBirth: formattedDate,
        interests: data.profile?.interests || [],
        profilePicture: data.profile?.profilePicture || '',
      })
      
      setUserData(data.user)
      
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError(err instanceof Error ? err.message : 'Failed to load profile')
      toast.error('Failed to load profile data')
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to get auth token
  const getAuthToken = async (): Promise<string> => {
    // This is a simplified version. In production, get token from Privy context
    // or HttpOnly cookies set by your backend
    const token = localStorage.getItem('privy:auth_token')
    if (!token) {
      throw new Error('Please login again')
    }
    return token
  }

  const getUserIdentifier = () => {
    if (!user) return 'Guest'
    
    if (user.google?.name) return user.google.name
    if (user.twitter?.username) return `@${user.twitter.username}`
    if (user.email?.address) return user.email.address.split('@')[0]
    
    return 'User'
  }

  const getLoginMethodDisplay = () => {
    if (!user) return 'unknown'
    
    if (user.email?.address) return 'Email'
    if (user.google?.email) return 'Google'
    if (user.twitter?.username) return 'Twitter (X)'
    
    return 'Email'
  }

  const getLoginMethodIcon = () => {
    if (!user) return null
    
    if (user.email) return '📧'
    if (user.google) return 'G'
    if (user.twitter) return '𝕏'
    
    return '👤'
  }

  const handleInputChange = (field: keyof ProfileData, value: string) => {
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
    
    if (!profileData.fullName.trim()) {
      toast.error('Full name is required')
      return
    }

    if (!profileData.profilePicture) {
      toast.error('Profile picture is required')
      return
    }

    setIsSaving(true)
    try {
      const token = await getAuthToken()
      
      const response = await fetch('/api/auth/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          profile: profileData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save profile')
      }

      toast.success('Profile saved successfully!')
      
      // Redirect to dashboard after successful save
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
      
    } catch (err) {
      console.error('Error saving profile:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save profile. Please try again.'
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  if (!ready || isLoading) {
    return <ProfileLoading />
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
    <div className="min-h-screen bg-background dark:bg-dark-background">
      <div className="responsive-container py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Complete Your Profile</h1>
            <p className="text-text-light dark:text-dark-secondary">
              Welcome, {getUserIdentifier()}! Let's set up your profile to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
            {/* Profile Picture */}
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">Profile Picture *</h2>
              <p className="text-text-light dark:text-dark-secondary text-sm mb-4">
                Upload a clear photo of yourself
              </p>
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32 mb-4">
                  {profileData.profilePicture ? (
                    <img
                      src={profileData.profilePicture}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover border-4 border-surface dark:border-dark-surface"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-primary/10 dark:bg-dark-primary/10 flex items-center justify-center">
                      <User className="h-16 w-16 text-primary/50 dark:text-dark-primary/50" />
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  className="hidden"
                  id="profile-picture"
                  required
                />
                <label
                  htmlFor="profile-picture"
                  className="btn-outline flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="h-4 w-4" />
                  {profileData.profilePicture ? 'Change Photo' : 'Upload Photo'}
                </label>
                {!profileData.profilePicture && (
                  <p className="text-xs text-red-500 mt-2">Profile picture is required</p>
                )}
              </div>
            </div>

            {/* Personal Information */}
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">Personal Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-light dark:text-dark-secondary h-4 w-4" />
                    <input
                      type="text"
                      value={profileData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      required
                      className="input-field pl-10"
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
                    className="input-field"
                    placeholder="Tell us a bit about yourself..."
                    maxLength={500}
                    disabled={isSaving}
                  />
                  <p className="text-xs text-text-light dark:text-dark-secondary mt-1 text-right">
                    {profileData.bio.length}/500 characters
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      City
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-light dark:text-dark-secondary h-4 w-4" />
                      <input
                        type="text"
                        value={profileData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className="input-field pl-10"
                        placeholder="e.g., Lagos"
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Country
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-light dark:text-dark-secondary h-4 w-4" />
                      <input
                        type="text"
                        value={profileData.country}
                        onChange={(e) => handleInputChange('country', e.target.value)}
                        className="input-field pl-10"
                        placeholder="e.g., Nigeria"
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-light dark:text-dark-secondary h-4 w-4" />
                    <input
                      type="date"
                      value={profileData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      className="input-field pl-10"
                      max={new Date().toISOString().split('T')[0]}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Interests */}
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">Interests</h2>
              <p className="text-text-light dark:text-dark-secondary text-sm mb-4">
                Add interests to get personalized event recommendations
              </p>
              
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={tempInterest}
                  onChange={(e) => setTempInterest(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddInterest())}
                  className="input-field flex-1"
                  placeholder="E.g., Music, Sports, Technology, Art..."
                  maxLength={30}
                  disabled={isSaving}
                />
                <button
                  type="button"
                  onClick={handleAddInterest}
                  disabled={!tempInterest.trim() || isSaving}
                  className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>

              {/* Selected Interests */}
              <div className="flex flex-wrap gap-2 min-h-[48px]">
                {profileData.interests.map((interest) => (
                  <div
                    key={interest}
                    className="flex items-center gap-2 bg-primary/10 dark:bg-dark-primary/10 text-primary dark:text-dark-primary px-3 py-2 rounded-full"
                  >
                    <span className="text-sm">{interest}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveInterest(interest)}
                      className="hover:text-primary-dark dark:hover:text-dark-primary-dark text-lg disabled:opacity-50"
                      aria-label={`Remove ${interest}`}
                      disabled={isSaving}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {profileData.interests.length === 0 && (
                  <p className="text-text-light dark:text-dark-secondary text-sm italic">
                    No interests added yet
                  </p>
                )}
              </div>
            </div>

            {/* Account Information */}
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">Account Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-text-light dark:text-dark-secondary">
                    Login Method
                  </label>
                  <div className="flex items-center gap-3 p-3 bg-background dark:bg-dark-background rounded-lg">
                    <span className="text-xl">{getLoginMethodIcon()}</span>
                    <span className="font-medium">{getLoginMethodDisplay()}</span>
                  </div>
                </div>

                {user?.email?.address && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-text-light dark:text-dark-secondary">
                      Email Address
                    </label>
                    <div className="flex items-center gap-3 p-3 bg-background dark:bg-dark-background rounded-lg">
                      <Mail className="h-4 w-4 text-text-light dark:text-dark-secondary" />
                      <span>{user.email.address}</span>
                    </div>
                  </div>
                )}

                {userData?.walletAddress && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-text-light dark:text-dark-secondary">
                      Wallet Address
                    </label>
                    <div className="p-3 bg-background dark:bg-dark-background rounded-lg">
                      <code className="text-sm font-mono break-all">
                        {userData.walletAddress}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="flex-1 py-3 border border-gray-200 dark:border-gray-300 text-text dark:text-dark-text rounded-xl hover:bg-background dark:hover:bg-dark-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSaving}
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={isSaving || !profileData.fullName.trim() || !profileData.profilePicture}
                className="flex-1 py-3 bg-primary text-white dark:bg-dark-primary dark:text-white rounded-xl font-bold hover:bg-primary-dark dark:hover:bg-dark-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Complete Profile
                  </>
                )}
              </button>
            </div>
            
            <p className="text-xs text-text-light dark:text-dark-secondary text-center pt-2">
              * Required fields
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <ProfileErrorBoundary>
      <Suspense fallback={<ProfileLoading />}>
        <ProfileContent />
      </Suspense>
    </ProfileErrorBoundary>
  )
}