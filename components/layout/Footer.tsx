// components/layout/Footer.tsx
import { Twitter, Github, Linkedin, Instagram, Mail, Phone } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-surface dark:bg-dark-surface border-t border-gray-100 dark:border-gray-300">
      <div className="responsive-container">
        <div className="py-8 md:py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 md:gap-12">
            {/* Brand Column */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="relative w-16 h-16">
                  <Image
                    src="/logoosm.png"
                    alt="CACK-pass logo"
                    fill
                    className="object-contain"
                    priority
                    sizes="(max-width: 640px) 40px, (max-width: 768px) 44px, (max-width: 1024px) 48px, 56px"
                  />
                </div>
                <div>
                  <span className="text-2xl font-bold text-text dark:text-dark-text block">
                    Ticket<span className="text-primary dark:text-dark-primary">Pass</span>
                  </span>
                  <p className="text-sm text-text-light dark:text-dark-secondary">
                    Smart Digital Tickets
                  </p>
                </div>
              </div>
              <p className="text-text-light dark:text-dark-secondary mb-6 max-w-md text-sm md:text-base">
                The future of event ticketing is here. Experience seamless transactions, 
                memorable digital tickets, and smart event management.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="p-2 bg-background dark:bg-dark-background rounded-lg hover:bg-primary hover:text-white dark:hover:bg-dark-primary transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="#" className="p-2 bg-background dark:bg-dark-background rounded-lg hover:bg-primary hover:text-white dark:hover:bg-dark-primary transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="#" className="p-2 bg-background dark:bg-dark-background rounded-lg hover:bg-primary hover:text-white dark:hover:bg-dark-primary transition-colors">
                  <Github className="h-5 w-5" />
                </a>
                <a href="#" className="p-2 bg-background dark:bg-dark-background rounded-lg hover:bg-primary hover:text-white dark:hover:bg-dark-primary transition-colors">
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-text dark:text-dark-text font-semibold mb-4 md:mb-6">Platform</h4>
              <ul className="space-y-3 md:space-y-4">
                <li><Link href="/events" className="text-text-light dark:text-dark-secondary hover:text-primary dark:hover:text-dark-primary transition-colors text-sm md:text-base">Events</Link></li>
                <li><Link href="/dashboard" className="text-text-light dark:text-dark-secondary hover:text-primary dark:hover:text-dark-primary transition-colors text-sm md:text-base">Dashboard</Link></li>
                <li><Link href="/market" className="text-text-light dark:text-dark-secondary hover:text-primary dark:hover:text-dark-primary transition-colors text-sm md:text-base">Resale Market</Link></li>
                <li><Link href="/scanner" className="text-text-light dark:text-dark-secondary hover:text-primary dark:hover:text-dark-primary transition-colors text-sm md:text-base">Scanner App</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-text dark:text-dark-text font-semibold mb-4 md:mb-6">Resources</h4>
              <ul className="space-y-3 md:space-y-4">
                <li><Link href="/docs" className="text-text-light dark:text-dark-secondary hover:text-primary dark:hover:text-dark-primary transition-colors text-sm md:text-base">Documentation</Link></li>
                <li><Link href="/blog" className="text-text-light dark:text-dark-secondary hover:text-primary dark:hover:text-dark-primary transition-colors text-sm md:text-base">Blog</Link></li>
                <li><Link href="/support" className="text-text-light dark:text-dark-secondary hover:text-primary dark:hover:text-dark-primary transition-colors text-sm md:text-base">Support</Link></li>
                <li><Link href="/help" className="text-text-light dark:text-dark-secondary hover:text-primary dark:hover:text-dark-primary transition-colors text-sm md:text-base">Help Center</Link></li>
              </ul>
            </div>

            {/* Company & Contact */}
            <div>
              <h4 className="text-text dark:text-dark-text font-semibold mb-4 md:mb-6">Contact</h4>
              <ul className="space-y-3 md:space-y-4">
                <li className="flex items-center space-x-2 text-text-light dark:text-dark-secondary text-sm md:text-base">
                  <Mail className="h-4 w-4" />
                  <a href="mailto:support@CACK-pass.com" className="hover:text-primary dark:hover:text-dark-primary transition-colors">support@CACK-pass.com</a>
                </li>
                <li className="flex items-center space-x-2 text-text-light dark:text-dark-secondary text-sm md:text-base">
                  <Phone className="h-4 w-4" />
                  <a href="tel:+2348001234567" className="hover:text-primary dark:hover:text-dark-primary transition-colors">+234 800 123 4567</a>
                </li>
              </ul>
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-300">
                <Link href="/privacy" className="text-text-light dark:text-dark-secondary hover:text-primary dark:hover:text-dark-primary transition-colors text-xs md:text-sm">Privacy</Link>
                <span className="mx-2 text-text-light dark:text-dark-secondary">•</span>
                <Link href="/terms" className="text-text-light dark:text-dark-secondary hover:text-primary dark:hover:text-dark-primary transition-colors text-xs md:text-sm">Terms</Link>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-300 mt-8 md:mt-12 pt-8 text-center">
            <p className="text-text-light dark:text-dark-secondary text-sm">&copy; {new Date().getFullYear()} CACK-pass. All rights reserved.</p>
            <p className="text-text-light/70 dark:text-dark-secondary/70 text-xs mt-2">
              Built with ❤️ for memorable event experiences
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}