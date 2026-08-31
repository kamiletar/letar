// @ts-check

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
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Workspace-либы вне корня приложения — без withNx (удалён, deprecated) webpack их не
  // транспилирует сам. См. .claude/docs/nextjs-nx-composeplugins-migration.md
  transpilePackages: [
    '@letar/chakra-provider',
    '@letar/env-load',
    '@letar/format-utils',
    '@letar/forms',
    '@letar/forms-core',
    '@letar/forms-react',
    '@letar/query-provider',
    '@letar/zenstack-form-plugin',
  ],
}

module.exports = withBundleAnalyzer(nextConfig)
