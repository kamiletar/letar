/**
 * CJS-совместимый wrapper для PrismaClient svoichuzhie (Prisma 7+)
 *
 * Prisma 7 генерирует ESM-only client.ts (import.meta.url).
 * Playwright транспилирует TS в CJS → import.meta.url ломается.
 * Используем internal/class.ts, который не содержит import.meta.
 */
const path = require('path')

const generatedDir = path.resolve(__dirname, '../../../svoichuzhie/src/generated/prisma')

const originalDirname = globalThis['__dirname']
globalThis['__dirname'] = generatedDir

const internalClass = require(path.join(generatedDir, 'internal', 'class'))
const PrismaClient = internalClass.getPrismaClientClass()

globalThis['__dirname'] = originalDirname

const enums = require(path.join(generatedDir, 'enums'))

/** Создаёт PrismaClient с PrismaPg adapter (Prisma 7 requirement) */
function createPrismaClient() {
  const { PrismaPg } = require('@prisma/adapter-pg')
  const connectionString = process.env['DATABASE_URL'] || ''
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

module.exports = {
  PrismaClient,
  createPrismaClient,
  ...enums,
}
