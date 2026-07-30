/**
 * CJS-совместимый wrapper для PrismaClient auth-hub (Prisma 7+ с driver adapter)
 *
 * Копия паттерна из apps/driving-school-e2e/src/helpers/prisma-cjs-wrapper.js,
 * адаптированная под собственный generated-клиент auth-hub (apps/auth-hub/src/generated/prisma) —
 * в отличие от driving-school, у auth-hub нет отдельной shared *-db библиотеки.
 *
 * Prisma 7 требует:
 * 1. driver adapter (PrismaPg) для подключения к БД
 * 2. client.ts использует import.meta.url (ESM-only)
 *
 * Обходим: устанавливаем globalThis.__dirname + загружаем через internal/class.ts
 */
const path = require('path')

const generatedDir = path.resolve(__dirname, '../../../auth-hub/src/generated/prisma')

// Устанавливаем __dirname как делает client.ts через import.meta.url
const originalDirname = globalThis['__dirname']
globalThis['__dirname'] = generatedDir

// internal/class.ts НЕ использует import.meta — безопасен для CJS
const internalClass = require(path.join(generatedDir, 'internal', 'class'))
const PrismaClient = internalClass.getPrismaClientClass()

// Восстанавливаем __dirname
globalThis['__dirname'] = originalDirname

/**
 * Создаёт PrismaClient с PrismaPg adapter (Prisma 7 requirement)
 */
function createPrismaClient() {
  const { PrismaPg } = require('@prisma/adapter-pg')
  const connectionString = process.env['DATABASE_URL'] || ''
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}

module.exports = {
  PrismaClient,
  createPrismaClient,
}
