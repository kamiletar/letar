'use server'

import { revalidatePath } from 'next/cache'

import { type AuthError, withInstructor } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import type { DbClient } from '@/lib/db-types'
import { type DayOfWeek, type WorkingHoursSchedule } from '@/lib/working-hours/types'
import { type DayOfWeek as PrismaDayOfWeek } from '@letar/driving-school-db/prisma'

import {
  type ScheduleSettingsFormData,
  type ScheduleSettingsFormInput,
  ScheduleSettingsFormSchema,
} from '../_schemas/schedule-settings.schema'

// Маппинг дней недели из workingHours (lowercase) в Prisma DayOfWeek (UPPERCASE)
const DAY_MAP: Record<DayOfWeek, PrismaDayOfWeek> = {
  monday: 'MONDAY',
  tuesday: 'TUESDAY',
  wednesday: 'WEDNESDAY',
  thursday: 'THURSDAY',
  friday: 'FRIDAY',
  saturday: 'SATURDAY',
  sunday: 'SUNDAY',
}

// Порядок дней для итерации (начинаем с понедельника)
const DAYS_ORDER: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

/**
 * Генерирует слоты для инструктора на основе настроек
 * @returns Количество созданных слотов
 */
async function generateAndSaveSlots(
  db: DbClient,
  instructorId: string,
  settingsId: string,
  workingHours: WorkingHoursSchedule,
  lessonDuration: number,
  breakDuration: number,
  planningHorizon: number
): Promise<number> {
  // Получаем кастомные перерывы
  const customBreaks = await db.customBreak.findMany({
    where: { settingsId },
  })

  // Начинаем с завтрашнего дня (сегодняшний день не трогаем)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() + 1)
  startDate.setHours(0, 0, 0, 0)

  // Собираем все новые слоты
  const newSlots: Array<{
    instructorId: string
    startTime: Date
    endTime: Date
    status: 'AVAILABLE'
  }> = []

  // Генерируем слоты для каждого дня в периоде
  for (let dayOffset = 0; dayOffset < planningHorizon; dayOffset++) {
    const currentDate = new Date(startDate)
    currentDate.setDate(startDate.getDate() + dayOffset)

    // Определяем день недели (0 = воскресенье, 1 = понедельник...)
    const jsDay = currentDate.getDay()
    const dayKey = DAYS_ORDER[jsDay === 0 ? 6 : jsDay - 1] // Преобразуем JS день в наш формат

    // Проверяем, рабочий ли это день
    const daySchedule = workingHours[dayKey]
    if (!daySchedule) {
      continue
    }

    const { open: workStart, close: workEnd } = daySchedule

    // Преобразуем время в минуты
    const [startHour, startMin] = workStart.split(':').map(Number)
    const [endHour, endMin] = workEnd.split(':').map(Number)
    const workStartMinutes = startHour * 60 + startMin
    const workEndMinutes = endHour * 60 + endMin

    // Получаем перерывы для этого дня
    const prismaDayOfWeek = DAY_MAP[dayKey]
    const breaksForDay = customBreaks.filter((b) => {
      if (b.isRecurring && b.dayOfWeek === prismaDayOfWeek) {
        return true
      }
      if (!b.isRecurring && b.specificDate && b.specificDate.toDateString() === currentDate.toDateString()) {
        return true
      }
      return false
    })

    // Генерируем слоты
    let currentMinutes = workStartMinutes
    while (currentMinutes + lessonDuration <= workEndMinutes) {
      const slotStartMinutes = currentMinutes
      const slotEndMinutes = currentMinutes + lessonDuration

      // Проверяем пересечение с перерывами
      const overlapsWithBreak = breaksForDay.some((b) => {
        const [bStartH, bStartM] = b.startTime.split(':').map(Number)
        const [bEndH, bEndM] = b.endTime.split(':').map(Number)
        const breakStart = bStartH * 60 + bStartM
        const breakEnd = bEndH * 60 + bEndM
        return slotStartMinutes < breakEnd && slotEndMinutes > breakStart
      })

      if (!overlapsWithBreak) {
        const slotStart = new Date(currentDate)
        slotStart.setHours(Math.floor(slotStartMinutes / 60), slotStartMinutes % 60, 0, 0)

        const slotEnd = new Date(currentDate)
        slotEnd.setHours(Math.floor(slotEndMinutes / 60), slotEndMinutes % 60, 0, 0)

        newSlots.push({
          instructorId,
          startTime: slotStart,
          endTime: slotEnd,
          status: 'AVAILABLE',
        })
      }

      currentMinutes += lessonDuration + breakDuration
    }
  }

  // Удаляем старые свободные слоты (сохраняем забронированные)
  await db.timeSlot.deleteMany({
    where: {
      instructorId,
      status: 'AVAILABLE',
      startTime: { gte: startDate },
    },
  })

  // Также удаляем заблокированные слоты (они пересоздадутся)
  await db.timeSlot.deleteMany({
    where: {
      instructorId,
      status: 'BLOCKED',
      startTime: { gte: startDate },
    },
  })

  // Создаём новые слоты
  if (newSlots.length > 0) {
    await db.timeSlot.createMany({
      data: newSlots,
    })
  }

  return newSlots.length
}

// === Типы результатов ===
// ВАЖНО: В Next.js 16 'use server' файлы могут экспортировать ТОЛЬКО async функции!
// Типы и константы нужно выносить в отдельные файлы или импортировать из схемы.

export type UpdateScheduleSettingsResult =
  | { success: true }
  | {
      success: false
      error: AuthError | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR'
    }

export type GetScheduleSettingsResult =
  | {
      success: true
      settings: ScheduleSettingsFormData | null
    }
  | { success: false; error: AuthError | 'UNKNOWN_ERROR' }

// === Server Actions ===

/**
 * Получение настроек расписания инструктора
 */
export async function getScheduleSettings(): Promise<GetScheduleSettingsResult> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)
    try {
      // Получаем настройки расписания
      const dbSettings = await db.scheduleSettings.findUnique({
        where: { instructorId: instructorProfileId },
      })

      // Если настроек нет - возвращаем null (клиент покажет дефолты)
      if (!dbSettings) {
        return { success: true, settings: null }
      }

      // Преобразуем данные из БД в формат формы
      const settings: ScheduleSettingsFormData = {
        workingHours: dbSettings.workingHours as WorkingHoursSchedule,
        lessonDuration: dbSettings.lessonDuration,
        breakDuration: dbSettings.breakDuration,
        planningHorizon: dbSettings.planningHorizon,
      }

      return { success: true, settings }
    } catch (error) {
      console.error('getScheduleSettings error:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

/**
 * Обновление/создание настроек расписания инструктора (прямой вызов)
 */
export async function updateScheduleSettings(data: ScheduleSettingsFormData): Promise<UpdateScheduleSettingsResult> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)
    try {
      // Валидируем данные (для прямого вызова нужно JSON.stringify)
      const validationResult = ScheduleSettingsFormSchema.safeParse({
        ...data,
        workingHours: JSON.stringify(data.workingHours),
      })
      if (!validationResult.success) {
        return { success: false, error: 'VALIDATION_ERROR' }
      }

      const validatedData = validationResult.data

      // Upsert настроек расписания
      await db.scheduleSettings.upsert({
        where: { instructorId: instructorProfileId },
        create: {
          instructorId: instructorProfileId,
          workingHours: validatedData.workingHours,
          lessonDuration: validatedData.lessonDuration,
          breakDuration: validatedData.breakDuration,
          planningHorizon: validatedData.planningHorizon,
        },
        update: {
          workingHours: validatedData.workingHours,
          lessonDuration: validatedData.lessonDuration,
          breakDuration: validatedData.breakDuration,
          planningHorizon: validatedData.planningHorizon,
        },
      })

      return { success: true }
    } catch (error) {
      console.error('updateScheduleSettings error:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

/**
 * Обновление/создание настроек расписания инструктора (для форм)
 * Принимает INPUT тип (до трансформации схемой)
 */
export async function updateScheduleSettingsAction(
  data: ScheduleSettingsFormInput
): Promise<UpdateScheduleSettingsResult> {
  // Валидация до авторизации (можно делать без withInstructor)
  const parsed = ScheduleSettingsFormSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)
    try {
      const validatedData = parsed.data

      // Upsert настроек расписания
      await db.scheduleSettings.upsert({
        where: { instructorId: instructorProfileId },
        create: {
          instructorId: instructorProfileId,
          workingHours: validatedData.workingHours,
          lessonDuration: validatedData.lessonDuration,
          breakDuration: validatedData.breakDuration,
          planningHorizon: validatedData.planningHorizon,
        },
        update: {
          workingHours: validatedData.workingHours,
          lessonDuration: validatedData.lessonDuration,
          breakDuration: validatedData.breakDuration,
          planningHorizon: validatedData.planningHorizon,
        },
      })

      revalidatePath('/schedule')
      revalidatePath('/schedule/settings')
      return { success: true }
    } catch (error) {
      console.error('updateScheduleSettings error:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

// === Генерация слотов ===

export type GenerateSlotsResult = { success: true; slotsCreated: number } | { success: false; error: string }

/**
 * Генерирует слоты на основе сохранённых настроек расписания
 */
export async function generateSlotsAction(): Promise<GenerateSlotsResult> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)
    try {
      // Получаем настройки
      const settings = await db.scheduleSettings.findUnique({
        where: { instructorId: instructorProfileId },
      })
      if (!settings) {
        return { success: false, error: 'Сначала сохраните настройки расписания' }
      }

      const workingHours = settings.workingHours as WorkingHoursSchedule
      if (!workingHours || Object.keys(workingHours).length === 0) {
        return { success: false, error: 'Настройте рабочие часы' }
      }

      // Генерируем слоты
      const slotsCreated = await generateAndSaveSlots(
        db,
        instructorProfileId,
        settings.id,
        workingHours,
        settings.lessonDuration,
        settings.breakDuration,
        settings.planningHorizon
      )

      revalidatePath('/schedule')
      revalidatePath('/schedule/settings')

      return { success: true, slotsCreated }
    } catch (error) {
      console.error('generateSlotsAction error:', error)
      return { success: false, error: 'Произошла ошибка при генерации слотов' }
    }
  })
}

/**
 * Получает статистику слотов для отображения
 */
export async function getSlotsStats(): Promise<{
  totalSlots: number
  availableSlots: number
  bookedSlots: number
  lastSlotDate: Date | null
} | null> {
  const result = await withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)
    try {
      const now = new Date()

      // groupBy по статусу — 1 запрос вместо 3 отдельных count
      const [statusCounts, lastSlot] = await Promise.all([
        db.timeSlot.groupBy({
          by: ['status'],
          where: {
            instructorId: instructorProfileId,
            startTime: { gte: now },
          },
          _count: { _all: true },
        }),
        db.timeSlot.findFirst({
          where: {
            instructorId: instructorProfileId,
            startTime: { gte: now },
          },
          orderBy: { startTime: 'desc' },
          select: { startTime: true },
        }),
      ])

      const available = statusCounts.find((s) => s.status === 'AVAILABLE')?._count._all ?? 0
      const booked = statusCounts.find((s) => s.status === 'BOOKED')?._count._all ?? 0
      const total = statusCounts.reduce((sum, s) => sum + s._count._all, 0)

      return {
        totalSlots: total,
        availableSlots: available,
        bookedSlots: booked,
        lastSlotDate: lastSlot?.startTime || null,
      }
    } catch {
      return null
    }
  })

  // При ошибке авторизации возвращаем null
  if (!result || 'success' in result) {
    return null
  }
  return result
}

// === Удаление слотов ===

export type DeleteSlotsResult =
  | { success: true; deletedCount: number; bookedCount: number }
  | { success: false; error: string }

/**
 * Удаляет все свободные слоты (забронированные сохраняются)
 */
export async function deleteSlotsAction(): Promise<DeleteSlotsResult> {
  return withInstructor(async (user, instructorProfileId) => {
    const db = getEnhancedPrisma(user)
    try {
      const now = new Date()

      // Считаем забронированные слоты (их не удаляем)
      const bookedCount = await db.timeSlot.count({
        where: {
          instructorId: instructorProfileId,
          status: 'BOOKED',
          startTime: { gte: now },
        },
      })

      // Удаляем все свободные и заблокированные слоты
      const deleteResult = await db.timeSlot.deleteMany({
        where: {
          instructorId: instructorProfileId,
          status: { in: ['AVAILABLE', 'BLOCKED'] },
          startTime: { gte: now },
        },
      })

      revalidatePath('/schedule')
      revalidatePath('/schedule/settings')

      return {
        success: true,
        deletedCount: deleteResult.count,
        bookedCount,
      }
    } catch (error) {
      console.error('deleteSlotsAction error:', error)
      return { success: false, error: 'Произошла ошибка при удалении слотов' }
    }
  })
}
