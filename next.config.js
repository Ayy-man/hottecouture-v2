const createNextIntlPlugin = require('next-intl-plugin')
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
    optimizePackageImports: ['@dnd-kit/*', 'framer-motion', 'lucide-react', 'jotai'],
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
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
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
  // Performance optimizations
  poweredByHeader: false,
  generateEtags: true,
  httpAgentOptions: {
    keepAlive: true,
  },
  // Cache configuration
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
    ]
  },
  // i18n is handled by next-intl plugin
}

module.exports = withNextIntl(withBundleAnalyzer(nextConfig))