/**
 * Фабрика CJS-совместимого PrismaClient-обёртки для e2e-хелперов (Prisma 7+ с driver adapter).
 *
 * Prisma 7 генерирует ESM-only client.ts (import.meta.url), а Playwright транспилирует TS
 * в CJS — import.meta.url ломается. Обходим: устанавливаем globalThis.__dirname (как делает
 * client.ts через import.meta.url) и грузим internal/class.ts напрямую — он не использует
 * import.meta и безопасен для CJS.
 *
 * Вынесено из apps/driving-school-e2e/src/helpers/prisma-cjs-wrapper.js — почти дословный
 * дубликат появился второй раз в apps/auth-hub-e2e (2026-07-30), разница только в пути
 * к generated-клиенту конкретного приложения.
 *
 * Плоский .js-файл, не .ts — грузится через require() в обход TS/ESM-пайплайна, поэтому
 * намеренно не экспортируется через src/index.ts (там ESM-поверхность лба).
 * Использование в apps/<app>-e2e/src/helpers/prisma-cjs-wrapper.js:
 *
 *   const path = require('path')
 *   const { createPrismaCjsWrapper } = require('@letar/e2e-testing/prisma-cjs-wrapper')
 *   const { PrismaClient, createPrismaClient } = createPrismaCjsWrapper(
 *     path.resolve(__dirname, '../../../<app>/src/generated/prisma')
 *   )
 *   module.exports = { PrismaClient, createPrismaClient }
 */
const path = require('path')

/**
 * @param {string} generatedDir Абсолютный путь к каталогу generated/prisma конкретного приложения.
 * @returns {{ PrismaClient: unknown, createPrismaClient: (connectionString?: string) => unknown }}
 */
function createPrismaCjsWrapper(generatedDir) {
  const originalDirname = globalThis['__dirname']
  globalThis['__dirname'] = generatedDir

  // internal/class.ts НЕ использует import.meta — безопасен для CJS
  const internalClass = require(path.join(generatedDir, 'internal', 'class'))
  const PrismaClient = internalClass.getPrismaClientClass()

  globalThis['__dirname'] = originalDirname

  /** Создаёт PrismaClient с PrismaPg adapter (Prisma 7 requirement) */
  function createPrismaClient(connectionString) {
    const { PrismaPg } = require('@prisma/adapter-pg')
    const adapter = new PrismaPg({ connectionString: connectionString || process.env['DATABASE_URL'] || '' })
    return new PrismaClient({ adapter })
  }

  return { PrismaClient, createPrismaClient }
}

module.exports = { createPrismaCjsWrapper }
