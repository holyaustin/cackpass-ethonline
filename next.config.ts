/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async headers() {
    // Only apply strict CSP in production to keep local dev (Fast Refresh/WebSockets) working
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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://auth.privy.io https://cdn.privy.io https://js.paystack.co https://paystack.co https://checkout.paystack.com https://cloudflare.com https://hcaptcha.com https://*.hcaptcha.com https://verify.walletconnect.com https://walletconnect.org",
              "style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com",
              "img-src 'self' data: blob: https: https://gateway.pinata.cloud https://ipfs.io",
              "font-src 'self' data:",
              "child-src https://auth.privy.io https://verify.walletconnect.com https://walletconnect.org https://hcaptcha.com https://*.hcaptcha.com",
              "frame-src 'self' https://auth.privy.io https://verify.walletconnect.com https://walletconnect.org https://cloudflare.com https://paystack.co https://checkout.paystack.com https://hcaptcha.com https://*.hcaptcha.com",
              // FIXED: Removed the malformed 'wss://://' and replaced with correct WalletConnect/Privy endpoints
              "connect-src 'self' https://auth.privy.io https://*.privy.io https://api.privy.io https://*.privy.systems https://*.rpc.privy.systems wss://relay.walletconnect.com wss://relay.walletconnect.org wss://*.bridge.walletconnect.org https://explorer-api.walletconnect.com https://api.paystack.co https://checkout.paystack.com https://*.lisk.com https://rpc.api.lisk.com https://*.alchemy.com https://*.infura.io https://rpc.ankr.com https://api.pinata.cloud https://hcaptcha.com https://*.hcaptcha.com",
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
