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
}

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
]

module.exports = composePlugins(...plugins)(nextConfig)
