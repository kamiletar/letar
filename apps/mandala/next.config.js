// @ts-check

const path = require('path')
const createNextIntlPlugin = require('next-intl/plugin')

// next-intl плагин с путём к конфигурации
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Клиентские sourcemaps в проде — без них стектрейсы в GlitchTip приходят из минифицированного
  // кода. .map-файлы не публикуются: сборка удаляет их после загрузки в GlitchTip
  // (см. корневой scripts/glitchtip-upload-sourcemaps.mjs, PLAN-INFRA-4.md §70 п.6).
  productionBrowserSourceMaps: true,
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
  // uploads/ — Docker volume в проде (см. docker-compose.production.yml), содержимое
  // перекрывается монтированием в рантайме. Без исключения трейсер всё равно копирует реальные
  // загруженные файлы внутрь .next/standalone — раздувая образ впустую. См.
  // .claude/docs/nextjs-dynamic-fs-path-tracing.md
  outputFileTracingExcludes: {
    '/**/*': ['./uploads/**'],
  },
  // Workspace-либы вне корня приложения — без withNx (удалён, deprecated) webpack их не
  // транспилирует сам. См. .claude/docs/nextjs-nx-composeplugins-migration.md
  transpilePackages: [
    '@letar/admin-ui',
    '@letar/analytics',
    '@letar/auth',
    '@letar/chakra-provider',
    '@letar/consent',
    '@letar/email',
    '@letar/env-load',
    '@letar/format-utils',
    '@letar/forms',
    '@letar/forms-core',
    '@letar/forms-react',
    '@letar/glitchtip',
    '@letar/hooks',
    '@letar/i18n-proxy',
    '@letar/image-upload',
    '@letar/pin-auth',
    '@letar/query-provider',
    '@letar/seo',
    '@letar/ui',
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

module.exports = withNextIntl(nextConfig)
