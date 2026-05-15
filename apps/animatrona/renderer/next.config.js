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

  // Транспиляция shared библиотек из монорепо + Prisma libsql адаптер (принудительный бандлинг)
  transpilePackages: [
    '@letar/ui',
    '@letar/chakra-provider',
    '@letar/forms',
    '@letar/query-provider',
    '@letar/animatrona-types',
    '@letar/animatrona-utils',
    '@letar/animatrona-ui',
    // Принудительно бандлим вместо экстернализации — иначе turbopack создаёт внешние модули
    // с битыми ESM зависимостями (node-fetch → fetch-blob)
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

  // Turbopack конфигурация
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
}

module.exports = withBundleAnalyzer(nextConfig)
