/**
 * Хелперы для работы с API-ключами в E2E тестах
 *
 * ВАЖНО: Используем динамический импорт PrismaClient,
 * чтобы избежать проблем с ESM/CommonJS
 */

type PrismaClientType = import('@prisma/client').PrismaClient

let prisma: PrismaClientType | null = null

/**
 * Получить инстанс Prisma Client
 */
async function getPrisma(): Promise<PrismaClientType> {
  if (!prisma) {
    // CJS wrapper: обходит ESM-only client.ts, создаёт PrismaClient с PrismaPg adapter
    const { createPrismaClient } = require('./prisma-cjs-wrapper')
    prisma = createPrismaClient()
  }
  return prisma
}

/**
 * Создаёт тестовый API-ключ для школы
 */
export async function createTestApiKey(
  schoolId: string,
  name = 'Test API Key'
): Promise<{ apiKey: string; apiKeyId: string }> {
  const db = await getPrisma()

  // Генерируем API-ключ (префикс + 32 байта в hex)
  const randomBytes = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')
  const apiKey = `ds_live_${randomBytes}`

  // Хешируем ключ для хранения в БД
  const keyHash = await hashApiKey(apiKey)

  // Создаём запись в БД
  const record = await db.apiKey.create({
    data: {
      organizationId: schoolId,
      name,
      keyHash,
      keyPrefix: `ds_live_${randomBytes.substring(0, 8)}...`,
      status: 'ACTIVE',
      createdById: 'test-user', // В тестах используем заглушку
    },
  })

  return {
    apiKey,
    apiKeyId: record.id,
  }
}

/**
 * Удаляет тестовый API-ключ
 */
export async function deleteTestApiKey(apiKeyId: string): Promise<void> {
  const db = await getPrisma()
  await db.apiKey.delete({
    where: { id: apiKeyId },
  })
}

/**
 * Хеширует API-ключ через SHA-256
 */
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
