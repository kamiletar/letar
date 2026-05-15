/**
 * Prisma Client для Main Process
 *
 * Singleton для работы с БД из main process Electron.
 * Использует тот же generated client что и renderer.
 */

import { app } from 'electron'
import path from 'path'

import { PrismaLibSql } from '@prisma/adapter-libsql'

import { createModuleLogger } from './logger'

import { PrismaClient } from '../../renderer/src/generated/prisma'

const log = createModuleLogger('Db')

// В packaged Electron app.isPackaged === true
const isProd = app.isPackaged || process.env.NODE_ENV === 'production'

/**
 * Singleton для Prisma Client
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Получить путь к базе данных SQLite
 */
function getDatabasePath(): string {
  if (isProd) {
    const userDataPath = app.getPath('userData')
    return path.join(userDataPath, 'data', 'app.db')
  }
  // В development используем локальный путь
  return path.join(__dirname, '..', '..', 'prisma', 'data', 'app.db')
}

/**
 * Получить URL базы данных для libsql
 */
function getDatabaseUrl(): string {
  const dbPath = getDatabasePath()
  // Нормализуем backslashes для Windows
  return `file:${dbPath.replace(/\\/g, '/')}`
}

/**
 * Создать Prisma Client и настроить SQLite для конкурентного доступа
 */
function createPrismaClient(): PrismaClient {
  const databaseUrl = getDatabaseUrl()

  log.info('Connecting to database', { url: databaseUrl })

  // Prisma 7: используем Driver Adapter (libsql для SQLite без electron-rebuild)
  const adapter = new PrismaLibSql({ url: databaseUrl })

  const client = new PrismaClient({
    log: ['error', 'warn'],
    adapter,
  })

  // ВАЖНО: PRAGMAs НЕ выполняются здесь — PrismaClient создаётся при импорте модуля,
  // ДО применения sql.js миграций. Выполнение PRAGMA journal_mode = WAL создаёт WAL-файл,
  // который становится несовместим после fs.writeFileSync() в applyPrismaMigrations().
  // PRAGMAs выполняются через initializePrismaDb() после завершения миграций.

  return client
}

/**
 * Инициализация SQLite PRAGMAs для конкурентного доступа
 *
 * ВАЖНО: Вызывать ТОЛЬКО после initializeDatabase() (sql.js миграции),
 * иначе WAL-файл будет создан до перезаписи файла БД и вызовет SQLITE_CORRUPT.
 */
export async function initializePrismaDb(): Promise<void> {
  const client = getPrismaClient()

  try {
    await client.$executeRawUnsafe('PRAGMA journal_mode = WAL')
    log.info('SQLite: WAL mode включён')
  } catch (e: unknown) {
    log.warn('SQLite: не удалось включить WAL', { error: String(e) })
  }

  try {
    await client.$executeRawUnsafe('PRAGMA busy_timeout = 15000')
    log.info('SQLite: busy_timeout = 15s')
  } catch (e: unknown) {
    log.warn('SQLite: не удалось установить busy_timeout', { error: String(e) })
  }

  try {
    await client.$executeRawUnsafe('PRAGMA synchronous = NORMAL')
  } catch (e: unknown) {
    log.warn('SQLite: не удалось установить synchronous', { error: String(e) })
  }
}

/**
 * Получить singleton Prisma Client
 */
export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

/**
 * Закрыть соединение с БД (при выходе из приложения)
 */
export async function closePrismaClient(): Promise<void> {
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect()
    globalForPrisma.prisma = undefined
  }
}

/**
 * Prisma Client singleton
 */
export const prisma = getPrismaClient()
