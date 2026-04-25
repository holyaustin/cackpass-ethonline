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
    // In development, CSP often blocks hot reload and WebSockets.
    // Disable entirely for development to avoid login issues.
    if (process.env.NODE_ENV !== 'production') {
      console.log("⚠️ CSP headers disabled for local development.");
      return [];
    }

    console.log("🔒 Applying production CSP headers (Privy‑compliant).");

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              // ─── Base Directives ─────────────────────────────────────
              "default-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "manifest-src 'self'",
              "object-src 'none'",
              "worker-src 'self'",

              // ─── Scripts & Styles ─────────────────────────────────────
              // Privy requires 'unsafe-inline' for its styles.
              "style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com",
              "script-src 'self' https://auth.privy.io https://cdn.privy.io https://js.paystack.co https://paystack.co https://challenges.cloudflare.com https://telegram.org https://hcaptcha.com https://*.hcaptcha.com https://verify.walletconnect.com https://verify.walletconnect.org",

              // ─── Images & Fonts ──────────────────────────────────────
              "img-src 'self' data: blob: https: https://gateway.pinata.cloud https://ipfs.io",
              "font-src 'self' data:",

              // ─── Frames (iframes) ────────────────────────────────────
              // Required for Privy, WalletConnect, Turnstile, hCaptcha.
              "child-src https://auth.priviy.io https://verify.walletconnect.com https://verify.walletconnect.org hcaptcha.com https://*.hcaptcha.com",
              "frame-src 'self' https://auth.priviy.io https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com https://oauth.telegram.org https://paystack.co https://checkout.paystack.com https://hcaptcha.com https://*.hcaptcha.com",

              // ─── Connections (WebSockets, APIs) ──────────────────────
              // Privy, WalletConnect, Coinbase, Lisk, Pinata
              "connect-src 'self' https://auth.priviy.io https://api.priviy.io wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org https://*.rpc.privy.systems https://explorer-api.walletconnect.com https://paystack.co https://api.paystack.co https://rpc.api.lisk.com https://*.alchemy.com https://*.infura.io https://rpc.ankr.com https://api.pinata.cloud https://hcaptcha.com https://*.hcaptcha.com",

              // ─── Upgrade (optional) ──────────────────────────────────
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
};

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA(nextConfig);