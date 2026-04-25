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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://auth.privy.io https://cdn.privy.io https://js.paystack.co https://paystack.co https://checkout.paystack.com https://challenges.cloudflare.com https://hcaptcha.com https://*.hcaptcha.com https://verify.walletconnect.com https://verify.walletconnect.org",
              "style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com",
              "img-src 'self' data: blob: https: https://pinata.cloud https://ipfs.io",
              "font-src 'self' data:",
              "frame-ancestors 'none'",
              // FIXED: Added https://checkout.paystack.com to frame-src
              "frame-src 'self' https://auth.privy.io https://js.paystack.co https://paystack.co https://checkout.paystack.com https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com https://hcaptcha.com https://*.hcaptcha.com",
              // FIXED: Added paystack.com to connect-src
              "connect-src 'self' https://auth.privy.io https://*.privy.io https://api.privy.io wss://*.bridge.walletconnect.org wss://relay.walletconnect.com wss://relay.walletconnect.org https://explorer-api.walletconnect.com https://api.paystack.co https://checkout.paystack.com https://*.lisk.com https://lisk.com https://*.alchemy.com https://*.infura.io https://ankr.com https://pinata.cloud https://hcaptcha.com https://*.hcaptcha.com",
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
