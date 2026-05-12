import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

    // ✅ ADDED: Optimize package imports
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
    'date-fns': {
      transform: 'date-fns/{{member}}',
    },
  },
  
  // ✅ ADDED: Experimental optimizations
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@privy-io/react-auth',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
    ],
  },
  
  // ✅ ADDED: Move heavy deps to external (reduces server bundle)
  serverExternalPackages: [
    'nodemailer',
    'qrcode',
    'sharp',
    'mongoose',
    'mongodb',
    '@privy-io/server-auth',
    '@solana/web3.js',
    'svix',
    'canonicalize',
    'fast-sha256',
    '@stablelib/base64',
  ],
    // Note: Turbopack currently has limited support for some plugins; 
  // if analysis fails, try removing this line temporarily.
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // No CSP headers
};

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

// Initialize the Bundle Analyzer plugin
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// Wrap the config with both plugins
module.exports = withBundleAnalyzer(withPWA(nextConfig));