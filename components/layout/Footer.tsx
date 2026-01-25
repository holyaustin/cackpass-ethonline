// components/layout/Footer.tsx
import { Twitter, Linkedin, Instagram } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

// Telegram Messenger SVG Component
const TelegramIcon = ({ className = "h-4 w-4" }) => (
  <svg 
    className={className} 
    fill="currentColor" 
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.57-1.38-.93-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.06-.2-.07-.06-.17-.04-.24-.02-.1.02-1.79 1.14-5.06 3.34-.48.33-.91.49-1.3.48-.43-.01-1.27-.24-1.89-.44-.76-.24-1.36-.37-1.31-.78.03-.24.37-.49 1.03-.76 4.05-1.73 6.75-2.88 8.09-3.45 3.88-1.61 4.69-1.89 5.21-1.9.11 0 .36.03.52.18.12.12.15.28.14.44z"/>
  </svg>
)

export function Footer() {
  return (
    <footer className="bg-surface dark:bg-dark-surface border-t border-gray-100 dark:border-gray-300">
      <div className="responsive-container">
        <div className="py-3">
          {/* Single Row Layout */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">
            {/* Logo & Brand - Left */}
            <div className="flex items-center space-x-2 sm:space-x-3 order-1 flex-shrink-0">
              <div className="relative w-7 h-7 sm:w-8 sm:h-8">
                <Image
                  src="/logoosm.png"
                  alt="CACK-pass logo"
                  fill
                  className="object-contain"
                  priority
                  sizes="28px"
                />
              </div>
              <div>
                <span className="text-sm font-bold text-text dark:text-dark-text whitespace-nowrap">
                  CACK<span className="text-primary dark:text-dark-primary">-pass</span>
                </span>
              </div>
            </div>

            {/* Center Links */}
            <div className="flex items-center space-x-3 sm:space-x-4 text-xs order-3 sm:order-2 flex-grow justify-center mt-2 sm:mt-0">
              <Link href="/privacy" className="text-text-light dark:text-dark-secondary hover:text-primary dark:hover:text-dark-primary transition-colors whitespace-nowrap">
                Privacy
              </Link>
              <span className="text-text-light dark:text-dark-secondary">•</span>
              <Link href="/terms" className="text-text-light dark:text-dark-secondary hover:text-primary dark:hover:text-dark-primary transition-colors whitespace-nowrap">
                Terms
              </Link>
              <span className="text-text-light dark:text-dark-secondary hidden sm:inline">•</span>
              <span className="text-text-light dark:text-dark-secondary whitespace-nowrap hidden sm:inline">
                &copy; {new Date().getFullYear()}
              </span>
            </div>

            {/* Social Links - Right */}
            <div className="flex items-center space-x-1 sm:space-x-2 order-2 sm:order-3">
              <a href="#" className="p-1 bg-background dark:bg-dark-background rounded hover:bg-primary hover:text-white dark:hover:bg-dark-primary transition-colors">
                <Twitter className="h-3 w-3 sm:h-4 sm:w-4" />
              </a>
              <a href="#" className="p-1 bg-background dark:bg-dark-background rounded hover:bg-primary hover:text-white dark:hover:bg-dark-primary transition-colors">
                <Instagram className="h-3 w-3 sm:h-4 sm:w-4" />
              </a>
              <a href="#" className="p-1 bg-background dark:bg-dark-background rounded hover:bg-primary hover:text-white dark:hover:bg-dark-primary transition-colors">
                <TelegramIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              </a>
              <a href="#" className="p-1 bg-background dark:bg-dark-background rounded hover:bg-primary hover:text-white dark:hover:bg-dark-primary transition-colors">
                <Linkedin className="h-3 w-3 sm:h-4 sm:w-4" />
              </a>
            </div>
          </div>

          {/* Mobile-only Copyright Row */}
          <div className="sm:hidden text-center mt-2 pt-2 border-t border-gray-100 dark:border-gray-300">
            <span className="text-xs text-text-light dark:text-dark-secondary">
              &copy; {new Date().getFullYear()} CACK-pass
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}