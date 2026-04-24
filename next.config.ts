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
              // Fixed: Added auth.privy.io explicitly
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://auth.privy.io",
              "style-src 'self' 'unsafe-inline'",
              // Fixed: Changed https://** to https: (valid CSP syntax)
              "img-src 'self' blob: data: https:",
              "font-src 'self' data:",
              "frame-ancestors 'none'",
              // Fixed: Added specific WalletConnect and Privy auth domains
              "frame-src 'self' https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org",
              // Fixed: Added Lisk RPC and WalletConnect Explorer API domains found in your logs
              "connect-src 'self' https://auth.privy.io https://*.privy.io https://explorer-api.walletconnect.com wss://*.bridge.walletconnect.org https://rpc.api.lisk.com https://*.alchemy.com https://*.infura.io https://rpc.ankr.com",
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
