/**
 * API Key Authentication для публикации из Animatrona
 *
 * API ключи хранятся как SHA256 хэши. Оригинальный ключ показывается
 * пользователю только один раз при создании.
 */

import { createHash } from 'crypto'
import type { NextRequest } from 'next/server'
import { prisma } from './db'

/**
 * Хэширует API ключ для хранения/сравнения
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Генерирует новый API ключ
 * Формат: at_<32 символа hex>
 */
export function generateApiKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `at_${hex}`
}

/**
 * Верифицирует API ключ из заголовка Authorization
 *
 * @param req - NextRequest с заголовком Authorization: Bearer <key>
 * @returns User если ключ валидный, null иначе
 *
 * @example
 * ```ts
 * const user = await verifyApiKey(request)
 * if (!user) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 * }
 * ```
 */
export async function verifyApiKey(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const key = authHeader.slice(7) // Убираем "Bearer "
  if (!key || !key.startsWith('at_')) {
    return null
  }

  const keyHash = hashApiKey(key)

  const apiKey = await prisma.apiKey.findUnique({
    where: { key: keyHash },
    include: { user: true },
  })

  if (!apiKey) {
    return null
  }

  // Обновляем lastUsedAt (fire-and-forget, не ждём результат)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Игнорируем ошибки обновления lastUsedAt
    })

  return apiKey.user
}
