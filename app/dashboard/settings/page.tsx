// app/dashboard/settings/page.tsx
'use client'

import { useState } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { 
  User, Bell, Shield, Globe, Moon, Sun, 
  LogOut, Save, Key, Smartphone, Mail, Lock
} from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function SettingsPage() {
  const { user, authenticated, ready, logout } = usePrivy()
  const [darkMode, setDarkMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    ticketUpdates: true,
    eventReminders: true,
    promotional: false,
  })

  const [security, setSecurity] = useState({
    twoFactorAuth: false,
    biometricLogin: false,
    sessionTimeout: '30',
  })

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await logout()
    }
  }

  if (!ready) return <LoadingSpinner fullScreen />
  if (!authenticated) return <div className="p-8 text-center">Please sign in to view settings</div>

  const userEmail = user?.email?.address || 'No email provided'
  const userName = user?.email?.address?.split('@')[0] || user?.google?.name || 'User'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account preferences and security
          </p>
        </div>

        {/* Profile Section */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold">{userName}</h3>
              <p className="text-gray-600 dark:text-gray-400">{userEmail}</p>
              <p className="text-sm text-gray-500 mt-1">
                Member since {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <button className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
              Edit Profile
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Appearance */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                {darkMode ? (
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
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>

          {/* Notifications */}
          <div className="glass-card rounded-2xl p-6">
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
              {Object.entries(notifications).map(([key, value]) => (
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
                      onChange={(e) => setNotifications({
                        ...notifications,
                        [key]: e.target.checked
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
          <div className="glass-card rounded-2xl p-6">
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
                    checked={security.twoFactorAuth}
                    onChange={(e) => setSecurity({
                      ...security,
                      twoFactorAuth: e.target.checked
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
                    checked={security.biometricLogin}
                    onChange={(e) => setSecurity({
                      ...security,
                      biometricLogin: e.target.checked
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
                    value={security.sessionTimeout}
                    onChange={(e) => setSecurity({
                      ...security,
                      sessionTimeout: e.target.value
                    })}
                    className="px-3 py-1 bg-white dark:bg-gray-700 rounded-lg"
                  >
                    <option value="5">5 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Globe className="h-5 w-5 text-purple-500" />
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
              
              <button className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-red-600 dark:text-red-400">
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
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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