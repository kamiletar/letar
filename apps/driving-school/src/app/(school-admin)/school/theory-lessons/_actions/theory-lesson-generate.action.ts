'use server'

/**
 * Server Actions для массовой генерации расписания теории
 */

import { requireSchoolAdmin } from '@/lib/action-helpers'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import type { LessonSchedule } from '@/lib/lesson-schedule'
import { revalidatePath } from 'next/cache'

import type { DayOfWeek } from '@/lib/lesson-schedule'

/**
 * Маппинг JS Date.getDay() → DayOfWeek
 */
const JS_DAY_TO_DAY_OF_WEEK: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

/** Предпросмотр слота */
export interface ScheduleSlotPreview {
  date: string // ISO date string
  dayOfWeek: string
  startTime: string
  duration: number
}

/** Данные для генерации */
export interface GenerateScheduleInput {
  groupId: string
  topicId: string
  startDate: string // ISO date
  endDate: string // ISO date
  instructorId?: string
  location?: string
}

/**
 * Вычислить все слоты между startDate и endDate по расписанию,
 * исключая дни с существующими занятиями
 */
function generateAllSlots(
  schedule: LessonSchedule,
  startDate: Date,
  endDate: Date,
  existingDates: Set<string>
): ScheduleSlotPreview[] {
  const slots: ScheduleSlotPreview[] = []
  const dayNames: Record<string, string> = {
    monday: 'Пн',
    tuesday: 'Вт',
    wednesday: 'Ср',
    thursday: 'Чт',
    friday: 'Пт',
    saturday: 'Сб',
    sunday: 'Вс',
  }

  const current = new Date(startDate)
  current.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  while (current <= end) {
    const dayOfWeek = JS_DAY_TO_DAY_OF_WEEK[current.getDay()]
    const daySchedule = schedule[dayOfWeek]

    if (daySchedule) {
      const dateKey = current.toISOString().split('T')[0]

      if (!existingDates.has(dateKey)) {
        slots.push({
          date: dateKey,
          dayOfWeek: dayNames[dayOfWeek] || dayOfWeek,
          startTime: daySchedule.startTime,
          duration: daySchedule.duration,
        })
      }
    }

    current.setDate(current.getDate() + 1)
  }

  return slots
}

// === Предпросмотр расписания (без записи в БД) ===

export async function previewTheoryScheduleAction(
  groupId: string,
  startDate: string,
  endDate: string
): Promise<{
  success: boolean
  slots?: ScheduleSlotPreview[]
  error?: string
}> {
  try {
    // Получаем группу с расписанием
    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      select: {
        organizationId: true,
        lessonSchedule: true,
      },
    })

    if (!group) {
      return { success: false, error: 'GROUP_NOT_FOUND' }
    }

    const authResult = await requireSchoolAdmin(group.organizationId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const schedule = group.lessonSchedule as LessonSchedule
    if (!schedule) {
      return { success: false, error: 'NO_SCHEDULE' }
    }

    // Получаем существующие занятия в диапазоне
    const existingLessons = await prisma.theoryLesson.findMany({
      where: {
        groupId,
        scheduledAt: {
          gte: new Date(startDate),
          lte: new Date(endDate + 'T23:59:59'),
        },
        status: { not: 'CANCELLED' },
      },
      select: { scheduledAt: true },
    })

    const existingDates = new Set<string>(
      existingLessons.map((l) => new Date(l.scheduledAt).toISOString().split('T')[0])
    )

    const slots = generateAllSlots(schedule, new Date(startDate), new Date(endDate), existingDates)

    return { success: true, slots }
  } catch (error) {
    console.error('Ошибка предпросмотра расписания:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Генерация занятий (создание в БД) ===

export async function generateTheoryScheduleAction(data: GenerateScheduleInput): Promise<{
  success: boolean
  count?: number
  error?: string
}> {
  try {
    // Получаем группу с расписанием
    const group = await prisma.studyGroup.findUnique({
      where: { id: data.groupId },
      select: {
        organizationId: true,
        lessonSchedule: true,
      },
    })

    if (!group) {
      return { success: false, error: 'GROUP_NOT_FOUND' }
    }

    const authResult = await requireSchoolAdmin(group.organizationId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)
    const schedule = group.lessonSchedule as LessonSchedule

    if (!schedule) {
      return { success: false, error: 'NO_SCHEDULE' }
    }

    // Получаем существующие занятия в диапазоне
    const existingLessons = await prisma.theoryLesson.findMany({
      where: {
        groupId: data.groupId,
        scheduledAt: {
          gte: new Date(data.startDate),
          lte: new Date(data.endDate + 'T23:59:59'),
        },
        status: { not: 'CANCELLED' },
      },
      select: { scheduledAt: true },
    })

    const existingDates = new Set<string>(
      existingLessons.map((l) => new Date(l.scheduledAt).toISOString().split('T')[0])
    )

    const slots = generateAllSlots(schedule, new Date(data.startDate), new Date(data.endDate), existingDates)

    if (slots.length === 0) {
      return { success: false, error: 'NO_SLOTS' }
    }

    // Создаём занятия пакетом
    const lessonsData = slots.map((slot) => {
      const [hours, minutes] = slot.startTime.split(':').map(Number)
      const scheduledAt = new Date(slot.date)
      scheduledAt.setHours(hours, minutes, 0, 0)

      return {
        groupId: data.groupId,
        topicId: data.topicId,
        scheduledAt,
        duration: slot.duration,
        instructorId: data.instructorId || null,
        location: data.location || null,
        status: 'SCHEDULED' as const,
      }
    })

    // createMany для оптимальной производительности
    const result = await db.theoryLesson.createMany({
      data: lessonsData,
    })

    revalidatePath(`/school/theory-lessons/${group.organizationId}`)

    return { success: true, count: result.count }
  } catch (error) {
    console.error('Ошибка генерации расписания:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
