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
  // sharp грузит libvips-cpp.so через dlopen(), трейсер это не ловит — без явного
  // include контейнер падает с ERR_DLOPEN_FAILED (инцидент mandala 2026-07-12).
  // Глоб без хардкода версии — переживёт апдейт sharp/bun.lock.
  outputFileTracingIncludes: {
    '/**/*': ['../../node_modules/.bun/@img+sharp-libvips-*/**/*.so*'],
  },
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json',
  },
  // Лимит body для proxy (для загрузки файлов до 500MB)
  experimental: {
    proxyClientMaxBodySize: '500mb',
  },
}

// Базовые плагины
const plugins = [withNx, withNextIntl]

module.exports = composePlugins(...plugins)(nextConfig)
