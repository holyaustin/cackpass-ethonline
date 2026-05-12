// /components/auth/ProfileModal.tsx - COMPLETE FIXED VERSION
'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { X, Building, Globe, Phone, Save, Loader2, Wallet, Mail, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { PhoneInput } from '@/components/auth/OptimizedPhoneInput'
import 'react-phone-number-input/style.css'

const COUNTRIES = [
  { value: 'NG', label: 'Nigeria' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'KE', label: 'Kenya' },
  { value: 'GH', label: 'Ghana' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'IN', label: 'India' },
  { value: 'AU', label: 'Australia' },
]

// Helper function to extract wallet address from Privy user (from dashboard)
function getWalletAddressFromUser(user: any): string | null {
  if (!user) return null
  
  // Check direct wallet object (for embedded wallets)
  if (user.wallet?.address && typeof user.wallet.address === 'string') {
    return user.wallet.address
  }
  
  // Check linked accounts
  const linkedAccounts = user.linkedAccounts || []
  
  // Look for embedded wallet in linked accounts
  const embeddedWallet = linkedAccounts.find(
    (acc: any) => acc.type === 'wallet' && acc.walletClientType === 'privy'
  )
  
  if (embeddedWallet?.address) {
    return embeddedWallet.address
  }
  
  // Try to find any wallet address
  for (const account of linkedAccounts) {
    if (account.type === 'wallet' && account.address) {
      return account.address
    }
  }
  
  return null
}

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  initialEmail?: string
  needsEmail?: boolean
  // 🟢 FIX: Added props to prevent closing
  preventClose?: boolean
  hideCloseButton?: boolean
}

export function ProfileModal({ 
  isOpen, 
  onClose, 
  onComplete, 
  initialEmail, 
  needsEmail,
  // 🟢 FIX: Default to TRUE to force profile completion
  preventClose = true,  // Changed from false to true
  hideCloseButton = true // Changed from false to true
}: ProfileModalProps) {
  const { user, authenticated, ready } = usePrivy()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    isOrganizer: false,
    country: '',
    phoneNumber: '',
    email: initialEmail || '',
  })
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [walletAddress, setWalletAddress] = useState<string | null>(null)

  // Extract wallet address when user is available
  useEffect(() => {
    if (user) {
      const address = getWalletAddressFromUser(user)
      setWalletAddress(address)
      console.log('🔍 Wallet address extracted from Privy:', address)
    }
  }, [user])

  useEffect(() => {
    if (isOpen) {
      // Pre-fill email from Privy if available
      setFormData({
        isOrganizer: false,
        country: '',
        phoneNumber: '',
        email: initialEmail || '',
      })
      setValidationErrors({})
    }
  }, [isOpen, initialEmail])

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.country.trim()) {
      errors.country = 'Country is required'
    }

    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required'
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.phoneNumber.replace(/\D/g, ''))) {
      errors.phoneNumber = 'Invalid phone number format'
    }

    // Validate email only when needed (when Privy doesn't have it)
    if (needsEmail) {
      if (!formData.email.trim()) {
        errors.email = 'Email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Invalid email format'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setIsSubmitting(true)
    
    try {
      // Get wallet address from Privy user
      if (!walletAddress) {
        toast.error('Wallet address not found. Please reconnect your wallet.')
        return
      }
      
      console.log('📝 Submitting profile data:', {
        walletAddress,
        hasEmail: !!formData.email,
        email: formData.email,
        country: formData.country,
        phone: formData.phoneNumber,
        isOrganizer: formData.isOrganizer
      })
      
      // Submit to API
      const response = await fetch(`/api/auth/user?walletAddress=${walletAddress}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isOrganizer: formData.isOrganizer,
          country: formData.country,
          phoneNumber: formData.phoneNumber,
          email: formData.email.trim(), // Always send email
        }),
      })

      const data = await response.json()

      if (data.success) {
        console.log('✅ Profile created successfully:', data)
        toast.success('Profile created successfully!')
        onComplete()
      } else {
        console.error('❌ Profile creation failed:', data)
        toast.error(data.error || 'Failed to save profile')
      }
      
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handlePhoneChange = (value: string | undefined) => {
    setFormData(prev => ({
      ...prev,
      phoneNumber: value || ''
    }))
    
    if (validationErrors.phoneNumber) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.phoneNumber
        return newErrors
      })
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      email: e.target.value
    }))
    
    if (validationErrors.email) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.email
        return newErrors
      })
    }
  }

  // 🟢 FIX: Custom close handler that respects preventClose
  const handleCloseAttempt = () => {
    if (preventClose) {
      console.log('❌ Close attempt prevented - profile completion required')
      toast.info('Please provide your profile to continue')
      return
    }
    onClose()
  }

  const isLoading = isSubmitting
  const isFormValid = formData.country && formData.phoneNumber && (!needsEmail || formData.email)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* 🟢 FIX: Prevent closing when clicking overlay if preventClose is true */}
      {!preventClose && (
        <div 
          className="absolute inset-0" 
          onClick={handleCloseAttempt}
          aria-hidden="true"
        />
      )}
      
      <div className="relative w-full max-w-md mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header - More compact */}
          <div className="relative p-5 border-b border-gray-200 dark:border-gray-700">
            {/* 🟢 FIX: Conditionally hide close button */}
            {!hideCloseButton && (
              <button
                onClick={handleCloseAttempt}
                className="absolute right-4 top-4 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            
            <div className="text-center pt-1">
              <div className="w-10 h-10 mx-auto mb-2 bg-primary/10 rounded-xl flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold mb-0.5">One more Step</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {preventClose 
                  ? 'Provide your basic profile to continue' 
                  : 'Complete your basic profile'
                }
              </p>
              {walletAddress && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Form - Reduced spacing */}
          <form onSubmit={handleSubmit} className="p-5">
            <div className="space-y-4">
              {/* 🟢 FIX: Show email field ALWAYS when needsEmail is true */}
              {needsEmail && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-0.5">
                    Email Address <span className="text-primary">*</span>
                  </label>
                  <div className="group relative flex items-center w-full bg-white dark:bg-gray-800/50 border-2 border-gray-100 dark:border-gray-700/50 rounded-xl hover:border-gray-200 dark:hover:border-gray-600 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 shadow-sm transition-all duration-200">
                    <div className="flex items-center justify-center pl-3 border-r border-gray-100 dark:border-gray-700 h-10 my-auto">
                      <Mail className="text-gray-400 group-focus-within:text-primary transition-colors h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleEmailChange}
                      placeholder="your@email.com"
                      className={`flex-1 h-10 pl-3 pr-3 bg-transparent outline-none text-sm text-gray-900 dark:text-white font-medium ${
                        validationErrors.email ? 'placeholder:text-red-400' : 'placeholder:text-gray-400'
                      }`}
                      required={needsEmail}
                      disabled={isLoading}
                    />
                  </div>
                  {validationErrors.email && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1 ml-0.5">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.email}
                    </p>
                  )}
                  {needsEmail && !formData.email && !validationErrors.email && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1 ml-0.5">
                      <AlertCircle className="h-3 w-3" />
                      Email not found in your account. Please provide one.
                    </p>
                  )}
                </div>
              )}

              {/* Organizer Toggle - More compact */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Event Organizer</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Will you be creating events?
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="isOrganizer"
                      checked={formData.isOrganizer}
                      onChange={handleInputChange}
                      className="sr-only peer"
                      disabled={isLoading}
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-black after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>

              {/* Country Select - More compact */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-0.5">
                  Country <span className="text-primary">*</span>
                </label>
                <div className="group relative flex items-center w-full bg-white dark:bg-gray-800/50 border-2 border-gray-100 dark:border-gray-700/50 rounded-xl hover:border-gray-200 dark:hover:border-gray-600 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 shadow-sm transition-all duration-200">
                  <div className="flex items-center justify-center pl-3 border-r border-gray-100 dark:border-gray-700 h-10 my-auto">
                    <Globe className="text-gray-400 group-focus-within:text-primary transition-colors h-4 w-4" />
                  </div>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                    className={`flex-1 h-10 pl-3 pr-8 bg-transparent outline-none text-sm text-gray-900 dark:text-white font-medium appearance-none ${
                      validationErrors.country ? 'text-red-500' : ''
                    }`}
                  >
                    <option value="" className="text-gray-900 dark:text-gray-400">Select country</option>
                    {COUNTRIES.map((country) => (
                      <option key={country.value} value={country.value} className="text-gray-900 dark:text-gray-100 bg-orange-500 dark:bg-gray-700">
                        {country.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {validationErrors.country && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1 ml-0.5">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.country}
                  </p>
                )}
              </div>

              {/* Phone Number - More compact */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 ml-0.5">
                  Phone Number <span className="text-primary">*</span>
                </label>
                
                <div className="group relative flex items-center w-full bg-white dark:bg-gray-800/50 border-2 border-gray-100 dark:border-gray-700/50 rounded-xl hover:border-gray-200 dark:hover:border-gray-600 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 shadow-sm transition-all duration-200">
                  <div className="flex items-center justify-center pl-3 border-r border-gray-100 dark:border-gray-700 h-10 my-auto">
                    <Phone className="text-gray-400 group-focus-within:text-primary transition-colors h-4 w-4" />
                  </div>

                  <PhoneInput
                    international
                    defaultCountry="NG"
                    value={formData.phoneNumber}
                    onChange={handlePhoneChange}
                    className="flex-1 flex h-10 pl-3"
                    
                    inputComponent={({ className, ...props }: any) => (
                      <input
                        {...props}
                        className={`w-full h-full bg-transparent px-3 text-sm font-medium outline-none ${
                          validationErrors.phoneNumber 
                            ? 'text-red-500 placeholder:text-red-400' 
                            : 'text-gray-900 dark:text-gray-100 placeholder:text-gray-400'
                        } placeholder:text-sm`}
                        placeholder="080 000 0000"
                      />
                    )}
                    
                    numberInputProps={{
                      className: "bg-transparent border-none focus:ring-0 text-sm" 
                    }}
                    
                    style={{
                      "--PhoneInputCountrySelect-marginRight": "8px",
                      "--PhoneInputCountryFlag-height": "1rem",
                    } as React.CSSProperties}
                  />
                </div>
                {validationErrors.phoneNumber && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1 ml-0.5">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.phoneNumber}
                  </p>
                )}
              </div>

              {/* Email status indicator */}
              {!needsEmail && formData.email && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs text-green-800 dark:text-green-400">
                      Using email from your login: <span className="font-medium">{formData.email}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions - More compact */}
            <div className="mt-6 flex gap-2">
              {/* 🟢 FIX: Disable Cancel button when preventClose is true */}
              <button
                type="button"
                onClick={handleCloseAttempt}
                className={`flex-1 py-2.5 border rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  preventClose
                    ? 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed bg-gray-50 dark:bg-gray-800'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                disabled={isLoading || preventClose}
              >
                {preventClose ? 'Cannot Cancel' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  isFormValid 
                    ? 'bg-primary text-white hover:bg-primary-dark' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    Continue
                  </>
                )}
              </button>
            </div>

            {/* 🟢 FIX: Required fields notice */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                <span className="text-primary">*</span> Required fields
              </p>
              {preventClose && (
                <p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-1 font-medium">
                  ⚠️ provide your basic profile to continue
                </p>
              )} 
              {needsEmail && (
                <p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-1">
                  Email is required for your account
                </p>
              )}
              {walletAddress && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
                  Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}