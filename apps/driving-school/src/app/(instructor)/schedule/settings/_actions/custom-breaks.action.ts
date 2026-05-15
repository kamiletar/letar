'use server'

import { revalidatePath } from 'next/cache'

import { withAuth, withInstructor } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import { type DayOfWeek } from '@letar/driving-school-db/prisma'

// === Типы ===

export interface CustomBreakData {
  id: string
  isRecurring: boolean
  dayOfWeek: DayOfWeek | null
  specificDate: Date | null
  startTime: string
  endTime: string
  reason: string | null
}

export interface CreateCustomBreakInput {
  isRecurring: boolean
  dayOfWeek?: DayOfWeek | 'ALL' | null
  specificDate?: Date | null
  startTime: string
  endTime: string
  reason?: string | null
}

// Маппинг дней недели из workingHours в DayOfWeek enum
const WORKING_HOURS_TO_DAY: Record<string, DayOfWeek> = {
  monday: 'MONDAY',
  tuesday: 'TUESDAY',
  wednesday: 'WEDNESDAY',
  thursday: 'THURSDAY',
  friday: 'FRIDAY',
  saturday: 'SATURDAY',
  sunday: 'SUNDAY',
}

// Порядок дней недели для создания перерывов
const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

// === Server Actions ===

/**
 * Получение активных перерывов инструктора (повторяющиеся + будущие разовые)
 */
export async function getCustomBreaks(): Promise<CustomBreakData[]> {
  const result = await withAuth(async (authUser) => {
    const db = getEnhancedPrisma(authUser)
    const user = await db.user.findUnique({
      where: { id: authUser.id },
      include: {
        instructorProfile: {
          include: { scheduleSettings: true },
        },
      },
    })

    if (!user?.instructorProfile?.scheduleSettings) {
      return []
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Активные: повторяющиеся ИЛИ разовые с датой >= сегодня
    const breaks = await db.customBreak.findMany({
      where: {
        settingsId: user.instructorProfile.scheduleSettings.id,
        OR: [{ isRecurring: true }, { isRecurring: false, specificDate: { gte: today } }],
      },
      orderBy: [{ isRecurring: 'desc' }, { specificDate: 'asc' }, { dayOfWeek: 'asc' }],
    })

    return breaks.map((b) => ({
      id: b.id,
      isRecurring: b.isRecurring,
      dayOfWeek: b.dayOfWeek,
      specificDate: b.specificDate,
      startTime: b.startTime,
      endTime: b.endTime,
      reason: b.reason,
    }))
  })

  // При ошибке авторизации возвращаем пустой массив
  if ('success' in result) {
    return []
  }
  return result
}

export interface PastBreaksResult {
  items: CustomBreakData[]
  nextCursor: string | null
  totalCount: number
}

/**
 * Получение прошедших перерывов с пагинацией (для infinite scroll)
 */
export async function getPastBreaks(cursor?: string, limit = 10): Promise<PastBreaksResult> {
  const result = await withAuth(async (authUser) => {
    const db = getEnhancedPrisma(authUser)
    const user = await db.user.findUnique({
      where: { id: authUser.id },
      include: {
        instructorProfile: {
          include: { scheduleSettings: true },
        },
      },
    })

    if (!user?.instructorProfile?.scheduleSettings) {
      return { items: [], nextCursor: null, totalCount: 0 }
    }

    const settingsId = user.instructorProfile.scheduleSettings.id
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Считаем общее количество прошедших перерывов
    const totalCount = await db.customBreak.count({
      where: {
        settingsId,
        isRecurring: false,
        specificDate: { lt: today },
      },
    })

    // Прошедшие: разовые с датой < сегодня
    const breaks = await db.customBreak.findMany({
      where: {
        settingsId,
        isRecurring: false,
        specificDate: { lt: today },
      },
      orderBy: { specificDate: 'desc' },
      take: limit + 1, // +1 чтобы понять есть ли следующая страница
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = breaks.length > limit
    const items = hasMore ? breaks.slice(0, limit) : breaks
    const nextCursor = hasMore ? items[items.length - 1]?.id : null

    return {
      items: items.map((b) => ({
        id: b.id,
        isRecurring: b.isRecurring,
        dayOfWeek: b.dayOfWeek,
        specificDate: b.specificDate,
        startTime: b.startTime,
        endTime: b.endTime,
        reason: b.reason,
      })),
      nextCursor,
      totalCount,
    }
  })

  // При ошибке авторизации возвращаем пустой результат
  if ('success' in result) {
    return { items: [], nextCursor: null, totalCount: 0 }
  }
  return result
}

/**
 * Создание нового перерыва
 * Возвращает массив созданных перерывов (для "ALL" - несколько, для остальных - один)
 */
export async function createCustomBreak(
  input: CreateCustomBreakInput
): Promise<{ success: true; data: CustomBreakData[] } | { success: false; error: string }> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)
    try {
      // Получаем настройки расписания
      const instructorProfile = await db.instructorProfile.findUnique({
        where: { id: instructorProfileId },
        include: { scheduleSettings: true },
      })

      if (!instructorProfile) {
        return { success: false, error: 'Профиль инструктора не найден' }
      }

      // Создаём настройки расписания если их нет
      let settings = instructorProfile.scheduleSettings
      if (!settings) {
        settings = await db.scheduleSettings.create({
          data: {
            instructorId: instructorProfile.id,
            workingHours: {},
          },
        })
      }

      // Валидация времени
      if (input.startTime >= input.endTime) {
        return { success: false, error: 'Время начала должно быть раньше времени окончания' }
      }

      // Для повторяющегося перерыва нужен день недели
      if (input.isRecurring && !input.dayOfWeek) {
        return { success: false, error: 'Выберите день недели для повторяющегося перерыва' }
      }

      // Для разового перерыва нужна дата
      if (!input.isRecurring && !input.specificDate) {
        return { success: false, error: 'Выберите дату для разового перерыва' }
      }

      const createdBreaks: CustomBreakData[] = []

      if (input.isRecurring && input.dayOfWeek === 'ALL') {
        // Получаем рабочие дни из workingHours
        const workingHours = settings.workingHours as Record<string, unknown> | null
        if (!workingHours || Object.keys(workingHours).length === 0) {
          return { success: false, error: 'Сначала настройте рабочие часы' }
        }

        // Создаём перерыв для каждого рабочего дня в правильном порядке
        for (const day of DAYS_ORDER) {
          const schedule = workingHours[day]
          if (schedule) {
            const customBreak = await db.customBreak.create({
              data: {
                settingsId: settings.id,
                isRecurring: true,
                dayOfWeek: WORKING_HOURS_TO_DAY[day],
                specificDate: null,
                startTime: input.startTime,
                endTime: input.endTime,
                reason: input.reason || null,
              },
            })
            createdBreaks.push({
              id: customBreak.id,
              isRecurring: customBreak.isRecurring,
              dayOfWeek: customBreak.dayOfWeek,
              specificDate: customBreak.specificDate,
              startTime: customBreak.startTime,
              endTime: customBreak.endTime,
              reason: customBreak.reason,
            })
          }
        }

        if (createdBreaks.length === 0) {
          return { success: false, error: 'Не найдено рабочих дней для создания перерывов' }
        }
      } else {
        // Создаём один перерыв (для конкретного дня или разовый)
        const customBreak = await db.customBreak.create({
          data: {
            settingsId: settings.id,
            isRecurring: input.isRecurring,
            dayOfWeek: input.isRecurring ? (input.dayOfWeek as DayOfWeek) : null,
            specificDate: !input.isRecurring ? input.specificDate : null,
            startTime: input.startTime,
            endTime: input.endTime,
            reason: input.reason || null,
          },
        })
        createdBreaks.push({
          id: customBreak.id,
          isRecurring: customBreak.isRecurring,
          dayOfWeek: customBreak.dayOfWeek,
          specificDate: customBreak.specificDate,
          startTime: customBreak.startTime,
          endTime: customBreak.endTime,
          reason: customBreak.reason,
        })
      }

      revalidatePath('/schedule/settings')

      return { success: true, data: createdBreaks }
    } catch (error) {
      console.error('createCustomBreak error:', error)
      return { success: false, error: 'Произошла ошибка при создании перерыва' }
    }
  })
}

/**
 * Удаление перерыва
 */
export async function deleteCustomBreak(id: string): Promise<{ success: true } | { success: false; error: string }> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)
    try {
      // Получаем настройки расписания с перерывами
      const instructorProfile = await db.instructorProfile.findUnique({
        where: { id: instructorProfileId },
        include: {
          scheduleSettings: {
            include: { customBreaks: true },
          },
        },
      })

      if (!instructorProfile?.scheduleSettings) {
        return { success: false, error: 'Настройки расписания не найдены' }
      }

      // Проверяем что перерыв принадлежит этому инструктору
      const breakBelongsToUser = instructorProfile.scheduleSettings.customBreaks.some((b) => b.id === id)
      if (!breakBelongsToUser) {
        return { success: false, error: 'Перерыв не найден' }
      }

      await db.customBreak.delete({
        where: { id },
      })

      revalidatePath('/schedule/settings')

      return { success: true }
    } catch (error) {
      console.error('deleteCustomBreak error:', error)
      return { success: false, error: 'Произошла ошибка при удалении перерыва' }
    }
  })
}

export interface UpdateCustomBreakInput {
  id: string
  dayOfWeek?: DayOfWeek | null
  specificDate?: Date | null
  startTime: string
  endTime: string
  reason?: string | null
}

/**
 * Обновление перерыва
 */
export async function updateCustomBreak(
  input: UpdateCustomBreakInput
): Promise<{ success: true; data: CustomBreakData } | { success: false; error: string }> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)
    try {
      // Получаем настройки расписания с перерывами
      const instructorProfile = await db.instructorProfile.findUnique({
        where: { id: instructorProfileId },
        include: {
          scheduleSettings: {
            include: { customBreaks: true },
          },
        },
      })

      if (!instructorProfile?.scheduleSettings) {
        return { success: false, error: 'Настройки расписания не найдены' }
      }

      // Проверяем что перерыв принадлежит этому инструктору
      const existingBreak = instructorProfile.scheduleSettings.customBreaks.find((b) => b.id === input.id)
      if (!existingBreak) {
        return { success: false, error: 'Перерыв не найден' }
      }

      // Валидация времени
      if (input.startTime >= input.endTime) {
        return { success: false, error: 'Время начала должно быть раньше времени окончания' }
      }

      const updatedBreak = await db.customBreak.update({
        where: { id: input.id },
        data: {
          dayOfWeek: existingBreak.isRecurring ? input.dayOfWeek : null,
          specificDate: !existingBreak.isRecurring ? input.specificDate : null,
          startTime: input.startTime,
          endTime: input.endTime,
          reason: input.reason || null,
        },
      })

      revalidatePath('/schedule/settings')

      return {
        success: true,
        data: {
          id: updatedBreak.id,
          isRecurring: updatedBreak.isRecurring,
          dayOfWeek: updatedBreak.dayOfWeek,
          specificDate: updatedBreak.specificDate,
          startTime: updatedBreak.startTime,
          endTime: updatedBreak.endTime,
          reason: updatedBreak.reason,
        },
      }
    } catch (error) {
      console.error('updateCustomBreak error:', error)
      return { success: false, error: 'Произошла ошибка при обновлении перерыва' }
    }
  })
}
