// @ts-check

const { composePlugins, withNx } = require('@nx/next')

// Bundle analyzer для анализа размера бандла
// Запуск: ANALYZE=true nx build form-develop-app
// Требует: bun add -D @next/bundle-analyzer
let withBundleAnalyzer = (config) => config
try {
  withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
  })
} catch {
  // Bundle analyzer не установлен — пропускаем
}

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 */
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},
}

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
  withBundleAnalyzer,
]

module.exports = composePlugins(...plugins)(nextConfig)
