/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async headers() {
    if (process.env.NODE_ENV !== 'production') return [];

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "manifest-src 'self'",
              "object-src 'none'",
              "worker-src 'self'",
              // FIXED: Added 'unsafe-eval' and 'unsafe-inline' which are mandatory for Privy/Next.js
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://privy.io https://privy.io https://paystack.co https://paystack.co https://paystack.com https://cloudflare.com https://hcaptcha.com https://*.hcaptcha.com https://walletconnect.com https://walletconnect.org",
              "style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com",
              "img-src 'self' data: blob: https: https://pinata.cloud https://ipfs.io",
              "font-src 'self' data:",
              "child-src https://privy.io https://walletconnect.com https://walletconnect.org hcaptcha.com https://*.hcaptcha.com",
              "frame-src 'self' https://privy.io https://walletconnect.com https://walletconnect.org https://cloudflare.com https://paystack.co https://paystack.com https://hcaptcha.com https://*.hcaptcha.com",
              // FIXED: Added *.privy.systems (Privy Config) and *.rpc.privy.systems
              "connect-src 'self' https://privy.io https://*.privy.io https://privy.io https://*.privy.systems https://*.rpc.privy.systems wss://*.bridge.walletconnect.org wss://://walletconnect.com wss://relay.walletconnect.org https://walletconnect.com https://paystack.co https://paystack.com https://*.lisk.com https://lisk.com https://*.alchemy.com https://*.infura.io https://ankr.com https://pinata.cloud https://hcaptcha.com https://*.hcaptcha.com",
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
            value: 'camera=(self), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA(nextConfig);
