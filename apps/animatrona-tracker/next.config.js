// @ts-check

const { composePlugins, withNx } = require('@nx/next')

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 */
const nextConfig = {
  output: 'standalone',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  serverExternalPackages: ['@prisma/client'],
  images: {
    qualities: [25, 50, 75, 90],
    // Разрешаем загрузку изображений с IPFS gateway
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gateway.letar.best',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
      },
      {
        protocol: 'https',
        hostname: 'dweb.link',
      },
      {
        protocol: 'https',
        hostname: 'cloudflare-ipfs.com',
      },
    ],
  },
  nx: {
    svgr: false,
  },
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json',
  },
  experimental: {
    optimizePackageImports: ['@chakra-ui/react', 'react-icons'],
  },
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

  // @tanstack/devtools-ui@0.7.0+ (транзитивная зависимость @tanstack/react-devtools через
  // @letar/query-provider) импортирует именованный `use` из solid-js/web. webpack (dev идёт через
  // `next dev --webpack`) резолвит условие экспорта `node` для СЕРВЕРНОЙ половины графа сборки, а
  // под этим условием solid-js/web (dist/server.js) `use` вообще не экспортирует — падает
  // "Attempted import error: 'use' is not exported from solid-js/web", даже когда devtools
  // подключены через next/dynamic({ ssr: false }) (модуль всё равно резолвится в граф). Алиас на
  // false нужен для server-половины всегда, для client — только в production. Разбор —
  // apps/driving-school/next.config.js.
  webpack: (config, { dev, isServer }) => {
    if (isServer || !dev) {
      config.resolve.alias['@tanstack/devtools-ui'] = false
    }
    return config
  },
}

const plugins = [withNx]

module.exports = composePlugins(...plugins)(nextConfig)
