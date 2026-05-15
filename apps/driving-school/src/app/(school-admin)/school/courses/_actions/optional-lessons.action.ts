'use server'

import type { LicenseCategory } from '@letar/driving-school-db/prisma'
import type { Decimal } from 'decimal.js'

import { requireSchoolManager } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import { type ActionErrorCode } from '@/lib/errors'

// === Типы для опциональных занятий ===

export interface OptionalLessonTypeSummary {
  id: string
  name: string
  description: string | null
  category: LicenseCategory | null
  durationMinutes: number
  price: number
  isActive: boolean
  sortOrder: number
  purchasesCount: number
}

// === Результаты операций ===

export type GetOptionalLessonTypesResult =
  | { success: true; lessonTypes: OptionalLessonTypeSummary[] }
  | { success: false; error: ActionErrorCode }

export type CreateOptionalLessonTypeResult =
  | { success: true; lessonTypeId: string }
  | { success: false; error: ActionErrorCode; message?: string }

export type UpdateOptionalLessonTypeResult =
  | { success: true }
  | { success: false; error: ActionErrorCode; message?: string }

export type DeleteOptionalLessonTypeResult =
  | { success: true }
  | { success: false; error: ActionErrorCode; message?: string }

// === Получение списка опциональных занятий ===

export async function getOptionalLessonTypesAction(organizationId: string): Promise<GetOptionalLessonTypesResult> {
  try {
    const authResult = await requireSchoolManager(organizationId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)
    const lessonTypes = await db.optionalLessonType.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { purchases: true },
        },
      },
      orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    })

    // Cast для совместимости типов с _count между ZenStack и Prisma
    type LessonTypeWithCount = (typeof lessonTypes)[number] & { _count: { purchases: number } }
    const summaries: OptionalLessonTypeSummary[] = (lessonTypes as LessonTypeWithCount[]).map(
      (lt: LessonTypeWithCount) => ({
        id: lt.id,
        name: lt.name,
        description: lt.description,
        category: lt.category,
        durationMinutes: lt.durationMinutes,
        price: Number(lt.price),
        isActive: lt.isActive,
        sortOrder: lt.sortOrder,
        purchasesCount: lt._count.purchases,
      })
    )

    return { success: true, lessonTypes: summaries }
  } catch (error) {
    console.error('Ошибка получения списка опциональных занятий:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Создание опционального типа занятия ===

export interface CreateOptionalLessonTypeData {
  organizationId: string
  name: string
  description?: string | null
  category?: LicenseCategory | null
  durationMinutes: number
  price: number
  sortOrder?: number
}

export async function createOptionalLessonTypeAction(
  data: CreateOptionalLessonTypeData
): Promise<CreateOptionalLessonTypeResult> {
  try {
    const authResult = await requireSchoolManager(data.organizationId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    // Валидация
    if (!data.name || data.name.trim().length === 0) {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Название обязательно' }
    }

    if (data.durationMinutes < 1) {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Длительность должна быть больше 0' }
    }

    if (data.price < 0) {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Цена не может быть отрицательной' }
    }

    const db = getEnhancedPrisma(authResult.user)
    const lessonType = await db.optionalLessonType.create({
      data: {
        organizationId: data.organizationId,
        name: data.name.trim(),
        description: data.description ?? null,
        category: data.category ?? null,
        durationMinutes: data.durationMinutes,
        // Cast для совместимости типов Decimal между ZenStack и Prisma
        price: data.price as unknown as Decimal,
        sortOrder: data.sortOrder ?? 0,
        isActive: true,
      },
    })

    return { success: true, lessonTypeId: lessonType.id }
  } catch (error) {
    console.error('Ошибка создания опционального занятия:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Обновление опционального типа занятия ===

export interface UpdateOptionalLessonTypeData {
  name?: string
  description?: string | null
  category?: LicenseCategory | null
  durationMinutes?: number
  price?: number
  sortOrder?: number
  isActive?: boolean
}

export async function updateOptionalLessonTypeAction(
  lessonTypeId: string,
  data: UpdateOptionalLessonTypeData
): Promise<UpdateOptionalLessonTypeResult> {
  try {
    // Сначала получаем lessonType для определения organizationId
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
      const db = getEnhancedPrisma(authResult.user)
      const lessonType = await db.optionalLessonType.findUnique({
        where: { id: lessonTypeId },
        select: { id: true, organizationId: true },
      })

      if (!lessonType) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const schoolAuthResult = await requireSchoolManager(lessonType.organizationId)
      if (!schoolAuthResult.success) {
        return { success: false, error: schoolAuthResult.error }
      }

      // Валидация
      if (data.name !== undefined && data.name.trim().length === 0) {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Название не может быть пустым' }
      }

      if (data.durationMinutes !== undefined && data.durationMinutes < 1) {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Длительность должна быть больше 0' }
      }

      if (data.price !== undefined && data.price < 0) {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Цена не может быть отрицательной' }
      }

      const schoolDb = getEnhancedPrisma(schoolAuthResult.user)
      await schoolDb.optionalLessonType.update({
        where: { id: lessonTypeId },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.category !== undefined && { category: data.category }),
          ...(data.durationMinutes && { durationMinutes: data.durationMinutes }),
          ...(data.price !== undefined && {
            price: data.price as unknown as Decimal,
          }),
          ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      })

      return { success: true }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка обновления опционального занятия:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Деактивация опционального типа занятия ===

export async function deactivateOptionalLessonTypeAction(
  lessonTypeId: string
): Promise<DeleteOptionalLessonTypeResult> {
  try {
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
      const db = getEnhancedPrisma(authResult.user)
      // ZenStack v3 не поддерживает fields.quantity для self-reference
      // Получаем все покупки и фильтруем в JS
      const lessonType = await db.optionalLessonType.findUnique({
        where: { id: lessonTypeId },
        include: {
          purchases: true,
        },
      })

      if (!lessonType) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const schoolAuthResult = await requireSchoolManager(lessonType.organizationId)
      if (!schoolAuthResult.success) {
        return { success: false, error: schoolAuthResult.error }
      }

      // Проверяем неиспользованные покупки
      const unusedPurchases = lessonType.purchases.filter((p) => p.used < p.quantity)
      if (unusedPurchases.length > 0) {
        return {
          success: false,
          error: 'HAS_PURCHASES',
          message: `Есть ${unusedPurchases.length} неиспользованных покупок. Дождитесь их использования.`,
        }
      }

      const schoolDb = getEnhancedPrisma(schoolAuthResult.user)
      await schoolDb.optionalLessonType.update({
        where: { id: lessonTypeId },
        data: { isActive: false },
      })

      return { success: true }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка деактивации опционального занятия:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
