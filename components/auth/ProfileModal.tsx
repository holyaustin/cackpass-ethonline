// /components/auth/ProfileModal.tsx - UPDATED (EMAIL HIDDEN, COMPACT LAYOUT)
'use client'

import { useState, useEffect } from 'react'
import { useWalletAuth } from '@/hooks/useWalletAuth'
import { X, Building, Globe, Phone, Save, Loader2, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import PhoneInput from 'react-phone-number-input'
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

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export function ProfileModal({ 
  isOpen, 
  onClose, 
  onComplete,
}: ProfileModalProps) {
  const { walletAddress, email: privyEmail, updateProfileByWallet, isLoading: authLoading } = useWalletAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    isOrganizer: false,
    country: '',
    phoneNumber: '',
    email: '', // Hidden but required field
  })

  useEffect(() => {
    if (isOpen) {
      // Pre-fill email from Privy if available, otherwise it will be empty
      setFormData({
        isOrganizer: false,
        country: '',
        phoneNumber: '',
        email: privyEmail || '', // Set email from Privy but hidden from user
      })
    }
  }, [isOpen, privyEmail])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.country || !formData.phoneNumber) {
      toast.error('Please fill all required fields')
      return
    }

    // Check if we have an email (either from Privy or needs to be entered)
    let finalEmail = formData.email
    
    // If no email from Privy and no email entered, show error
    if (!finalEmail) {
      toast.error('Email is required. Please log in with an email or contact support.')
      return
    }

    // Validate email format if we have one
    if (finalEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(finalEmail)) {
        toast.error('Invalid email format')
        return
      }
    }

    setIsSubmitting(true)
    
    try {
      if (!walletAddress) {
        throw new Error('Wallet address not available')
      }
      
      // Validate phone number
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
      const cleanPhoneNumber = formData.phoneNumber.replace(/\D/g, '')
      
      if (!phoneRegex.test(cleanPhoneNumber)) {
        throw new Error('Invalid phone number format')
      }
      
      // Submit with email (hidden from user but included in request)
      await updateProfileByWallet({
        isOrganizer: formData.isOrganizer,
        country: formData.country,
        phoneNumber: formData.phoneNumber,
        email: finalEmail, // Email included automatically
      })
      
      toast.success('Profile created successfully!')
      onComplete()
      
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = authLoading || isSubmitting
  const isFormValid = formData.country && formData.phoneNumber && formData.email

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header - More compact */}
          <div className="relative p-5 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="text-center pt-1">
              <div className="w-10 h-10 mx-auto mb-2 bg-primary/10 rounded-xl flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-bold mb-0.5">Get Started</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Complete your basic profile
              </p>
            </div>
          </div>

          {/* Form - Reduced spacing */}
          <form onSubmit={handleSubmit} className="p-5">
            <div className="space-y-4">
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
                      checked={formData.isOrganizer}
                      onChange={(e) => setFormData({
                        ...formData,
                        isOrganizer: e.target.checked
                      })}
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
                    value={formData.country}
                    onChange={(e) => setFormData({
                      ...formData,
                      country: e.target.value
                    })}
                    required
                    disabled={isLoading}
                    className="flex-1 h-10 pl-3 pr-8 bg-transparent outline-none text-sm text-gray-900 dark:text-white font-medium appearance-none"
                  >
                    <option value="" className="text-gray-900 ">Select country</option>
                    {COUNTRIES.map((country) => (
                      <option key={country.value} value={country.value} className="text-gray-900 dark:text-gray-100 bg-primary">
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
                    onChange={(value) => setFormData({
                      ...formData,
                      phoneNumber: value || ''
                    })}
                    className="flex-1 flex h-10 pl-3"
                    
                    inputComponent={({ className, ...props }: any) => (
                      <input
                        {...props}
                        className="w-full h-full bg-transparent px-3 text-sm font-medium outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 placeholder:text-sm"
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
              </div>

              {/* Hidden email indicator - Only show if we have email from Privy */}
              {formData.email && (
                <div className="pt-2">
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    <span>Email verified from your login method</span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions - More compact */}
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                Cancel
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

            {/* Email requirement note */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Email is required for your account. {formData.email ? 'Using email from your login method.' : 'Please ensure you logged in with an email address.'}
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}