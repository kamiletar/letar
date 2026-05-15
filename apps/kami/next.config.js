// @ts-check

const { composePlugins, withNx } = require('@nx/next')
const createNextIntlPlugin = require('next-intl/plugin')

// Плагин next-intl для интернационализации
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 */
const nextConfig = {
  output: 'standalone', // Для Docker деплоя
  trailingSlash: true, // Всегда добавляет конечный слеш в URL
  skipTrailingSlashRedirect: true, // Отключает 308 редирект для POST запросов (Better Auth)
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json',
  },
  // Turbopack — используется для Next.js 16 production build
  turbopack: {},
  // Лимит body для proxy (для загрузки аудиофайлов до 100MB)
  experimental: {
    proxyClientMaxBodySize: '100mb',
  },
  // Транспиляция workspace библиотек
  transpilePackages: ['@letar/analytics', '@letar/auth', '@letar/chakra-provider', '@letar/yandex-metrika', '@letar/email'],
}

// Базовые плагины
const plugins = [withNx, withNextIntl]

module.exports = composePlugins(...plugins)(nextConfig)
