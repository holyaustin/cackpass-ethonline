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
    console.log("Current Environment:", process.env.NODE_ENV);
    // FIX: Prevents CSP from blocking WebSockets/Fast Refresh on Localhost
    if (process.env.NODE_ENV === 'development') return [];
      console.log("CSP headers disabled for local development.");
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // UPDATED: Added https://paystack.co
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://auth.privy.io https://paystack.co",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data: https:",
              "font-src 'self' data:",
              "frame-ancestors 'none'",
              // UPDATED: Added https://paystack.co for payment iframes
              "frame-src 'self' https://auth.privy.io https://paystack.co https://verify.walletconnect.com https://verify.walletconnect.org",
              // UPDATED: Added https://paystack.co for transaction checks
              "connect-src 'self' https://auth.privy.io https://*.privy.io https://paystack.co https://explorer-api.walletconnect.com wss://*.bridge.walletconnect.org https://rpc.api.lisk.com https://*.alchemy.com https://*.infura.io https://rpc.ankr.com",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            // UPDATED: Changed to SAMEORIGIN so Paystack/Privy iframes can communicate with your app
            value: 'SAMEORIGIN',
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
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(), interest-cohort=()', 
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
