'use server'

/**
 * Server Actions для управления API ключами
 */

import { generateApiKey, hashApiKey } from '@/lib/api-auth'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

const CreateKeySchema = z
  .object({
    name: z.string().min(1, 'Название обязательно').max(100, 'Максимум 100 символов'),
  })
  .strip()

/**
 * Создать новый API ключ
 * Возвращает ПОЛНЫЙ ключ только один раз — при создании
 */
export async function createApiKey(
  formData: FormData
): Promise<{ success: true; key: string; id: string } | { success: false; error: string }> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'Необходима авторизация' }
  }

  const parsed = CreateKeySchema.safeParse({
    name: formData.get('name'),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Неверные данные' }
  }

  const db = getEnhancedPrisma(session.user)

  // Проверяем лимит ключей (максимум 5 на пользователя)
  const existingCount = await db.apiKey.count({
    where: { userId: session.user.id },
  })

  if (existingCount >= 5) {
    return { success: false, error: 'Достигнут лимит API ключей (5)' }
  }

  // Генерируем новый ключ
  const rawKey = generateApiKey()
  const keyHash = hashApiKey(rawKey)

  const apiKey = await db.apiKey.create({
    data: {
      name: parsed.data.name,
      key: keyHash,
      userId: session.user.id,
    },
  })

  revalidatePath('/profile/api-keys')

  // Возвращаем ПОЛНЫЙ ключ — показывается только один раз!
  return { success: true, key: rawKey, id: apiKey.id }
}

/**
 * Удалить API ключ
 */
export async function deleteApiKey(id: string): Promise<{ success: boolean; error?: string }> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'Необходима авторизация' }
  }

  const db = getEnhancedPrisma(session.user)

  try {
    await db.apiKey.delete({
      where: { id },
    })

    revalidatePath('/profile/api-keys')
    return { success: true }
  } catch {
    return { success: false, error: 'Ключ не найден' }
  }
}

/**
 * Получить список API ключей пользователя
 */
export async function getApiKeys() {
  const session = await getSession()
  if (!session?.user) {
    return []
  }

  const db = getEnhancedPrisma(session.user)

  return db.apiKey.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      lastUsedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}
