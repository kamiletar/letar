/**
 * Prisma Client для Main Process
 *
 * Singleton для работы с БД из main process Electron. Путь к БД дублирует
 * логику main/services/database.ts (getDatabasePath) — оба файла не могут
 * импортировать друг друга напрямую из-за порядка инициализации миграций.
 */

import { app } from 'electron'
import path from 'path'

import { PrismaLibSql } from '@prisma/adapter-libsql'

import { PrismaClient } from '../../renderer/src/generated/prisma'

const isProd = app.isPackaged || process.env.NODE_ENV === 'production'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getDatabasePath(): string {
  if (isProd) {
    const userDataPath = app.getPath('userData')
    return path.join(userDataPath, 'data', 'app.db')
  }
  return path.join(__dirname, '..', '..', 'prisma', 'data', 'app.db')
}

function getDatabaseUrl(): string {
  const dbPath = getDatabasePath()
  return `file:${dbPath.replace(/\\/g, '/')}`
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaLibSql({ url: getDatabaseUrl() })
  return new PrismaClient({ log: ['error', 'warn'], adapter })
}

/**
 * ВАЖНО: вызывать только после applyMigrations() — PRAGMA journal_mode = WAL
 * создаёт WAL-файл, несовместимый после перезаписи БД через sql.js.
 */
export async function initializePrismaDb(): Promise<void> {
  const client = getPrismaClient()
  await client.$executeRawUnsafe('PRAGMA journal_mode = WAL').catch(() => {})
  await client.$executeRawUnsafe('PRAGMA busy_timeout = 15000').catch(() => {})
  await client.$executeRawUnsafe('PRAGMA synchronous = NORMAL').catch(() => {})
}

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }
  return globalForPrisma.prisma
}

export async function closePrismaClient(): Promise<void> {
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect()
    globalForPrisma.prisma = undefined
  }
}

export { getDatabasePath }
