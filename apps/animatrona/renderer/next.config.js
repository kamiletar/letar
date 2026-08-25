const path = require('path')
const fs = require('fs')
const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: process.env.ANALYZE === 'true' })

// Определяем outputFileTracingRoot в зависимости от окружения
// Монорепо lena: __dirname = apps/animatrona/renderer → ../../../
// Standalone: не используем outputFileTracingRoot (не нужен для трейсинга)
const monorepoRoot = path.join(__dirname, '../../../')
const standaloneRoot = path.join(__dirname, '..')
// Проверяем project.json (Nx конфиг) в корне animatrona
// Если есть project.json → монорепо (Nx workspace), если нет → standalone (project.json исключён из rsync)
const isMonorepo = fs.existsSync(path.join(standaloneRoot, 'project.json'))

// Debug вывод для CI
console.log('[next.config.js] ==== DEBUG START ====')
console.log('[next.config.js] __dirname:', __dirname)
console.log('[next.config.js] process.cwd():', process.cwd())
console.log('[next.config.js] standaloneRoot:', standaloneRoot)
console.log('[next.config.js] monorepoRoot:', monorepoRoot)
console.log('[next.config.js] isMonorepo:', isMonorepo)
console.log('[next.config.js] turbopack.root будет:', standaloneRoot)

// Проверяем существование next/package.json по разным путям
const possibleNextPaths = [
  path.join(standaloneRoot, 'node_modules', 'next', 'package.json'), // animatrona-build/node_modules/next/package.json
  path.join(__dirname, 'node_modules', 'next', 'package.json'), // renderer/node_modules/next/package.json
  path.join(monorepoRoot, 'node_modules', 'next', 'package.json'), // lena/node_modules/next/package.json
]

console.log('[next.config.js] Проверка next/package.json:')
possibleNextPaths.forEach((p) => {
  const exists = fs.existsSync(p)
  console.log(`  ${exists ? '✓' : '✗'} ${p}`)
})
console.log('[next.config.js] ==== DEBUG END ====')
console.log()

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone для Electron с HTTP сервером
  output: 'standalone',

  // Корень проекта — только для монорепо (нужен для трейсинга @letar/* пакетов)
  // Для standalone не используем (вызывает проблемы с project directory detection)
  ...(isMonorepo ? { outputFileTracingRoot: monorepoRoot } : {}),

  // Оптимизация изображений через API route /api/image
  images: {
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
  },

  // Принудительно бандлим вместо экстернализации — иначе turbopack создаёт внешние модули
  // с битыми ESM зависимостями (node-fetch → fetch-blob).
  // Библиотеки @letar/* сюда не входят: они резолвятся в исходники под libs/, вне node_modules.
  transpilePackages: [
    '@libsql/client',
    '@libsql/core',
    '@libsql/hrana-client',
    '@prisma/adapter-libsql',
    '@prisma/driver-adapter-utils',
    '@prisma/debug',
  ],

  // TypeScript проверка
  // TODO: вернуть false после исправления form-components/field-file-upload типов
  typescript: {
    ignoreBuildErrors: true,
  },

  // Исключаем пакеты из серверного бандла (загружаются из node_modules в runtime)
  serverExternalPackages: [
    'fts5-sql-bundle',
    'kysely-wasm',
    '@zenstackhq/orm',
    '@zenstackhq/plugin-policy',
    '@zenstackhq/server',
    // libsql — native SQLite binding (N-API), единственный модуль требующий экстернализации
    'libsql',
  ],

  // Разрешаем cross-origin запросы в dev режиме (для Electron)
  allowedDevOrigins: ['http://127.0.0.1:3010', 'http://localhost:3010'],

  // Включаем ZenStack и Prisma файлы в standalone
  // Пути относительны к outputFileTracingRoot (корень монорепо)
  outputFileTracingIncludes: {
    '/api/**/*': [
      // ZenStack ORM schema (импортируется из enhance.ts как '../../../schema')
      './apps/animatrona/schema.ts',
      // fts5-sql-bundle для ZenStack ORM с FTS5 поддержкой
      './node_modules/fts5-sql-bundle/**/*',
      // ZenStack ORM и зависимости
      './node_modules/@zenstackhq/**/*',
      './node_modules/kysely/**/*',
      './node_modules/kysely-wasm/**/*',
      // libsql — native SQLite binding для Prisma 7 Driver Adapter
      './node_modules/libsql/**/*',
      // Prisma client (fallback)
      './apps/animatrona/renderer/src/generated/prisma/**/*',
      // @lena монорепо библиотеки
      './libs/ui/**/*',
      './libs/forms/**/*',
      './libs/query-provider/**/*',
      './libs/chakra-provider/**/*',
    ],
  },

  // Turbopack конфигурация (используется только если dev/build запущены без --webpack)
  turbopack: {
    // Указываем на корень где находится package.json и node_modules/
    // Это standaloneRoot (один уровень выше renderer/)
    // - Монорепо: apps/animatrona/
    // - Standalone: animatrona-build/
    root: standaloneRoot,
    // Заменяем node-fetch/cross-fetch на встроенный fetch (Node.js 22+ / Electron 40)
    // Это убирает цепочку ESM полифиллов: fetch-blob, web-streams-polyfill, data-uri-to-buffer, etc.
    resolveAlias: {
      'cross-fetch': './src/lib/fetch-shim.ts',
      'node-fetch': './src/lib/fetch-shim.ts',
      '@letar/animatrona-ui': '../../../libs/animatrona-ui/src/index.ts',
    },
  },

  // Webpack-эквивалент turbopack.resolveAlias — dev/build запускаются с --webpack
  // (см. nextjs16-turbopack-default-emotion-hydration.md, Chakra <Global> + Turbopack default = hydration mismatch)
  webpack: (config, { dev, isServer }) => {
    config.resolve.alias['cross-fetch'] = path.resolve(__dirname, 'src/lib/fetch-shim.ts')
    config.resolve.alias['node-fetch'] = path.resolve(__dirname, 'src/lib/fetch-shim.ts')
    config.resolve.alias['@letar/animatrona-ui'] = path.resolve(
      __dirname,
      '../../../libs/animatrona-ui/src/index.ts',
    )
    // @tanstack/devtools-ui@0.7.0+ (транзитивная зависимость @tanstack/react-devtools через
    // @letar/query-provider) импортирует именованный `use` из solid-js/web. webpack резолвит
    // условие экспорта `node` для СЕРВЕРНОЙ половины графа сборки, а под этим условием
    // solid-js/web (dist/server.js) `use` не экспортирует — падает "Attempted import error:
    // 'use' is not exported from solid-js/web". next/dynamic({ ssr: false }) не убирает модуль
    // из графа компиляции webpack ни для client, ни для server половины (PLAN.md §51,
    // driving-school/mandala/dashboard/animatrona-tracker/grandslamcup — тот же паттерн).
    if (isServer || !dev) {
      config.resolve.alias['@tanstack/devtools-ui'] = false
    }
    // libsql (native N-API биндинг, единственный пакет в serverExternalPackages выше) сам
    // резолвит свои опциональные @libsql/*-платформенные пакеты через require.context
    // (sync ^\.\/.*$) — это relative require внутри самого libsql, обычный
    // serverExternalPackages/транзитивный webpack-external его не ловит (матчится по
    // спецификатору require(), а не по факту прохождения через транспилируемый @libsql/client).
    // Итог — webpack пытается заглянуть внутрь libsql/index.js и падает на .node/.d.ts/README.
    // Форсируем externals для 'libsql' явно, до дефолтной логики Next — тогда require('libsql')
    // остаётся require() в собранном бандле и резолвится реальным Node в standalone-выводе.
    if (isServer) {
      // Bare `commonjs libsql` не резолвится в рантайме: bun isolated-инсталл не хостит libsql
      // в корневом node_modules (только в изолированном сторе .bun рядом с @libsql/client,
      // который его требует) — резолвим абсолютный путь тем же алгоритмом, что использует сам
      // @libsql/client, и подставляем его как request внешнего require().
      const libsqlAbsolutePath = require.resolve('libsql', {
        paths: [path.dirname(require.resolve('@libsql/client'))],
      })
      const nextExternals = Array.isArray(config.externals)
        ? config.externals
        : config.externals
        ? [config.externals]
        : []
      config.externals = [
        ({ request }, callback) => {
          if (request === 'libsql') { return callback(null, `commonjs ${libsqlAbsolutePath}`) }
          callback()
        },
        ...nextExternals,
      ]
    }
    return config
  },
}

module.exports = withBundleAnalyzer(nextConfig)
