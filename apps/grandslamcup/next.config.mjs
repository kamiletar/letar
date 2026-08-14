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

const withMDX = createMDX({
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
})

// Serwist внутри compose — чтобы MDX loader сохранялся
const plugins = [withNx, withMDX, withSerwist]

export default composePlugins(...plugins)(nextConfig)
