/** @type {import('next').NextConfig} */

// 1. Define the CSP Header specifically for Privy and General Security
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://privy.io;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://**;
    font-src 'self' data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    frame-src 'self' https://privy.io https://walletconnect.com https://walletconnect.org;
    connect-src 'self' https://privy.io https://*.privy.io wss://*.bridge.walletconnect.org https://alchemy.com;
    upgrade-insecure-requests;
`;

const nextConfig = {
  reactStrictMode: true,
  // Turbopack is handled via CLI, but keeping the key if you use specific settings
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // 2. Add the Security Headers (CSP & X-Frame-Options)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
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
};

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA(nextConfig);
