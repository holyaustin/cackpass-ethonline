/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async headers() {
    if (process.env.NODE_ENV === 'development') return [];

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // FIXED: Re-added 'unsafe-inline' and 'unsafe-eval' + added Privy/Cloudflare/hCaptcha/Paystack
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://auth.privy.io https://cdn.privy.io https://js.paystack.co https://paystack.co https://challenges.cloudflare.com https://hcaptcha.com https://*.hcaptcha.com https://telegram.org",
              "style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com",
              "img-src 'self' blob: data: https:",
              "font-src 'self' data: https://auth.privy.io",
              "frame-ancestors 'none'",
              // FIXED: Added hCaptcha and Cloudflare challenges for Privy auth security
              "frame-src 'self' https://auth.privy.io https://js.paystack.co https://verify.walletconnect.com https://verify.walletconnect.org https://hcaptcha.com https://*.hcaptcha.com https://challenges.cloudflare.com",
              // FIXED: Expanded connect-src for Lisk, WalletConnect, and Privy Analytics
              "connect-src 'self' https://auth.privy.io https://*.privy.io https://api.paystack.co https://explorer-api.walletconnect.com wss://*.bridge.walletconnect.org https://lisk.com https://*.alchemy.com https://*.infura.io https://hcaptcha.com https://*.hcaptcha.com",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
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
