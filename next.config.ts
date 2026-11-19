import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir:
    process.env.VERCEL === '1'
      ? '.next'
      : process.env.NODE_ENV === 'production'
        ? '.next-build'
        : '.next',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.neon.tech',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
};

export default nextConfig;

