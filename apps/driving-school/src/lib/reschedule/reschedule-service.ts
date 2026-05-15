/**
 * Сервис для переноса занятий
 *
 * Бизнес-логика:
 * - requestReschedule — пометить занятие как требующее переноса (NEEDS_RESCHEDULE)
 * - rescheduleLesson — перенести занятие на новый слот:
 *   - Старое занятие получает статус RESCHEDULED + ссылку на новое
 *   - Новое занятие создаётся со статусом CONFIRMED
 *   - Старый слот возвращается в AVAILABLE
 *   - Новый слот становится BOOKED
 */

import type { LessonStatus, SlotStatus } from '@letar/driving-school-db/prisma'

// === Типы ===

export interface LessonData {
  id: string
  slotId: string
  studentId: string
  instructorId: string
  status: LessonStatus
  createdBy: string
  rescheduledToId: string | null
}

export interface SlotData {
  id: string
  instructorId: string
  startTime: Date
  endTime: Date
  status: SlotStatus
}

export interface RescheduleRepository {
  getLesson: (lessonId: string) => Promise<LessonData | null>
  getSlot: (slotId: string) => Promise<SlotData | null>
  updateLessonStatus: (lessonId: string, status: LessonStatus) => Promise<LessonData>
  updateSlotStatus: (slotId: string, status: SlotStatus) => Promise<void>
  createLesson: (data: {
    slotId: string
    studentId: string
    instructorId: string
    status: LessonStatus
    createdBy: string
  }) => Promise<{ id: string }>
  linkRescheduledLessons: (oldLessonId: string, newLessonId: string) => Promise<void>
}

// === Результаты ===

export type RequestRescheduleResult =
  | { success: true; lesson: LessonData }
  | { success: false; error: 'LESSON_NOT_FOUND' | 'INVALID_STATUS' }

export type RescheduleLessonResult =
  | { success: true; newLessonId: string; oldLessonId: string }
  | {
      success: false
      error:
        | 'LESSON_NOT_FOUND'
        | 'OLD_SLOT_NOT_FOUND'
        | 'NEW_SLOT_NOT_FOUND'
        | 'NEW_SLOT_NOT_AVAILABLE'
        | 'INVALID_STATUS'
        | 'SLOT_INSTRUCTOR_MISMATCH'
    }

// === Валидные статусы для переноса ===

const VALID_STATUSES_FOR_RESCHEDULE: LessonStatus[] = ['PENDING', 'CONFIRMED', 'NEEDS_RESCHEDULE']

// === Функции ===

/**
 * Пометить занятие как требующее переноса
 */
export async function requestReschedule(
  lessonId: string,
  repo: RescheduleRepository
): Promise<RequestRescheduleResult> {
  // 1. Получаем занятие
  const lesson = await repo.getLesson(lessonId)
  if (!lesson) {
    return { success: false, error: 'LESSON_NOT_FOUND' }
  }

  // 2. Проверяем статус (можно запросить перенос только для активных занятий)
  if (!VALID_STATUSES_FOR_RESCHEDULE.includes(lesson.status)) {
    return { success: false, error: 'INVALID_STATUS' }
  }

  // 3. Обновляем статус
  const updatedLesson = await repo.updateLessonStatus(lessonId, 'NEEDS_RESCHEDULE')

  return { success: true, lesson: updatedLesson }
}

/**
 * Перенести занятие на новый слот
 */
export async function rescheduleLesson(params: {
  lessonId: string
  newSlotId: string
  repo: RescheduleRepository
}): Promise<RescheduleLessonResult> {
  const { lessonId, newSlotId, repo } = params

  // 1. Получаем старое занятие
  const oldLesson = await repo.getLesson(lessonId)
  if (!oldLesson) {
    return { success: false, error: 'LESSON_NOT_FOUND' }
  }

  // 2. Проверяем статус (можно перенести только активные занятия)
  if (!VALID_STATUSES_FOR_RESCHEDULE.includes(oldLesson.status)) {
    return { success: false, error: 'INVALID_STATUS' }
  }

  // 3. Получаем старый слот
  const oldSlot = await repo.getSlot(oldLesson.slotId)
  if (!oldSlot) {
    return { success: false, error: 'OLD_SLOT_NOT_FOUND' }
  }

  // 4. Получаем новый слот
  const newSlot = await repo.getSlot(newSlotId)
  if (!newSlot) {
    return { success: false, error: 'NEW_SLOT_NOT_FOUND' }
  }

  // 5. Проверяем доступность нового слота
  if (newSlot.status !== 'AVAILABLE') {
    return { success: false, error: 'NEW_SLOT_NOT_AVAILABLE' }
  }

  // 6. Проверяем, что новый слот принадлежит тому же инструктору
  if (newSlot.instructorId !== oldLesson.instructorId) {
    return { success: false, error: 'SLOT_INSTRUCTOR_MISMATCH' }
  }

  // 7. Создаём новое занятие
  const newLesson = await repo.createLesson({
    slotId: newSlotId,
    studentId: oldLesson.studentId,
    instructorId: oldLesson.instructorId,
    status: 'CONFIRMED',
    createdBy: oldLesson.createdBy,
  })

  // 8. Обновляем статус старого занятия
  await repo.updateLessonStatus(lessonId, 'RESCHEDULED')

  // 9. Связываем занятия
  await repo.linkRescheduledLessons(lessonId, newLesson.id)

  // 10. Освобождаем старый слот
  await repo.updateSlotStatus(oldSlot.id, 'AVAILABLE')

  // 11. Бронируем новый слот
  await repo.updateSlotStatus(newSlotId, 'BOOKED')

  return {
    success: true,
    newLessonId: newLesson.id,
    oldLessonId: lessonId,
  }
}
