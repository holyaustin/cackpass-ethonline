// components/layout/Header.tsx

'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Sun, Moon, Menu, X, User } from 'lucide-react'
import { CustomUser } from '@/types/user'
import Image from 'next/image'
import Link from 'next/link'

export function Header() {
  const [darkMode, setDarkMode] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { login, logout, user, authenticated } = usePrivy()

  const customUser = user as CustomUser | null

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogin = () => {
    login()
  }

  // Function to get user display name based on login method
  const getUserDisplayName = () => {
    if (!customUser) return 'User'
    
    // Check different login methods for user identifier
    if (customUser.email?.address) {
      return customUser.email.address.split('@')[0]
    }
    
    // Google: uses name property
    if (customUser.google?.name) {
      return customUser.google.name
    }
    
    // Twitter: has username
    if (customUser.twitter?.username) {
      return `@${customUser.twitter.username}`
    }
    
    // For TikTok and Instagram (if using custom OAuth or email fallback)
    if (customUser.email) {
      return customUser.email.address.split('@')[0]
    }
    
    // Fallback to user ID or generic name
    return customUser.id?.slice(0, 8) || 'User'
  }

  // Function to determine login method icon
  const getLoginMethodIcon = () => {
    if (!customUser) return null
    
    if (customUser.email?.address) return '📧'
    if (customUser.google?.email) return 'G'
    if (customUser.twitter?.username) return '𝕏'
    
    return '👤'
  }

  // Function to get login method display name
  const getLoginMethodDisplay = () => {
    if (!customUser) return 'Unknown'
    
    if (customUser.email?.address) return 'Email'
    if (customUser.google?.email) return 'Google'
    if (customUser.twitter?.username) return 'Twitter (X)'
    
    return 'Email'
  }

  return (
    <header className={`sticky top-0 z-50 transition-all duration-200 ${
      scrolled 
        ? 'bg-surface/95 dark:bg-dark-surface/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-300'
        : 'bg-surface dark:bg-dark-surface border-b border-transparent'
    }`}>
      <nav className="responsive-container">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="relative w-10 h-10 md:w-12 md:h-12">
              <Image
                src="/logoosm.png"
                alt="TicketPass"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="text-xl md:text-2xl font-bold text-text dark:text-dark-text">
              Ticket<span className="text-primary dark:text-dark-primary">Pass</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/events" className="text-text hover:text-primary dark:text-dark-text dark:hover:text-dark-primary transition-colors font-medium">
              Events
            </Link>
            <Link href="/dashboard" className="text-text hover:text-primary dark:text-dark-text dark:hover:text-dark-primary transition-colors font-medium">
              Dashboard
            </Link>
            {customUser?.organizer && (
              <Link href="/organizer" className="text-text hover:text-primary dark:text-dark-text dark:hover:text-dark-primary transition-colors font-medium">
                Organizer
              </Link>
            )}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-background dark:bg-dark-background hover:bg-gray-100 dark:hover:bg-gray-200 transition-colors touch-target"
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <Sun className="h-5 w-5 text-text dark:text-dark-text" />
              ) : (
                <Moon className="h-5 w-5 text-text dark:text-dark-text" />
              )}
            </button>

            {/* Auth */}
            {authenticated ? (
              <div className="hidden md:flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-xs text-text-light dark:text-dark-secondary flex items-center gap-1">
                    <span className="text-sm">{getLoginMethodIcon()}</span>
                    <span>Signed in via {getLoginMethodDisplay()}</span>
                  </div>
                  <div className="text-sm font-medium text-text dark:text-dark-text">
                    {getUserDisplayName()}
                  </div>
                </div>
                <Link href="/dashboard" className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark dark:bg-dark-primary dark:hover:bg-dark-primary-dark transition-colors">
                  <User className="h-5 w-5" />
                  <span>Dashboard</span>
                </Link>
                <button
                  onClick={logout}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-300 text-text dark:text-dark-text rounded-xl hover:bg-gray-50 dark:hover:bg-gray-200 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="btn-primary px-6 py-3 touch-target"
              >
                Login
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 touch-target"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-text dark:text-dark-text" />
              ) : (
                <Menu className="h-6 w-6 text-text dark:text-dark-text" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 dark:border-gray-300">
            <div className="flex flex-col space-y-4">
              <Link 
                href="/events" 
                className="px-4 py-3 text-text hover:text-primary dark:text-dark-text dark:hover:text-dark-primary transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Events
              </Link>
              <Link 
                href="/dashboard" 
                className="px-4 py-3 text-text hover:text-primary dark:text-dark-text dark:hover:text-dark-primary transition-colors font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              {customUser?.organizer && (
                <Link 
                  href="/organizer" 
                  className="px-4 py-3 text-text hover:text-primary dark:text-dark-text dark:hover:text-dark-primary transition-colors font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Organizer
                </Link>
              )}
              
              {authenticated ? (
                <>
                  <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-300 mt-4">
                    <div className="text-xs text-text-light dark:text-dark-secondary flex items-center gap-1 mb-2">
                      <span className="text-sm">{getLoginMethodIcon()}</span>
                      <span>Signed in as</span>
                    </div>
                    <div className="font-medium text-text dark:text-dark-text">
                      {getUserDisplayName()}
                    </div>
                  </div>
                  <Link 
                    href="/profile"
                    className="px-4 py-3 text-text hover:text-primary dark:text-dark-text dark:hover:text-dark-primary transition-colors font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Complete Profile
                  </Link>
                  <button
                    onClick={logout}
                    className="px-4 py-3 mt-4 border border-gray-200 dark:border-gray-300 text-text dark:text-dark-text rounded-xl hover:bg-gray-50 dark:hover:bg-gray-200 transition-colors text-left"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    handleLogin()
                    setMobileMenuOpen(false)
                  }}
                  className="btn-primary px-4 py-3 mt-4"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}