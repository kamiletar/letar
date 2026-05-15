const { composePlugins, withNx } = require('@nx/next')
const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 */
const nextConfig = {
  output: 'standalone',
  trailingSlash: true, // Всегда добавляет конечный слеш: /ru → /ru/
  skipTrailingSlashRedirect: true, // Отключаем автоматический redirect для API
  serverExternalPackages: ['@prisma/client', '.prisma/client', '@prisma/adapter-pg', 'pg'],
  images: {
    qualities: [25, 50, 75, 90],
  },
  nx: {
    svgr: false,
  },
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json',
  },
  // Turbopack — используется для Next.js 16 production build
  turbopack: {},
  experimental: {
    optimizePackageImports: ['@chakra-ui/react', 'react-icons'],
  },
  // Исключаем сгенерированный Prisma клиент из трейсинга файлов
  outputFileTracingExcludes: {
    '*': ['./src/generated/prisma/**/*'],
  },
  transpilePackages: ['@letar/chakra-provider', '@letar/yandex-metrika', '@letar/analytics'],

  // Rewrites для Better Auth (избегаем trailing slash конфликт)
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*/',
        destination: '/api/auth/:path*',
      },
    ]
  },

  // Security headers
  async headers() {
    return [
      // Глобальные security headers
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      // Service Worker - no-cache для актуальных обновлений
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ]
  },
}

const plugins = [withNx, withNextIntl]

module.exports = composePlugins(...plugins)(nextConfig)
