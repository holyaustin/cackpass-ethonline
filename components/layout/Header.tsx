// components/layout/Header.tsx
'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Sun, Moon, Menu, X, Ticket, User } from 'lucide-react'
import { CustomUser } from '@/types/user' // Adjust path as needed

export function Header() {
  const [darkMode, setDarkMode] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { login, logout, user, authenticated } = usePrivy()

  // Cast user to CustomUser type
  const customUser = user as CustomUser | null

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Ticket className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              CACK<span className="text-primary">pass</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="/events" className="text-gray-700 dark:text-gray-300 hover:text-primary">
              Events
            </a>
            <a href="/dashboard" className="text-gray-700 dark:text-gray-300 hover:text-primary">
              Dashboard
            </a>
            {customUser?.organizer && (
              <a href="/organizer" className="text-gray-700 dark:text-gray-300 hover:text-primary">
                Organizer
              </a>
            )}
            {customUser?.admin && (
              <a href="/admin" className="text-gray-700 dark:text-gray-300 hover:text-primary">
                Admin
              </a>
            )}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800"
            >
              {darkMode ? (
                <Sun className="h-5 w-5 text-yellow-500" />
              ) : (
                <Moon className="h-5 w-5 text-gray-700" />
              )}
            </button>

            {/* Auth */}
            {authenticated ? (
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                Connect Wallet
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t">
            <div className="flex flex-col space-y-4 mt-4">
              <a href="/events" className="text-gray-700 dark:text-gray-300">
                Events
              </a>
              <a href="/dashboard" className="text-gray-700 dark:text-gray-300">
                Dashboard
              </a>
              {customUser?.organizer && (
                <a href="/organizer" className="text-gray-700 dark:text-gray-300">
                  Organizer
                </a>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}