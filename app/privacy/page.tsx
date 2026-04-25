// app/privacy/page.tsx
import Link from 'next/link';
import { ArrowLeft, Shield, Eye, Database, Mail, Lock, Clock } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | CACK-pass',
  description: 'Privacy policy for CACK-pass - Your ticket to unforgettable experiences',
};

export default function PrivacyPage() {
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
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Privacy Policy
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Introduction
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              At CACK-pass, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, 
              and safeguard your information when you use our platform to discover, create, and purchase event tickets. 
              Please read this policy carefully. By using our services, you consent to the practices described herein.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Information We Collect
            </h2>
            <div className="space-y-3 text-gray-600 dark:text-gray-300">
              <p><strong className="text-gray-800 dark:text-gray-200">Personal Information:</strong> Name, email address, wallet address, phone number, and profile information you provide.</p>
              <p><strong className="text-gray-800 dark:text-gray-200">Transaction Information:</strong> Ticket purchases, payment details, event attendance history, and transaction hashes.</p>
              <p><strong className="text-gray-800 dark:text-gray-200">Technical Information:</strong> IP address, browser type, device information, and usage data collected automatically.</p>
              <p><strong className="text-gray-800 dark:text-gray-200">Blockchain Data:</strong> Public wallet addresses and on-chain transaction records associated with ticket purchases.</p>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              How We Use Your Information
            </h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300 ml-4">
              <li>Process and manage ticket purchases and event registrations</li>
              <li>Send you confirmation emails and important event updates</li>
              <li>Verify ticket authenticity and prevent fraud</li>
              <li>Improve our platform and develop new features</li>
              <li>Communicate with you about events, promotions, and platform updates</li>
              <li>Comply with legal obligations and enforce our terms of service</li>
            </ul>
          </section>

          {/* Data Security */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Data Security
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              We implement industry-standard security measures to protect your personal information. 
              This includes encryption, secure servers, and regular security audits. However, no method 
              of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          {/* Data Retention */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Data Retention
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              We retain your personal information for as long as necessary to provide our services, 
              comply with legal obligations, resolve disputes, and enforce our agreements. Ticket 
              transaction data may be retained indefinitely for historical and audit purposes.
            </p>
          </section>

          {/* Email Communications */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email Communications
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              We may send you emails regarding your tickets, event confirmations, and important platform 
              updates. You can opt out of promotional emails at any time by clicking the unsubscribe link. 
              However, you will continue to receive essential service-related communications.
            </p>
          </section>

          {/* Third-Party Services */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Third-Party Services
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              We use trusted third-party services including Paystack for payment processing and IPFS for 
              decentralized storage. These services have their own privacy policies, and we encourage you 
              to review them. We are not responsible for the privacy practices of third-party services.
            </p>
          </section>

          {/* Your Rights */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Your Rights
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-2">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300 ml-4">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your information</li>
              <li>Opt out of certain data processing activities</li>
              <li>Data portability where applicable</li>
            </ul>
          </section>

          {/* Contact Us */}
          <section className="mb-8 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Contact Us
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300">
                Email: <a href="mailto:privacy@cackpass.com" className="text-primary hover:underline">privacy@cackpass.com</a>
              </p>
              <p className="text-gray-700 dark:text-gray-300 mt-1">
                Address: CACK-pass, [Your Address], Nigeria
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