'use server'

import { generateApiKey } from '@/lib/api-auth'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

// Тип API-ключа для отображения
export interface ApiKeyItem {
  id: string
  name: string
  keyPrefix: string
  status: 'ACTIVE' | 'REVOKED'
  createdAt: Date
  lastUsedAt: Date | null
  usageCount: number
}

// Результат создания ключа (содержит полный ключ один раз)
export interface CreateApiKeyResult {
  success: true
  apiKey: ApiKeyItem
  fullKey: string // Полный ключ показывается только один раз
}

export interface CreateApiKeyError {
  success: false
  error: 'UNAUTHORIZED' | 'NOT_ADMIN' | 'NOT_FOUND' | 'LIMIT_EXCEEDED' | 'UNKNOWN_ERROR'
}

// Максимальное количество ключей на школу
const MAX_API_KEYS_PER_SCHOOL = 10

/**
 * Получить список API-ключей школы
 */
export async function getApiKeysAction(
  schoolId: string
): Promise<{ success: true; apiKeys: ApiKeyItem[] } | { success: false; error: string }> {
  const session = await getSession()

  if (!session?.user?.id) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    const db = getEnhancedPrisma(session.user)
    // Проверяем, что пользователь — админ школы
    const membership = await db.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: schoolId,
          userId: session.user.id,
        },
      },
    })

    if (!membership || !['owner', 'super_manager', 'manager'].includes(membership.role)) {
      return { success: false, error: 'NOT_ADMIN' }
    }

    // Получаем ключи
    const apiKeys = await db.apiKey.findMany({
      where: { organizationId: schoolId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        status: true,
        createdAt: true,
        lastUsedAt: true,
        usageCount: true,
      },
    })

    return {
      success: true,
      apiKeys: apiKeys as ApiKeyItem[],
    }
  } catch (error) {
    console.error('Ошибка получения API-ключей:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Создать новый API-ключ
 */
export async function createApiKeyAction(
  schoolId: string,
  name: string
): Promise<CreateApiKeyResult | CreateApiKeyError> {
  const session = await getSession()

  if (!session?.user?.id) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    const db = getEnhancedPrisma(session.user)
    // Проверяем, что пользователь — админ школы
    const membership = await db.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: schoolId,
          userId: session.user.id,
        },
      },
    })

    if (!membership || !['owner', 'super_manager', 'manager'].includes(membership.role)) {
      return { success: false, error: 'NOT_ADMIN' }
    }

    // Проверяем лимит ключей
    const existingKeysCount = await db.apiKey.count({
      where: { organizationId: schoolId, status: 'ACTIVE' },
    })

    if (existingKeysCount >= MAX_API_KEYS_PER_SCHOOL) {
      return { success: false, error: 'LIMIT_EXCEEDED' }
    }

    // Генерируем ключ
    const { key, keyHash, keyPrefix } = generateApiKey()

    // Сохраняем в БД
    const apiKey = await db.apiKey.create({
      data: {
        organizationId: schoolId,
        name: name.trim() || 'API Key',
        keyHash,
        keyPrefix,
        createdById: session.user.id,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        status: true,
        createdAt: true,
        lastUsedAt: true,
        usageCount: true,
      },
    })

    return {
      success: true,
      apiKey: apiKey as ApiKeyItem,
      fullKey: key,
    }
  } catch (error) {
    console.error('Ошибка создания API-ключа:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Отозвать API-ключ
 */
export async function revokeApiKeyAction(
  schoolId: string,
  keyId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession()

  if (!session?.user?.id) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    const db = getEnhancedPrisma(session.user)
    // Проверяем, что пользователь — админ школы
    const membership = await db.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: schoolId,
          userId: session.user.id,
        },
      },
    })

    if (!membership || !['owner', 'super_manager', 'manager'].includes(membership.role)) {
      return { success: false, error: 'NOT_ADMIN' }
    }

    // Проверяем, что ключ принадлежит этой школе
    const apiKey = await db.apiKey.findUnique({
      where: { id: keyId },
    })

    if (!apiKey || apiKey.organizationId !== schoolId) {
      return { success: false, error: 'NOT_FOUND' }
    }

    if (apiKey.status === 'REVOKED') {
      return { success: false, error: 'ALREADY_REVOKED' }
    }

    // Отзываем ключ
    await db.apiKey.update({
      where: { id: keyId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedById: session.user.id,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка отзыва API-ключа:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Переименовать API-ключ
 */
export async function renameApiKeyAction(
  schoolId: string,
  keyId: string,
  newName: string
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession()

  if (!session?.user?.id) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    const db = getEnhancedPrisma(session.user)
    // Проверяем, что пользователь — админ школы
    const membership = await db.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: schoolId,
          userId: session.user.id,
        },
      },
    })

    if (!membership || !['owner', 'super_manager', 'manager'].includes(membership.role)) {
      return { success: false, error: 'NOT_ADMIN' }
    }

    // Проверяем, что ключ принадлежит этой школе
    const apiKey = await db.apiKey.findUnique({
      where: { id: keyId },
    })

    if (!apiKey || apiKey.organizationId !== schoolId) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Переименовываем ключ
    await db.apiKey.update({
      where: { id: keyId },
      data: {
        name: newName.trim() || 'API Key',
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка переименования API-ключа:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Удалить API-ключ полностью (только отозванные)
 */
export async function deleteApiKeyAction(
  schoolId: string,
  keyId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await getSession()

  if (!session?.user?.id) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    const db = getEnhancedPrisma(session.user)
    // Проверяем, что пользователь — админ школы
    const membership = await db.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: schoolId,
          userId: session.user.id,
        },
      },
    })

    if (!membership || !['owner', 'super_manager', 'manager'].includes(membership.role)) {
      return { success: false, error: 'NOT_ADMIN' }
    }

    // Проверяем, что ключ принадлежит этой школе и отозван
    const apiKey = await db.apiKey.findUnique({
      where: { id: keyId },
    })

    if (!apiKey || apiKey.organizationId !== schoolId) {
      return { success: false, error: 'NOT_FOUND' }
    }

    if (apiKey.status !== 'REVOKED') {
      return { success: false, error: 'MUST_REVOKE_FIRST' }
    }

    // Удаляем ключ
    await db.apiKey.delete({
      where: { id: keyId },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка удаления API-ключа:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
