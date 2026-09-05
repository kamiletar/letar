import { createRequire } from 'node:module'

import createMDX from '@next/mdx'
import withSerwistInit from '@serwist/next'

const require = createRequire(import.meta.url)

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
  // next/og (opengraph-image.tsx) и src/lib/telegram/poster/render.ts используют satori →
  // harfbuzzjs для text shaping. Emscripten-обвязка harfbuzzjs (hbjs.js) ищет hb.wasm рядом со
  // своим бандлом ПО СТРОКОВОМУ ПУТИ во время выполнения — webpack не умеет статически
  // проанализировать такой паттерн и не копирует бинарник в .next/server/chunks, поэтому чанк
  // компилируется, но не эмиттится: "failed to asynchronously prepare wasm: ENOENT
  // .next/server/chunks/hb.wasm". Воспроизводится детерминированно даже в изолированной сборке
  // без параллельных билдов — не гонка за общий node_modules. serverExternalPackages сам по
  // себе не чинит (next/og тянет свою копию satori внутри next/dist/compiled), нужна ручная
  // копия wasm-файла в чанки после сборки (см. webpack() ниже).
  // sharp грузит libvips-cpp.so через dlopen(), трейсер это не ловит — без явного
  // include контейнер падает с ERR_DLOPEN_FAILED (инцидент mandala 2026-07-12).
  // Глоб без хардкода версии — переживёт апдейт sharp/bun.lock.
  outputFileTracingIncludes: {
    '/**/*': ['../../node_modules/.bun/@img+sharp-libvips-*/**/*.so*'],
  },
  // uploads/ — Docker volume в проде (см. docker-compose.production.yml), содержимое
  // перекрывается монтированием в рантайме. Без исключения трейсер всё равно копирует реальные
  // загруженные файлы внутрь .next/standalone — раздувая образ впустую. См.
  // .claude/docs/nextjs-dynamic-fs-path-tracing.md
  outputFileTracingExcludes: {
    '/**/*': ['./uploads/**'],
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
    // См. комментарий выше про hb.wasm: копируем бинарник harfbuzzjs в .next/server/chunks
    // после сборки сервера — webpack эмиттит JS-чанк, но не сам wasm (runtime-путь, не
    // статический import).
    if (isServer) {
      config.plugins.push({
        apply(compiler) {
          compiler.hooks.afterEmit.tapPromise('CopyHarfbuzzWasm', async () => {
            const { copyFile } = await import('node:fs/promises')
            const path = await import('node:path')
            // harfbuzzjs — транзитивная зависимость satori (не своя dependency приложения),
            // require.resolve с paths от satori находит её в изолированном дереве bun.
            const hbWasmSrc = require.resolve('harfbuzzjs/hb.wasm', {
              paths: [path.default.dirname(require.resolve('satori/package.json'))],
            })
            // outputPath уже указывает на .../server/chunks для основного серверного
            // компилятора, но на другой путь для edge/middleware-прохода — добавляем
            // 'chunks' только если его там ещё нет, и не падаем, если целевой каталог
            // (edge-рантайм и т.п.) вообще не существует.
            const outputPath = path.default.basename(compiler.outputPath) === 'chunks'
              ? compiler.outputPath
              : path.default.join(compiler.outputPath, 'chunks')
            const dest = path.default.join(outputPath, 'hb.wasm')
            try {
              await copyFile(hbWasmSrc, dest)
            } catch (err) {
              if (err.code !== 'ENOENT') throw err
            }
          })
        },
      })
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
