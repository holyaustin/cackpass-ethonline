/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Allows Privy scripts and Next.js internal execution
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://privy.io",
              // Allows your custom styles and Tailwind
              "style-src 'self' 'unsafe-inline'",
              // Allows images from any HTTPS source (matches your remotePatterns)
              "img-src 'self' blob: data: https://**",
              // Allows fonts
              "font-src 'self' data:",
              // Security: prevents your site from being embedded elsewhere
              "frame-ancestors 'none'",
              // CRITICAL: Allows Privy Wallet and WalletConnect iframes
              "frame-src 'self' https://privy.io https://walletconnect.com https://walletconnect.org https://*.bridge.walletconnect.org",
              // CRITICAL: Allows API calls to Privy, Alchemy, and RPC nodes
              "connect-src 'self' https://privy.io https://*.privy.io wss://*.bridge.walletconnect.org https://*.alchemy.com https://*.infura.io https://ankr.com",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
}

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

module.exports = withPWA(nextConfig)
