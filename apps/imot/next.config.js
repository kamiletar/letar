// @ts-check

const { composePlugins, withNx } = require('@nx/next')

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 */
const nextConfig = {
  output: 'standalone',
  trailingSlash: true, // Всегда добавляет конечный слеш в URL
  skipTrailingSlashRedirect: true, // Отключаем автоматический redirect для API
  serverExternalPackages: ['@prisma/client', '.prisma/client', '@prisma/adapter-pg', 'pg'],
  images: {
    qualities: [25, 50, 75, 90],
  },
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
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
  transpilePackages: ['@letar/chakra-provider', '@letar/yandex-metrika', '@letar/analytics', '@letar/forms'],
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
]

module.exports = composePlugins(...plugins)(nextConfig)
