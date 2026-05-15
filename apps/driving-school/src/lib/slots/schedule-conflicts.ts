/**
 * Сервис для обработки конфликтов при изменении расписания
 */
import type { LessonStatus, PrismaClient } from '@letar/driving-school-db/prisma'

// === Типы ===

export interface AffectedLesson {
  id: string
  studentId: string
  slotId: string
  status: LessonStatus
  startTime: Date
  endTime: Date
}

export interface DetectConflictsInput {
  instructorId: string
  fromDate: Date
  toDate: Date
}

export interface HandleConflictsInput {
  affectedLessons: AffectedLesson[]
  notifyStudents: boolean
}

// === Статусы занятий, которые могут быть затронуты ===

export const ACTIVE_LESSON_STATUSES: LessonStatus[] = ['PENDING', 'CONFIRMED', 'NEEDS_RESCHEDULE']

/**
 * Проверяет, является ли занятие активным (может быть затронуто изменением расписания)
 */
export function isActiveLessonStatus(status: LessonStatus): boolean {
  return ACTIVE_LESSON_STATUSES.includes(status)
}

/**
 * Проверяет, затронуто ли занятие изменением расписания
 * Занятие затронуто, если его слот попадает в период изменения
 */
export function isLessonAffected(
  lessonStartTime: Date,
  lessonEndTime: Date,
  changeFromDate: Date,
  changeToDate: Date
): boolean {
  // Занятие затронуто, если оно хотя бы частично попадает в период изменения
  return lessonStartTime < changeToDate && lessonEndTime > changeFromDate
}

/**
 * Фильтрует занятия, которые будут затронуты изменением расписания
 */
export function filterAffectedLessons<T extends { status: LessonStatus; startTime: Date; endTime: Date }>(
  lessons: T[],
  changeFromDate: Date,
  changeToDate: Date
): T[] {
  return lessons.filter(
    (lesson) =>
      isActiveLessonStatus(lesson.status) &&
      isLessonAffected(lesson.startTime, lesson.endTime, changeFromDate, changeToDate)
  )
}

/**
 * Создаёт список уведомлений для затронутых учеников
 */
export function createNotificationsForAffectedLessons(affectedLessons: AffectedLesson[]): Array<{
  userId: string
  type: 'LESSON_NEEDS_RESCHEDULE'
  lessonId: string
  message: string
}> {
  return affectedLessons.map((lesson) => ({
    userId: lesson.studentId,
    type: 'LESSON_NEEDS_RESCHEDULE' as const,
    lessonId: lesson.id,
    message: `Ваше занятие ${formatDateTime(lesson.startTime)} требует переноса из-за изменения расписания инструктора`,
  }))
}

/**
 * Форматирует дату и время для сообщения
 */
function formatDateTime(date: Date): string {
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// === Сервисные функции ===

/**
 * Обнаруживает занятия, затронутые изменением расписания
 */
export async function detectAffectedLessons(
  prisma: PrismaClient,
  input: DetectConflictsInput
): Promise<AffectedLesson[]> {
  const { instructorId, fromDate, toDate } = input

  const lessons = await prisma.lesson.findMany({
    where: {
      slot: {
        instructorId,
        startTime: { lt: toDate },
        endTime: { gt: fromDate },
      },
      status: { in: ACTIVE_LESSON_STATUSES },
    },
    include: {
      slot: true,
    },
  })

  return lessons.map((lesson) => ({
    id: lesson.id,
    studentId: lesson.studentId,
    slotId: lesson.slotId,
    status: lesson.status,
    startTime: lesson.slot.startTime,
    endTime: lesson.slot.endTime,
  }))
}

/**
 * Помечает занятия как требующие переноса
 */
export async function markLessonsAsNeedingReschedule(prisma: PrismaClient, lessonIds: string[]): Promise<number> {
  if (lessonIds.length === 0) {
    return 0
  }

  const result = await prisma.lesson.updateMany({
    where: {
      id: { in: lessonIds },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    data: {
      status: 'NEEDS_RESCHEDULE',
    },
  })

  return result.count
}
