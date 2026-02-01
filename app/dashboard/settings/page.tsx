// app/dashboard/settings/page.tsx - FIXED VERSION
'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { 
  User, Bell, Shield, Globe, Moon, Sun, 
  LogOut, Save, Key, Smartphone, Mail, Lock,
  Camera, Edit2, Check, X, Loader2, Wallet
} from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from 'sonner'

interface UserProfile {
  _id: string
  email: string
  firstName: string
  lastName: string
  walletAddress: string
  username: string
  phoneNumber: string
  country: string
  profilePicture?: string
  isOrganizer: boolean
  isProfileComplete: boolean
  createdAt: string
  updatedAt: string
}

interface UserSettings {
  darkMode: boolean
  notifications: {
    email: boolean
    push: boolean
    ticketUpdates: boolean
    eventReminders: boolean
    promotional: boolean
  }
  security: {
    twoFactorAuth: boolean
    biometricLogin: boolean
    sessionTimeout: string
  }
  emailUpdates: boolean
  marketingEmails: boolean
}

// Helper function to extract wallet address from Privy user (similar to other pages)
function getWalletAddressFromUser(user: any): string | null {
  if (!user) return null
  
  console.log('🔍 Extracting wallet from Privy user:', {
    userId: user.id,
    hasDirectWallet: !!user.wallet,
    walletAddress: user.wallet?.address,
    linkedAccountsCount: user.linkedAccounts?.length || 0,
  })
  
  // Method 1: Check direct wallet object (for embedded wallets)
  if (user.wallet?.address && typeof user.wallet.address === 'string') {
    console.log('✅ Found direct wallet address:', user.wallet.address)
    return user.wallet.address
  }
  
  // Method 2: Check linked accounts for wallet types
  const linkedAccounts = user.linkedAccounts || []
  
  // Look for wallet accounts in linked accounts
  for (const account of linkedAccounts) {
    if (account.type === 'wallet' || account.type === 'smart_wallet') {
      if (account.address && typeof account.address === 'string') {
        console.log('✅ Found wallet in linked accounts:', account.address)
        return account.address
      }
    }
  }
  
  console.log('❌ No wallet found in user object')
  return null
}

export default function SettingsPage() {
  const { user: privyUser, authenticated, ready, logout } = usePrivy()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [settings, setSettings] = useState<UserSettings>({
    darkMode: false,
    notifications: {
      email: true,
      push: true,
      ticketUpdates: true,
      eventReminders: true,
      promotional: false,
    },
    security: {
      twoFactorAuth: false,
      biometricLogin: false,
      sessionTimeout: '30',
    },
    emailUpdates: true,
    marketingEmails: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    country: '',
    username: '',
  })
  const [profilePicture, setProfilePicture] = useState<string>('')
  const [isUploadingPicture, setIsUploadingPicture] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)

  // Extract wallet address when user is authenticated
  useEffect(() => {
    if (ready && authenticated && privyUser) {
      const address = getWalletAddressFromUser(privyUser)
      setWalletAddress(address)
    }
  }, [ready, authenticated, privyUser])

  // Fetch user profile from database when wallet address is available
  useEffect(() => {
    if (walletAddress) {
      fetchUserProfile()
    } else if (ready && authenticated) {
      // User is authenticated but no wallet found
      setIsLoading(false)
    }
  }, [walletAddress, ready, authenticated])

  const fetchUserProfile = async () => {
    if (!walletAddress) return
    
    try {
      const response = await fetch(`/api/user/profile?walletAddress=${walletAddress}`)
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.user) {
          setUserProfile(data.user)
          
          // Populate profile form
          setProfileForm({
            firstName: data.user.firstName || '',
            lastName: data.user.lastName || '',
            phoneNumber: data.user.phoneNumber || '',
            country: data.user.country || '',
            username: data.user.username || '',
          })
          
          // Set profile picture if available
          if (data.detailedProfile?.profilePicture) {
            setProfilePicture(data.detailedProfile.profilePicture)
          }
          
          // Try to load user settings from localStorage or default
          const savedSettings = localStorage.getItem(`user_settings_${data.user._id}`)
          if (savedSettings) {
            setSettings(JSON.parse(savedSettings))
          }
        } else {
          console.error('Failed to fetch user profile:', data.error)
        }
      } else {
        console.error('Failed to fetch user profile:', response.status)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      // Save to localStorage
      if (userProfile) {
        localStorage.setItem(`user_settings_${userProfile._id}`, JSON.stringify(settings))
      }
      
      // In a production app, you would save to the database
      // const response = await fetch('/api/user/settings', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ settings, userId: userProfile?._id })
      // })
      
      await new Promise(resolve => setTimeout(resolve, 800)) // Simulate API call
      
      toast.success('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setIsUploadingPicture(true)

    try {
      // Upload to Pinata/IPFS
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

      // Update user profile with new picture
      const profileResponse = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: walletAddress,
          profilePicture: result.gatewayUrl,
        })
      })

      const profileData = await profileResponse.json()

      if (profileData.success) {
        setProfilePicture(result.gatewayUrl)
        toast.success('Profile picture updated!')
      } else {
        throw new Error(profileData.error || 'Failed to update profile')
      }

    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload profile picture')
    } finally {
      setIsUploadingPicture(false)
    }
  }

  const handleProfileUpdate = async () => {
    if (!walletAddress) return

    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: walletAddress,
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          phoneNumber: profileForm.phoneNumber,
          country: profileForm.country,
          username: profileForm.username,
        })
      })

      const data = await response.json()

      if (data.success) {
        setUserProfile(data.user)
        setIsEditingProfile(false)
        toast.success('Profile updated successfully!')
      } else {
        throw new Error(data.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error('Failed to update profile')
    }
  }

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await logout()
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    } catch (error) {
      return 'Invalid date'
    }
  }

  // Get user display name
  const getUserDisplayName = () => {
    if (userProfile?.firstName && userProfile?.lastName) {
      return `${userProfile.firstName} ${userProfile.lastName}`
    }
    if (userProfile?.username) {
      return userProfile.username
    }
    if (privyUser?.email?.address) {
      return privyUser.email.address.split('@')[0]
    }
    return 'User'
  }

  // Get user email
  const getUserEmail = () => {
    return userProfile?.email || privyUser?.email?.address || 'No email provided'
  }

  if (!ready) return <LoadingSpinner fullScreen />
  
  if (!authenticated) return (
    <div className="min-h-screen bg-gradient-background flex items-center justify-center">
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold mb-4">Please sign in</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Sign in to view settings
        </p>
      </div>
    </div>
  )

  // Handle no wallet address case (similar to other dashboard pages)
  if (!walletAddress && ready && authenticated) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <Wallet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Wallet Connected</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We couldn't find a connected wallet address. Please ensure your wallet is connected via Privy.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary px-6 py-3"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <LoadingSpinner text="Loading settings..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account preferences and security
          </p>
        </div>

        {/* Profile Section */}
        <div className="card rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-6">
            {/* Profile Picture */}
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                {profilePicture ? (
                  <img 
                    src={profilePicture} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-12 w-12 text-primary" />
                )}
              </div>
              
              <label className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  className="hidden"
                  disabled={isUploadingPicture}
                />
                {isUploadingPicture ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </label>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              {isEditingProfile ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">First Name</label>
                      <input
                        type="text"
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Last Name</label>
                      <input
                        type="text"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        placeholder="Last name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Username</label>
                      <input
                        type="text"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, username: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        placeholder="Username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={profileForm.phoneNumber}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        placeholder="Phone number"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Country</label>
                      <input
                        type="text"
                        value={profileForm.country}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        placeholder="Country"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleProfileUpdate}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Save Changes
                    </button>
                    <button
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-bold mb-2">{getUserDisplayName()}</h3>
                  <div className="space-y-2 mb-4">
                    <p className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Mail className="h-4 w-4" />
                      {getUserEmail()}
                    </p>
                    {walletAddress && (
                      <p className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg inline-block">
                        {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                      </p>
                    )}
                    {userProfile?.phoneNumber && (
                      <p className="text-gray-600 dark:text-gray-400">
                        Phone: {userProfile.phoneNumber}
                      </p>
                    )}
                    {userProfile?.country && (
                      <p className="text-gray-600 dark:text-gray-400">
                        Country: {userProfile.country}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit Profile
                    </button>
                    
                    {userProfile?.isOrganizer && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-sm font-medium">
                        Event Organizer
                      </span>
                    )}
                    
                    {userProfile?.createdAt && (
                      <p className="text-sm text-gray-500 mt-2">
                        Member since {formatDate(userProfile.createdAt)}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Appearance */}
          <div className="card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                {settings.darkMode ? (
                  <Moon className="h-5 w-5 text-primary" />
                ) : (
                  <Sun className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold">Appearance</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Customize how CACK-pass looks
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Switch between light and dark themes
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.darkMode}
                  onChange={(e) => setSettings({
                    ...settings,
                    darkMode: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          {/* Notifications */}
          <div className="card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Bell className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Notifications</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Control when and how we contact you
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              {Object.entries(settings.notifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {key === 'email' && 'Receive email notifications'}
                      {key === 'push' && 'Get push notifications on your device'}
                      {key === 'ticketUpdates' && 'Updates about your ticket purchases'}
                      {key === 'eventReminders' && 'Reminders for upcoming events'}
                      {key === 'promotional' && 'Special offers and promotions'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          [key]: e.target.checked
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Security */}
          <div className="card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Shield className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Security</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage your account security settings
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Add an extra layer of security
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.security.twoFactorAuth}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        twoFactorAuth: e.target.checked
                      }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Biometric Login</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Use fingerprint or face recognition
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.security.biometricLogin}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        biometricLogin: e.target.checked
                      }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="font-medium">Session Timeout</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Auto logout after inactivity
                      </p>
                    </div>
                  </div>
                  <select
                    value={settings.security.sessionTimeout}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        sessionTimeout: e.target.value
                      }
                    })}
                    className="px-3 py-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600"
                  >
                    <option value="5">5 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="0">Never</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Email Preferences */}
          <div className="card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Mail className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Email Preferences</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Control your email preferences
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Updates</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive updates about your account and tickets
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emailUpdates}
                    onChange={(e) => setSettings({
                      ...settings,
                      emailUpdates: e.target.checked
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Marketing Emails</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive promotional emails and offers
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.marketingEmails}
                    onChange={(e) => setSettings({
                      ...settings,
                      marketingEmails: e.target.checked
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Globe className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Account Actions</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage your account preferences
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <button className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <p className="font-medium">Privacy Policy</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Read our privacy policy
                </p>
              </button>
              
              <button className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <p className="font-medium">Terms of Service</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Review terms and conditions
                </p>
              </button>
              
              <button className="w-full p-4 border border-red-200 dark:border-red-800 rounded-xl text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400">
                <p className="font-medium">Delete Account</p>
                <p className="text-sm opacity-75">
                  Permanently delete your account and data
                </p>
              </button>
            </div>
          </div>

          {/* Save & Logout */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            
            <button
              onClick={handleLogout}
              className="flex-1 py-3 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2"
            >
              <LogOut className="h-5 w-5" />
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}