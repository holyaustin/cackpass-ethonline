import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';
import withBundleAnalyzerInit from '@next/bundle-analyzer';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  // Experimental optimizations
  experimental: {
    webpackMemoryOptimizations: true,
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@privy-io/react-auth',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-icons',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast'
    ],
  },
  
  // Excludes heavy backend tools from the frontend bundle
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

  turbopack: {},
  

  // Image Optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // ✅ Dynamically extracts 'cyan-heavy-kangaroo-977.mypinata.cloud' from your env variable
        hostname: process.env.NEXT_PUBLIC_GATEWAY_URL 
          ? new URL(process.env.NEXT_PUBLIC_GATEWAY_URL).hostname 
          : 'cyan-heavy-kangaroo-977.mypinata.cloud', // Fallback just in case env is missing during builds
        pathname: '/ipfs/**',
      },
      // ✅ ADDED: Authorized Imgur Asset Pipeline Wrapper
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
        pathname: '/**', // Safely allow assets under the root folder path
      },
      
    ],
    formats: ['image/avif', 'image/webp'],
  },
};

// Modern Next 16 PWA Initialization
const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  // ✅ FIX: Move skipWaiting inside workboxOptions
  workboxOptions: {
    skipWaiting: true,
  },
});

const withBundleAnalyzer = withBundleAnalyzerInit({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(withPWA(nextConfig));

