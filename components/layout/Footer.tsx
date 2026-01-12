// components/layout/Footer.tsx
import { Ticket, Twitter, Github, Linkedin, Instagram } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-6">
              <Ticket className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-white">
                CACK<span className="text-primary">pass</span>
              </span>
            </div>
            <p className="mb-6 max-w-md">
              The future of event ticketing is here. Experience gasless transactions,
              hybrid payments, and blockchain security.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-primary">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-primary">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-primary">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="p-2 bg-gray-800 rounded-lg hover:bg-primary">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Platform</h4>
            <ul className="space-y-3">
              <li><a href="/events" className="hover:text-primary">Events</a></li>
              <li><a href="/dashboard" className="hover:text-primary">Dashboard</a></li>
              <li><a href="/market" className="hover:text-primary">Resale Market</a></li>
              <li><a href="/scanner" className="hover:text-primary">Scanner App</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-3">
              <li><a href="/docs" className="hover:text-primary">Documentation</a></li>
              <li><a href="/api" className="hover:text-primary">API</a></li>
              <li><a href="/blog" className="hover:text-primary">Blog</a></li>
              <li><a href="/support" className="hover:text-primary">Support</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-3">
              <li><a href="/about" className="hover:text-primary">About</a></li>
              <li><a href="/careers" className="hover:text-primary">Careers</a></li>
              <li><a href="/privacy" className="hover:text-primary">Privacy</a></li>
              <li><a href="/terms" className="hover:text-primary">Terms</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center">
          <p>&copy; {new Date().getFullYear()} CACK-pass. All rights reserved.</p>
          <p className="text-sm mt-2 text-gray-500">
            Built with ❤️ for the future of events
          </p>
        </div>
      </div>
    </footer>
  )
}