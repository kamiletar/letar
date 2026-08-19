import createMDX from '@next/mdx'
import { composePlugins, withNx } from '@nx/next'
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig = {
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
  nx: {},
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

// Serwist внутри compose — чтобы MDX loader сохранялся
const plugins = [withNx, withMDX, withSerwist]

export default composePlugins(...plugins)(nextConfig)
