const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Enable static exports for Vercel
  output: 'standalone',
  // Optimize for production
  swcMinify: true,
  // Enable compression
  compress: true,
  // Enable React strict mode
  reactStrictMode: true,
  // Enable ESLint during builds
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Enable TypeScript during builds
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = withNextIntl(nextConfig)
