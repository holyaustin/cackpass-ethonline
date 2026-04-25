// app/terms/page.tsx
import Link from 'next/link';
import { ArrowLeft, Shield, FileText, Scale, Users, Zap, AlertCircle } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | CACK-pass',
  description: 'Terms of service for CACK-pass - Your ticket to unforgettable experiences',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back button */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Terms of Service
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Acceptance of Terms */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Acceptance of Terms
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              By accessing or using CACK-pass, you agree to be bound by these Terms of Service. 
              If you do not agree to all the terms, you may not access or use our platform. 
              These terms apply to all users, including event organizers, ticket buyers, and visitors.
            </p>
          </section>

          {/* Description of Service */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Description of Service
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              CACK-pass is a blockchain-based ticketing platform that enables event organizers to create, 
              manage, and sell tickets, and allows attendees to discover, purchase, and transfer digital 
              tickets. Tickets are stored as NFTs (Non-Fungible Tokens) on the blockchain, providing 
              authenticity and security.
            </p>
          </section>

          {/* User Accounts */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              User Accounts
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-2">
              To use certain features, you must create an account using Privy authentication. You are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300 ml-4">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
              <li>Providing accurate and complete information</li>
            </ul>
          </section>

          {/* Ticket Purchases */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Ticket Purchases
            </h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ml-4">
              <li>All ticket sales are final unless otherwise stated by the event organizer</li>
              <li>Prices are displayed in your selected currency and may include service fees</li>
              <li>You are responsible for verifying event details before purchase</li>
              <li>Tickets are non-transferable except through our official platform features</li>
              <li>Event organizers may set their own refund and cancellation policies</li>
            </ul>
          </section>

          {/* Event Organizer Responsibilities */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Event Organizer Responsibilities
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-2">
              If you create events on CACK-pass, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300 ml-4">
              <li>Provide accurate event details, dates, and location</li>
              <li>Honor all tickets sold through the platform</li>
              <li>Comply with all applicable laws and regulations</li>
              <li>Not create fraudulent or misleading events</li>
              <li>Respect attendee privacy and data protection laws</li>
              <li>Handle event cancellations and notify attendees promptly</li>
            </ul>
          </section>

          {/* Prohibited Activities */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Prohibited Activities
            </h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300 ml-4">
              <li>Creating fake tickets or fraudulent events</li>
              <li>Using bots or automated systems to purchase tickets</li>
              <li>Reselling tickets at inflated prices outside our platform</li>
              <li>Attempting to bypass our security measures or smart contracts</li>
              <li>Harassing other users or event organizers</li>
              <li>Violating any applicable laws or regulations</li>
            </ul>
          </section>

          {/* Fees and Payments */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Fees and Payments
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              CACK-pass may charge service fees for ticket sales. All fees are clearly displayed before 
              purchase. Payment processing is handled by our trusted partners (Paystack). You agree to pay 
              all fees associated with your purchases. Event organizers agree to pay platform fees as 
              described in the organizer dashboard.
            </p>
          </section>

          {/* Intellectual Property */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Intellectual Property
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              All content on CACK-pass, including logos, designs, text, graphics, and software, is the 
              property of CACK-pass or our licensors. You may not copy, modify, distribute, or create 
              derivative works without our express permission. Event organizers retain ownership of their 
              event content but grant us a license to display and promote it on our platform.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Limitation of Liability
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              To the fullest extent permitted by law, CACK-pass is not liable for any indirect, incidental, 
              special, consequential, or punitive damages arising from your use of our platform. Our total 
              liability shall not exceed the amount you paid for tickets or ₦50,000, whichever is less. 
              We are not responsible for event cancellations, changes, or the conduct of event organizers.
            </p>
          </section>

          {/* Termination */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Termination
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              We may terminate or suspend your account immediately for violation of these Terms. 
              Upon termination, your right to use the platform ceases. Event organizers will have 
              reasonable time to fulfill existing ticket obligations before account closure.
            </p>
          </section>

          {/* Governing Law */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Governing Law
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              These Terms are governed by the laws of Nigeria. Any disputes arising from these Terms 
              shall be resolved in the courts of Lagos, Nigeria. For international users, you agree 
              to submit to the jurisdiction of Nigerian courts.
            </p>
          </section>

          {/* Changes to Terms */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Changes to Terms
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              We may modify these Terms at any time. Notice of material changes will be provided via 
              email or platform notification. Your continued use of CACK-pass after changes constitutes 
              acceptance of the modified Terms. Please review these Terms periodically.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-8 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Contact Us
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              If you have questions about these Terms, please contact us:
            </p>
            <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300">
                Email: <a href="mailto:legal@cackpass.com" className="text-primary hover:underline">legal@cackpass.com</a>
              </p>
              <p className="text-gray-700 dark:text-gray-300 mt-1">
                Support: <a href="mailto:support@cackpass.com" className="text-primary hover:underline">support@cackpass.com</a>
              </p>
            </div>
          </section>

          {/* Footer */}
          <div className="text-center pt-6 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
            <p>© {new Date().getFullYear()} CACK-pass. All rights reserved.</p>
            <div className="flex justify-center gap-4 mt-3">
              <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}