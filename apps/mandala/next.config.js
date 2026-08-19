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
  // @tanstack/devtools-ui@0.7.0+ (транзитивная зависимость @tanstack/react-devtools через
  // @letar/query-provider) импортирует именованный `use` из solid-js/web. webpack резолвит
  // условие экспорта `node` для СЕРВЕРНОЙ половины графа сборки, а под этим условием
  // solid-js/web (dist/server.js) `use` вообще не экспортирует — падает "Attempted import error:
  // 'use' is not exported from solid-js/web", причём в dev-сборке тоже, не только в проде
  // (next/dynamic({ ssr: false }) не убирает модуль из графа компиляции webpack ни для client,
  // ни для server половины). Алиас на false нужен для server-половины всегда, для client — только
  // в production. См. подробный разбор в apps/driving-school/next.config.js.
  webpack: (config, { dev, isServer }) => {
    if (isServer || !dev) {
      config.resolve.alias['@tanstack/devtools-ui'] = false
    }
    return config
  },
}

// Компонуем плагины: Nx + next-intl
module.exports = composePlugins(withNx, withNextIntl)(nextConfig)
