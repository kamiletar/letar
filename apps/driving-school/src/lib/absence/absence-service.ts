/**
 * Сервис для управления отсутствием инструктора
 *
 * Бизнес-логика:
 * - Инструктор может создать отпуск (VACATION) с датами начала и окончания
 * - Инструктор может создать болезнь (SICK_LEAVE) без даты окончания
 * - При создании отсутствия слоты в этот период блокируются
 * - Занятия в период отсутствия помечаются как требующие переноса
 * - Инструктор может отметить возвращение — слоты разблокируются
 */

import type { AbsenceType, LessonStatus, SlotStatus } from '@letar/driving-school-db/prisma'

// === Типы ===

export interface AbsenceData {
  id: string
  instructorId: string
  type: AbsenceType
  startDate: Date
  endDate: Date | null
  reason: string | null
  isActive: boolean
  createdAt: Date
  returnedAt: Date | null
}

export interface SlotData {
  id: string
  instructorId: string
  startTime: Date
  endTime: Date
  status: SlotStatus
}

export interface LessonData {
  id: string
  slotId: string
  studentId: string
  instructorId: string
  status: LessonStatus
}

export interface InstructorProfileData {
  id: string
  userId: string
}

export interface AbsenceRepository {
  getInstructorProfile: (instructorId: string) => Promise<InstructorProfileData | null>
  createAbsence: (data: {
    instructorId: string
    type: AbsenceType
    startDate: Date
    endDate: Date | null
    reason: string | null
  }) => Promise<{ id: string }>
  updateAbsence: (
    absenceId: string,
    data: {
      isActive?: boolean
      returnedAt?: Date
      endDate?: Date
    }
  ) => Promise<void>
  getAbsenceById: (absenceId: string) => Promise<AbsenceData | null>
  getActiveAbsenceByInstructor: (instructorId: string) => Promise<AbsenceData | null>
  getSlotsInPeriod: (instructorId: string, startDate: Date, endDate: Date) => Promise<SlotData[]>
  updateSlotStatus: (slotId: string, status: SlotStatus) => Promise<void>
  getLessonsInPeriod: (instructorId: string, startDate: Date, endDate: Date) => Promise<LessonData[]>
  updateLessonStatus: (lessonId: string, status: LessonStatus) => Promise<void>
}

// === Результаты ===

export type CreateAbsenceResult =
  | { success: true; absenceId: string; blockedSlotsCount: number; affectedLessonsCount: number }
  | {
      success: false
      error:
        | 'INSTRUCTOR_NOT_FOUND'
        | 'END_DATE_REQUIRED_FOR_VACATION'
        | 'END_DATE_BEFORE_START_DATE'
        | 'ALREADY_HAS_ACTIVE_ABSENCE'
    }

export type EndAbsenceResult =
  | { success: true; unblockedSlotsCount: number }
  | { success: false; error: 'ABSENCE_NOT_FOUND' | 'ABSENCE_ALREADY_ENDED' }

export type GetActiveAbsenceResult = { success: true; absence: AbsenceData | null }

export type GetAffectedLessonsResult =
  | { success: true; lessons: LessonData[] }
  | { success: false; error: 'ABSENCE_NOT_FOUND' }

// === Константы ===

// Статусы занятий, которые можно затронуть при создании отсутствия
const AFFECTABLE_LESSON_STATUSES: LessonStatus[] = ['PENDING', 'CONFIRMED']

// Статусы занятий, которые считаются активными
const ACTIVE_LESSON_STATUSES: LessonStatus[] = ['PENDING', 'CONFIRMED', 'NEEDS_RESCHEDULE']

// === Функции ===

/**
 * Создаёт отсутствие инструктора (отпуск или болезнь)
 */
export async function createAbsence(params: {
  instructorId: string
  type: AbsenceType
  startDate: Date
  endDate: Date | undefined
  reason: string | null
  repo: AbsenceRepository
}): Promise<CreateAbsenceResult> {
  const { instructorId, type, startDate, endDate, reason, repo } = params

  // Проверяем существование инструктора
  const instructor = await repo.getInstructorProfile(instructorId)
  if (!instructor) {
    return { success: false, error: 'INSTRUCTOR_NOT_FOUND' }
  }

  // Проверяем обязательность даты окончания для отпуска
  if (type === 'VACATION' && !endDate) {
    return { success: false, error: 'END_DATE_REQUIRED_FOR_VACATION' }
  }

  // Проверяем что дата окончания не раньше даты начала
  if (endDate && endDate < startDate) {
    return { success: false, error: 'END_DATE_BEFORE_START_DATE' }
  }

  // Проверяем что нет активного отсутствия
  const activeAbsence = await repo.getActiveAbsenceByInstructor(instructorId)
  if (activeAbsence) {
    return { success: false, error: 'ALREADY_HAS_ACTIVE_ABSENCE' }
  }

  // Создаём отсутствие
  const absence = await repo.createAbsence({
    instructorId,
    type,
    startDate,
    endDate: endDate ?? null,
    reason,
  })

  // Определяем период для блокировки слотов
  // Для болезни без даты окончания берём +30 дней как горизонт
  const periodEnd = endDate ?? new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)

  // Блокируем доступные слоты в период отсутствия
  const slots = await repo.getSlotsInPeriod(instructorId, startDate, periodEnd)
  let blockedSlotsCount = 0

  for (const slot of slots) {
    if (slot.status === 'AVAILABLE') {
      await repo.updateSlotStatus(slot.id, 'BLOCKED')
      blockedSlotsCount++
    }
  }

  // Помечаем активные занятия как требующие переноса
  const lessons = await repo.getLessonsInPeriod(instructorId, startDate, periodEnd)
  let affectedLessonsCount = 0

  for (const lesson of lessons) {
    if (AFFECTABLE_LESSON_STATUSES.includes(lesson.status)) {
      await repo.updateLessonStatus(lesson.id, 'NEEDS_RESCHEDULE')
      affectedLessonsCount++
    }
  }

  return {
    success: true,
    absenceId: absence.id,
    blockedSlotsCount,
    affectedLessonsCount,
  }
}

/**
 * Завершает отсутствие (инструктор вернулся)
 */
export async function endAbsence(absenceId: string, repo: AbsenceRepository): Promise<EndAbsenceResult> {
  // Получаем отсутствие
  const absence = await repo.getAbsenceById(absenceId)

  if (!absence) {
    return { success: false, error: 'ABSENCE_NOT_FOUND' }
  }

  if (!absence.isActive) {
    return { success: false, error: 'ABSENCE_ALREADY_ENDED' }
  }

  const now = new Date()

  // Завершаем отсутствие
  await repo.updateAbsence(absenceId, {
    isActive: false,
    returnedAt: now,
  })

  // Определяем период для разблокировки слотов
  const periodEnd = absence.endDate ?? new Date(absence.startDate.getTime() + 30 * 24 * 60 * 60 * 1000)

  // Разблокируем будущие слоты
  const slots = await repo.getSlotsInPeriod(absence.instructorId, absence.startDate, periodEnd)
  let unblockedSlotsCount = 0

  for (const slot of slots) {
    // Разблокируем только будущие заблокированные слоты
    if (slot.status === 'BLOCKED' && slot.startTime > now) {
      await repo.updateSlotStatus(slot.id, 'AVAILABLE')
      unblockedSlotsCount++
    }
  }

  return {
    success: true,
    unblockedSlotsCount,
  }
}

/**
 * Получает активное отсутствие инструктора
 */
export async function getActiveAbsence(instructorId: string, repo: AbsenceRepository): Promise<GetActiveAbsenceResult> {
  const absence = await repo.getActiveAbsenceByInstructor(instructorId)
  return { success: true, absence }
}

/**
 * Получает список затронутых занятий для отсутствия
 */
export async function getAffectedLessons(
  absenceId: string,
  repo: AbsenceRepository
): Promise<GetAffectedLessonsResult> {
  // Получаем отсутствие
  const absence = await repo.getAbsenceById(absenceId)

  if (!absence) {
    return { success: false, error: 'ABSENCE_NOT_FOUND' }
  }

  // Определяем период
  const periodEnd = absence.endDate ?? new Date(absence.startDate.getTime() + 30 * 24 * 60 * 60 * 1000)

  // Получаем занятия в период
  const allLessons = await repo.getLessonsInPeriod(absence.instructorId, absence.startDate, periodEnd)

  // Фильтруем только активные занятия
  const activeLessons = allLessons.filter((lesson) => ACTIVE_LESSON_STATUSES.includes(lesson.status))

  return {
    success: true,
    lessons: activeLessons,
  }
}
