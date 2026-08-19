// @ts-check

const { composePlugins, withNx } = require('@nx/next')

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 */
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {
    svgr: false,
  },
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

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
]

module.exports = composePlugins(...plugins)(nextConfig)
