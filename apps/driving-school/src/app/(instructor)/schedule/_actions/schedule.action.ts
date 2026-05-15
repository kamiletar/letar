'use server'

import { type AuthError, withInstructor } from '@/lib/action-helpers'
import { getEnhancedPrisma, prisma } from '@/lib/db'

// === Типы ===

export interface TimeSlotWithLesson {
  id: string
  startTime: Date
  endTime: Date
  status: 'AVAILABLE' | 'BOOKED' | 'BLOCKED'
  lesson: {
    id: string
    status: string
    student: {
      user: {
        name: string | null
        image: string | null
      }
    }
    lessonType: {
      name: string
    } | null
  } | null
}

export type GetScheduleResult =
  | { success: true; slots: TimeSlotWithLesson[]; hasSettings: boolean }
  | { success: false; error: AuthError | 'UNKNOWN_ERROR' }

// === Server Actions ===

/**
 * Получение расписания инструктора на неделю
 */
export type ToggleSlotResult =
  | { success: true; newStatus: 'AVAILABLE' | 'BLOCKED' }
  | { success: false; error: AuthError | 'NOT_FOUND' | 'CANNOT_BLOCK_BOOKED' | 'UNKNOWN_ERROR' }

/**
 * Блокировка/разблокировка слота
 * AVAILABLE → BLOCKED, BLOCKED → AVAILABLE
 * BOOKED слоты нельзя блокировать
 */
export async function toggleSlotStatus(slotId: string): Promise<ToggleSlotResult> {
  return withInstructor(async (user, instructorProfileId) => {
    try {
      const db = getEnhancedPrisma(user)

      // Находим слот и проверяем владельца
      const slot = await db.timeSlot.findFirst({
        where: {
          id: slotId,
          instructorId: instructorProfileId,
        },
      })

      if (!slot) {
        return { success: false, error: 'NOT_FOUND' }
      }

      // Нельзя блокировать занятые слоты
      if (slot.status === 'BOOKED') {
        return { success: false, error: 'CANNOT_BLOCK_BOOKED' }
      }

      // Переключаем статус
      const newStatus = slot.status === 'AVAILABLE' ? 'BLOCKED' : 'AVAILABLE'

      await db.timeSlot.update({
        where: { id: slotId },
        data: { status: newStatus },
      })

      return { success: true, newStatus }
    } catch (error) {
      console.error('toggleSlotStatus error:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}

/**
 * Получение расписания инструктора на неделю
 */
export async function getInstructorSchedule(startDate?: Date, endDate?: Date): Promise<GetScheduleResult> {
  return withInstructor(async (user, instructorProfileId) => {
    try {
      const db = getEnhancedPrisma(user)

      // Находим профиль инструктора с настройками
      const instructorProfile = await db.instructorProfile.findUnique({
        where: { id: instructorProfileId },
        include: {
          scheduleSettings: true,
        },
      })

      if (!instructorProfile) {
        return { success: false, error: 'NO_PROFILE' }
      }

      // Определяем период
      // Если есть настройки - берём planningHorizon, иначе 7 дней
      const planningHorizon = instructorProfile.scheduleSettings?.planningHorizon ?? 7

      // Начинаем с сегодня (или переданной даты)
      const periodStart = startDate || new Date()
      periodStart.setHours(0, 0, 0, 0)

      // Конец периода = planningHorizon дней вперёд (или переданная дата)
      const periodEnd = endDate || new Date(periodStart)
      periodEnd.setDate(periodStart.getDate() + planningHorizon)
      periodEnd.setHours(23, 59, 59, 999)

      // ZenStack v3.2.x баг: глубокий nested include с access policies генерирует невалидный SQL
      // Ошибка: "таблица TimeSlot$lesson$student$sub отсутствует в предложении FROM"
      // Используем prisma напрямую — access control обеспечивается условием instructorId
      const slots = await prisma.timeSlot.findMany({
        where: {
          instructorId: instructorProfileId,
          startTime: { gte: periodStart },
          endTime: { lte: periodEnd },
        },
        include: {
          lesson: {
            include: {
              student: {
                select: {
                  name: true,
                  image: true,
                },
              },
              lessonType: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      })

      // Преобразуем данные
      const mappedSlots: TimeSlotWithLesson[] = slots.map((slot) => ({
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status as 'AVAILABLE' | 'BOOKED' | 'BLOCKED',
        lesson: slot.lesson
          ? {
              id: slot.lesson.id,
              status: slot.lesson.status,
              student: {
                user: {
                  name: slot.lesson.student.name,
                  image: slot.lesson.student.image,
                },
              },
              lessonType: slot.lesson.lessonType
                ? {
                    name: slot.lesson.lessonType.name,
                  }
                : null,
            }
          : null,
      }))

      return {
        success: true,
        slots: mappedSlots,
        hasSettings: !!instructorProfile.scheduleSettings,
      }
    } catch (error) {
      console.error('getInstructorSchedule error:', error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }
  })
}
