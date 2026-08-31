// @ts-check

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Workspace-либы вне корня приложения — без withNx (удалён, deprecated) webpack их не
  // транспилирует сам. См. .claude/docs/nextjs-nx-composeplugins-migration.md
  transpilePackages: [
    '@letar/analytics',
    '@letar/animatrona-franchise-graph',
    '@letar/animatrona-types',
    '@letar/animatrona-ui',
    '@letar/animatrona-utils',
    '@letar/auth',
    '@letar/chakra-provider',
    '@letar/consent',
    '@letar/env-load',
    '@letar/forms',
    '@letar/forms-core',
    '@letar/forms-react',
    '@letar/glitchtip',
    '@letar/query-provider',
    '@letar/redis-client',
    '@letar/ui',
    '@letar/validation-utils',
    '@letar/video-player-core',
    '@letar/video-player-react',
  ],
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

module.exports = nextConfig
