// @ts-check

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Workspace-либы вне корня приложения — без withNx (удалён, deprecated) webpack их не
  // транспилирует сам. См. .claude/docs/nextjs-nx-composeplugins-migration.md
  transpilePackages: [
    '@letar/analytics',
    '@letar/api-server',
    '@letar/auth',
    '@letar/env-load',
    '@letar/glitchtip',
    '@letar/hooks',
    '@letar/infra-config',
    '@letar/query-provider',
  ],
  // Enable standalone output for Docker deployment
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: './tsconfig.json',
  },
  experimental: {
    // Tree-shaking тяжёлых пакетов (recharts/react-icons перенесены из мёртвого next.config.ts)
    optimizePackageImports: ['@chakra-ui/react', 'recharts', 'react-icons'],
  },
  // External packages that should not be bundled (native Node.js modules)
  serverExternalPackages: ['dockerode', 'docker-modem', 'ssh2', 'systeminformation', 'simple-git'],

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
