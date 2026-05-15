'use server'

import { revalidatePath } from 'next/cache'

import type { AuthError } from '@/lib/action-helpers'
import { withInstructor } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import type { LessonCategory, LicenseCategory } from '@letar/driving-school-db/prisma'
import type { Decimal } from 'decimal.js'
import { type LessonTypeInput, LessonTypeInputSchema } from '../_schemas/lesson-type-form.schema'
import { PricingOptionFormSchema } from '../_schemas/pricing-option-form.schema'

// === Типы результатов ===

export interface PricingOptionSummary {
  id: string
  vehicleOwner: 'STUDENT' | 'INSTRUCTOR'
  vehicleId: string | null
  lessonsCount: number
  pricePerLesson: number
  discountPercent: number
  isActive: boolean
  isPrimary: boolean
}

export interface LessonTypeWithStats {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  licenseCategory: LicenseCategory | null
  lessonCategory: LessonCategory | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  pricingOptions: PricingOptionSummary[]
  _count: {
    lessons: number
  }
}

export type GetLessonTypesResult =
  | { success: true; lessonTypes: LessonTypeWithStats[] }
  | { success: false; error: AuthError | 'UNKNOWN_ERROR' }

export type LessonTypeActionResult = { success: true; id?: string } | { success: false; error: string }

// === Получение списка типов занятий ===

export async function getLessonTypes(): Promise<GetLessonTypesResult> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    try {
      const lessonTypes = await db.lessonType.findMany({
        where: {
          instructorId: instructorProfileId,
        },
        include: {
          pricingOptions: {
            where: { isActive: true },
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          },
          _count: {
            select: { lessons: true },
          },
        },
        orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
      })

      // Преобразуем Decimal в number для сериализации
      const serializedTypes = lessonTypes.map((type) => ({
        ...type,
        pricingOptions: type.pricingOptions.map((opt) => ({
          ...opt,
          pricePerLesson: Number(opt.pricePerLesson),
        })),
      })) as unknown as LessonTypeWithStats[]

      return { success: true, lessonTypes: serializedTypes }
    } catch (error) {
      console.error('Ошибка получения типов занятий:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// === Получение одного типа занятия ===

export async function getLessonType(
  id: string
): Promise<{ success: true; lessonType: LessonTypeWithStats } | { success: false; error: string }> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    try {
      const lessonType = await db.lessonType.findFirst({
        where: {
          id,
          instructorId: instructorProfileId,
        },
        include: {
          pricingOptions: {
            where: { isActive: true },
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          },
          _count: {
            select: { lessons: true },
          },
        },
      })

      if (!lessonType) {
        return { success: false, error: 'NOT_FOUND' }
      }

      return {
        success: true,
        lessonType: {
          ...lessonType,
          pricingOptions: lessonType.pricingOptions.map((opt) => ({
            ...opt,
            pricePerLesson: Number(opt.pricePerLesson),
          })),
        } as unknown as LessonTypeWithStats,
      }
    } catch (error) {
      console.error('Ошибка получения типа занятия:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// === Создание типа занятия ===

export async function createLessonTypeAction(data: LessonTypeInput): Promise<LessonTypeActionResult> {
  const parsed = LessonTypeInputSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    try {
      const { name, description, durationMinutes, licenseCategory, lessonCategory } = parsed.data

      // Получаем максимальный sortOrder для новых типов
      const maxSortOrder = await db.lessonType.aggregate({
        where: { instructorId: instructorProfileId },
        _max: { sortOrder: true },
      })

      const lessonType = await db.lessonType.create({
        data: {
          instructorId: instructorProfileId,
          name,
          description,
          durationMinutes,
          licenseCategory: licenseCategory as LicenseCategory | undefined,
          lessonCategory: lessonCategory as LessonCategory | undefined,
          sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 1,
        },
      })

      revalidatePath('/lesson-types')
      return { success: true, id: lessonType.id }
    } catch (error) {
      console.error('Ошибка создания типа занятия:', error)
      return { success: false, error: 'Произошла ошибка при создании' }
    }
  })
}

// === Обновление типа занятия ===

export async function updateLessonTypeAction(data: LessonTypeInput): Promise<LessonTypeActionResult> {
  if (!data.id) {
    return { success: false, error: 'ID типа занятия не указан' }
  }

  const parsed = LessonTypeInputSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    // Проверяем, что тип занятия принадлежит текущему инструктору
    const existingType = await db.lessonType.findFirst({
      where: {
        id: data.id,
        instructorId: instructorProfileId,
      },
    })

    if (!existingType) {
      return { success: false, error: 'Тип занятия не найден' }
    }

    try {
      const { id, name, description, durationMinutes, licenseCategory, lessonCategory } = parsed.data

      await db.lessonType.update({
        where: { id },
        data: {
          name,
          description,
          durationMinutes,
          licenseCategory: licenseCategory as LicenseCategory | undefined,
          lessonCategory: lessonCategory as LessonCategory | undefined,
        },
      })

      revalidatePath('/lesson-types')
      revalidatePath(`/lesson-types/${id}/edit`)
      return { success: true }
    } catch (error) {
      console.error('Ошибка обновления типа занятия:', error)
      return { success: false, error: 'Произошла ошибка при обновлении' }
    }
  })
}

// === Удаление (деактивация) типа занятия ===

export async function deleteLessonType(id: string): Promise<LessonTypeActionResult> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    try {
      const lessonType = await db.lessonType.findFirst({
        where: {
          id,
          instructorId: instructorProfileId,
        },
      })

      if (!lessonType) {
        return { success: false, error: 'Тип занятия не найден' }
      }

      // Мягкое удаление — устанавливаем isActive = false
      await db.lessonType.update({
        where: { id },
        data: { isActive: false },
      })

      revalidatePath('/lesson-types')
      return { success: true }
    } catch (error) {
      console.error('Ошибка удаления типа занятия:', error)
      return { success: false, error: 'Произошла ошибка при удалении' }
    }
  })
}

// === Восстановление типа занятия ===

export async function restoreLessonType(id: string): Promise<LessonTypeActionResult> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    try {
      const lessonType = await db.lessonType.findFirst({
        where: {
          id,
          instructorId: instructorProfileId,
        },
      })

      if (!lessonType) {
        return { success: false, error: 'Тип занятия не найден' }
      }

      await db.lessonType.update({
        where: { id },
        data: { isActive: true },
      })

      revalidatePath('/lesson-types')
      return { success: true }
    } catch (error) {
      console.error('Ошибка восстановления типа занятия:', error)
      return { success: false, error: 'Произошла ошибка при восстановлении' }
    }
  })
}

// === CRUD для PricingOption ===

export type PricingOptionActionResult = { success: true; id?: string } | { success: false; error: string }

// Получение вариантов цен для типа занятия
export async function getPricingOptions(
  lessonTypeId: string
): Promise<{ success: true; pricingOptions: PricingOptionSummary[] } | { success: false; error: string }> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    try {
      // Проверяем, что тип занятия принадлежит инструктору
      const lessonType = await db.lessonType.findFirst({
        where: {
          id: lessonTypeId,
          instructorId: instructorProfileId,
        },
      })

      if (!lessonType) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const pricingOptions = await db.pricingOption.findMany({
        where: {
          lessonTypeId,
          isActive: true,
        },
        orderBy: [{ isPrimary: 'desc' }, { vehicleOwner: 'asc' }, { lessonsCount: 'asc' }],
      })

      return {
        success: true,
        pricingOptions: pricingOptions.map((opt) => ({
          ...opt,
          pricePerLesson: Number(opt.pricePerLesson),
        })),
      }
    } catch (error) {
      console.error('Ошибка получения вариантов цен:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// Создание варианта цены
export async function createPricingOption(
  lessonTypeId: string,
  formData: FormData
): Promise<PricingOptionActionResult> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    try {
      // Проверяем, что тип занятия принадлежит инструктору
      const lessonType = await db.lessonType.findFirst({
        where: {
          id: lessonTypeId,
          instructorId: instructorProfileId,
        },
      })

      if (!lessonType) {
        return { success: false, error: 'Тип занятия не найден' }
      }

      // Валидация данных формы
      const data = {
        vehicleOwner: formData.get('vehicleOwner') as string,
        vehicleId: (formData.get('vehicleId') as string) || undefined,
        lessonsCount: formData.get('lessonsCount') as string,
        pricePerLesson: formData.get('pricePerLesson') as string,
        discountPercent: formData.get('discountPercent') as string,
      }

      const result = PricingOptionFormSchema.safeParse(data)
      if (!result.success) {
        const firstError = result.error.issues[0]
        return { success: false, error: firstError?.message ?? 'Ошибка валидации' }
      }

      const { vehicleOwner, vehicleId, lessonsCount, pricePerLesson, discountPercent } = result.data

      // Проверяем на дубликаты
      const existing = await db.pricingOption.findFirst({
        where: {
          lessonTypeId,
          vehicleOwner,
          vehicleId: vehicleId ?? null,
          lessonsCount,
          isActive: true,
        },
      })

      if (existing) {
        return { success: false, error: 'Такой вариант цены уже существует' }
      }

      // Получаем максимальный sortOrder
      const maxSortOrder = await db.pricingOption.aggregate({
        where: { lessonTypeId },
        _max: { sortOrder: true },
      })

      // Проверяем, есть ли уже primary опция
      const hasPrimary = await db.pricingOption.findFirst({
        where: { lessonTypeId, isPrimary: true, isActive: true },
      })

      const pricingOption = await db.pricingOption.create({
        data: {
          lessonTypeId,
          vehicleOwner,
          vehicleId: vehicleId ?? null,
          lessonsCount,
          pricePerLesson: pricePerLesson as unknown as Decimal,
          discountPercent,
          sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 1,
          isPrimary: !hasPrimary, // Первая опция становится primary
        },
      })

      revalidatePath('/lesson-types')
      revalidatePath(`/lesson-types/${lessonTypeId}/pricing`)
      return { success: true, id: pricingOption.id }
    } catch (error) {
      console.error('Ошибка создания варианта цены:', error)
      return { success: false, error: 'Произошла ошибка при создании' }
    }
  })
}

// Обновление варианта цены
export async function updatePricingOption(id: string, formData: FormData): Promise<PricingOptionActionResult> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    try {
      // Проверяем, что вариант цены принадлежит инструктору
      const pricingOption = await db.pricingOption.findFirst({
        where: { id },
        include: {
          lessonType: {
            select: { instructorId: true },
          },
        },
      })

      if (!pricingOption || pricingOption.lessonType.instructorId !== instructorProfileId) {
        return { success: false, error: 'Вариант цены не найден' }
      }

      // Валидация данных
      const data = {
        vehicleOwner: formData.get('vehicleOwner') as string,
        vehicleId: (formData.get('vehicleId') as string) || undefined,
        lessonsCount: formData.get('lessonsCount') as string,
        pricePerLesson: formData.get('pricePerLesson') as string,
        discountPercent: formData.get('discountPercent') as string,
      }

      const result = PricingOptionFormSchema.safeParse(data)
      if (!result.success) {
        const firstError = result.error.issues[0]
        return { success: false, error: firstError?.message ?? 'Ошибка валидации' }
      }

      const { vehicleOwner, vehicleId, lessonsCount, pricePerLesson, discountPercent } = result.data

      await db.pricingOption.update({
        where: { id },
        data: {
          vehicleOwner,
          vehicleId: vehicleId ?? null,
          lessonsCount,
          pricePerLesson: pricePerLesson as unknown as Decimal,
          discountPercent,
        },
      })

      revalidatePath('/lesson-types')
      revalidatePath(`/lesson-types/${pricingOption.lessonTypeId}/pricing`)
      return { success: true }
    } catch (error) {
      console.error('Ошибка обновления варианта цены:', error)
      return { success: false, error: 'Произошла ошибка при обновлении' }
    }
  })
}

// Удаление (деактивация) варианта цены
export async function deletePricingOption(id: string): Promise<PricingOptionActionResult> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    try {
      // Проверяем, что вариант цены принадлежит инструктору
      const pricingOption = await db.pricingOption.findFirst({
        where: { id },
        include: {
          lessonType: {
            select: { instructorId: true },
          },
        },
      })

      if (!pricingOption || pricingOption.lessonType.instructorId !== instructorProfileId) {
        return { success: false, error: 'Вариант цены не найден' }
      }

      // Мягкое удаление
      await db.pricingOption.update({
        where: { id },
        data: { isActive: false },
      })

      // Если удаляли primary, назначаем новый primary
      if (pricingOption.isPrimary) {
        const newPrimary = await db.pricingOption.findFirst({
          where: {
            lessonTypeId: pricingOption.lessonTypeId,
            isActive: true,
            id: { not: id },
          },
          orderBy: { sortOrder: 'asc' },
        })

        if (newPrimary) {
          await db.pricingOption.update({
            where: { id: newPrimary.id },
            data: { isPrimary: true },
          })
        }
      }

      revalidatePath('/lesson-types')
      revalidatePath(`/lesson-types/${pricingOption.lessonTypeId}/pricing`)
      return { success: true }
    } catch (error) {
      console.error('Ошибка удаления варианта цены:', error)
      return { success: false, error: 'Произошла ошибка при удалении' }
    }
  })
}

// Установка primary варианта цены
export async function setPrimaryPricingOption(id: string): Promise<PricingOptionActionResult> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)

    try {
      const pricingOption = await db.pricingOption.findFirst({
        where: { id },
        include: {
          lessonType: {
            select: { instructorId: true },
          },
        },
      })

      if (!pricingOption || pricingOption.lessonType.instructorId !== instructorProfileId) {
        return { success: false, error: 'Вариант цены не найден' }
      }

      // Сбрасываем все isPrimary для этого типа занятия
      await db.pricingOption.updateMany({
        where: { lessonTypeId: pricingOption.lessonTypeId },
        data: { isPrimary: false },
      })

      // Устанавливаем новый primary
      await db.pricingOption.update({
        where: { id },
        data: { isPrimary: true },
      })

      revalidatePath('/lesson-types')
      revalidatePath(`/lesson-types/${pricingOption.lessonTypeId}/pricing`)
      return { success: true }
    } catch (error) {
      console.error('Ошибка установки primary:', error)
      return { success: false, error: 'Произошла ошибка' }
    }
  })
}
