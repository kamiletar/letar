// @ts-check

const path = require('path')
const { composePlugins, withNx } = require('@nx/next')
const createNextIntlPlugin = require('next-intl/plugin')

// next-intl плагин с путём к конфигурации
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 */
const nextConfig = {
  // Standalone output для Docker production сборки
  output: 'standalone',
  // Корень монорепо — нужен для правильного трейсинга зависимостей
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // Включаем @swc/helpers в standalone (не попадает автоматически)
  outputFileTracingIncludes: {
    '/**/*': ['./node_modules/@swc/helpers/**/*'],
  },
  nx: {
    svgr: false,
  },
  // Транспиляция workspace библиотек для корректного резолва peerDependencies
  transpilePackages: [
    '@letar/forms',
    '@letar/chakra-provider',
    '@letar/analytics',
    '@letar/format-utils',
    '@letar/admin-ui',
  ],
  // Оптимизация изображений
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
  // Оптимизация bundle Chakra UI (рекомендация из документации)
  experimental: {
    optimizePackageImports: ['@chakra-ui/react'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

// Компонуем плагины: Nx + next-intl
module.exports = composePlugins(withNx, withNextIntl)(nextConfig)
