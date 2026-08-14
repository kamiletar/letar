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
  // Включаем @swc/helpers в standalone (не попадает автоматически).
  // libvips-cpp.so тоже нужен явно: sharp грузит его через dlopen(), а не require(),
  // трейсер такие динамические загрузки не видит (инцидент 2026-07-12, 500 на проде).
  // Глоб без хардкода версии — переживёт апдейт sharp/bun.lock.
  outputFileTracingIncludes: {
    '/**/*': ['../../node_modules/@swc/helpers/**/*', '../../node_modules/.bun/@img+sharp-libvips-*/**/*.so*'],
  },
  nx: {
    svgr: false,
  },
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
  // @tanstack/devtools-ui (транзитивная зависимость @tanstack/react-devtools через
  // @letar/query-provider) тянет solid-js. webpack не может статически определить именованный
  // экспорт `use` при CJS/ESM интеропе solid-js/web — падает сборка даже когда devtools
  // подключены через next/dynamic({ ssr: false }) и рантайм-флагом выключены в production
  // (next/dynamic не убирает модуль из графа компиляции webpack). Алиас на false в production
  // полностью убирает пакет из графа. См. тот же фикс в apps/driving-school/next.config.js.
  webpack: (config, { dev }) => {
    if (!dev) {
      config.resolve.alias['@tanstack/devtools-ui'] = false
    }
    return config
  },
}

// Компонуем плагины: Nx + next-intl
module.exports = composePlugins(withNx, withNextIntl)(nextConfig)
