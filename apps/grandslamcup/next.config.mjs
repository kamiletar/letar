import createMDX from '@next/mdx'
import withSerwistInit from '@serwist/next'

// register: false — критично. По умолчанию Serwist инжектит собственный скрипт, который
// регистрирует /sw.js на КАЖДОЙ странице безусловно, в обход согласия пользователя
// (`useOfflineConsent` в src/app/_components/service-worker-registration.tsx). В dev не
// воспроизводится: там Serwist отключён. Тот же разбор — apps/archetest/next.config.mjs
// (2026-07-28) и apps/studio/next.config.mjs (2026-09-03, замер на прод-сборке).
const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  register: false,
  disable: process.env.NODE_ENV === 'development',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Клиентские sourcemaps в проде — без них стектрейсы в GlitchTip приходят из минифицированного
  // кода. .map-файлы не публикуются: сборка удаляет их после загрузки в GlitchTip
  // (см. корневой scripts/glitchtip-upload-sourcemaps.mjs, PLAN-INFRA-4.md §70 п.6).
  productionBrowserSourceMaps: true,
  output: 'standalone',
  // sharp грузит libvips-cpp.so через dlopen(), трейсер это не ловит — без явного
  // include контейнер падает с ERR_DLOPEN_FAILED (инцидент mandala 2026-07-12).
  // Глоб без хардкода версии — переживёт апдейт sharp/bun.lock.
  outputFileTracingIncludes: {
    '/**/*': ['../../node_modules/.bun/@img+sharp-libvips-*/**/*.so*'],
  },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  // Пустой turbopack — подавляет ошибку при наличии webpack config от Serwist
  turbopack: {},
  // Workspace-либы вне корня приложения — без withNx (удалён, deprecated) webpack их не
  // транспилирует сам. См. .claude/docs/nextjs-nx-composeplugins-migration.md
  transpilePackages: [
    '@letar/analytics',
    '@letar/auth',
    '@letar/chakra-provider',
    '@letar/consent',
    '@letar/env-load',
    '@letar/forms',
    '@letar/forms-core',
    '@letar/forms-react',
    '@letar/glitchtip',
    '@letar/hooks',
    '@letar/image-upload',
    '@letar/query-provider',
    '@letar/seed-utils',
    '@letar/seo',
    '@letar/ui',
    '@letar/upload-validation',
  ],
  // Typecheck отдельно через nx typecheck:tsgo — экономит RAM при билде на серверах
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

const withMDX = createMDX({
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
})

// Serwist поверх MDX — чтобы MDX loader сохранялся
export default withSerwist(withMDX(nextConfig))
