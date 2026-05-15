import type { ConnectionStatus, LessonStatus, SlotStatus } from '@letar/driving-school-db/prisma'

// === Типы ===

export interface CreateLessonInput {
  slotId: string
  studentId: string
  instructorId: string
  createdBy: string
  lessonTypeId?: string
  pricingOptionId?: string
  price?: number
}

interface SlotData {
  id: string
  instructorId: string
  startTime: Date
  endTime: Date
  status: SlotStatus
}

interface ConnectionData {
  id: string
  studentId: string
  instructorId: string
  status: ConnectionStatus
}

interface InstructorProfileData {
  id: string
  userId: string
  autoConfirmBookings: boolean
  lateCancelHours: number
}

interface LessonData {
  id: string
  slotId: string
  studentId: string
  instructorId: string
  status: LessonStatus
  createdBy: string
  cancelledBy?: string | null
  cancelledAt?: Date | null
  cancelReason?: string | null
  instructorNotes?: string | null
}

// Занятие с информацией о времени слота для проверки пересечений
interface LessonWithSlotTime {
  id: string
  slot: {
    startTime: Date
    endTime: Date
  }
}

// Репозиторий для dependency injection (упрощает тестирование)
export interface CreateLessonRepository {
  getSlot: (slotId: string) => Promise<SlotData | null>
  getConnection: (studentId: string, instructorId: string) => Promise<ConnectionData | null>
  getInstructorProfile: (instructorId: string) => Promise<InstructorProfileData | null>
  // Получение активных занятий ученика (PENDING или CONFIRMED) для проверки пересечений
  getStudentLessons: (studentId: string) => Promise<LessonWithSlotTime[]>
  createLessonInDb: (data: {
    slotId: string
    studentId: string
    instructorId: string
    status: LessonStatus
    createdBy: string
    lessonTypeId?: string
    pricingOptionId?: string
    price?: number
  }) => Promise<LessonData>
  updateSlotStatus: (slotId: string, status: SlotStatus) => Promise<void>
}

// Данные занятия с информацией о слоте для проверки пересечений
interface LessonDataWithSlot extends LessonData {
  slot: {
    startTime: Date
    endTime: Date
  }
}

export interface ConfirmLessonRepository {
  getLesson: (lessonId: string) => Promise<LessonDataWithSlot | null>
  // Получение активных занятий ученика (PENDING или CONFIRMED, кроме текущего) для проверки пересечений
  getStudentLessonsForConflictCheck: (studentId: string, excludeLessonId: string) => Promise<LessonWithSlotTime[]>
  updateLessonStatus: (lessonId: string, status: LessonStatus) => Promise<LessonData>
}

export interface CancelLessonRepository {
  getLesson: (lessonId: string) => Promise<LessonData | null>
  getSlot: (slotId: string) => Promise<SlotData | null>
  getInstructorProfile: (instructorId: string) => Promise<InstructorProfileData | null>
  updateLesson: (
    lessonId: string,
    data: { status: LessonStatus; cancelledBy: string; cancelledAt: Date; cancelReason?: string }
  ) => Promise<LessonData>
  updateSlotStatus: (slotId: string, status: SlotStatus) => Promise<void>
}

export interface CompleteLessonRepository {
  getLesson: (lessonId: string) => Promise<LessonData | null>
  updateLesson: (lessonId: string, data: { status: LessonStatus; instructorNotes?: string }) => Promise<LessonData>
  updateConnectionStats: (
    studentId: string,
    instructorId: string,
    type: 'COMPLETED' | 'NO_SHOW' | 'CANCELLED'
  ) => Promise<void>
}

// Результаты операций
export type CreateLessonResult =
  | { success: true; lesson: LessonData }
  | {
      success: false
      error:
        | 'SLOT_NOT_FOUND'
        | 'SLOT_NOT_AVAILABLE'
        | 'NO_CONNECTION'
        | 'CONNECTION_NOT_ACTIVE'
        | 'STUDENT_TIME_CONFLICT'
    }

export type LessonActionResult =
  | { success: true; lesson: LessonData }
  | { success: false; error: 'LESSON_NOT_FOUND' | 'INVALID_STATUS' | 'NOT_AUTHORIZED' | 'STUDENT_TIME_CONFLICT' }

export type CancelLessonResult =
  | { success: true; lesson: LessonData; isLateCancellation: boolean }
  | { success: false; error: 'LESSON_NOT_FOUND' | 'INVALID_STATUS' | 'NOT_AUTHORIZED' }

// === Функции ===

/**
 * Проверка пересечения временных интервалов
 * Два интервала пересекаются, если: start1 < end2 AND start2 < end1
 */
function hasTimeConflict(newStart: Date, newEnd: Date, existingLessons: LessonWithSlotTime[]): boolean {
  return existingLessons.some((lesson) => {
    const existingStart = lesson.slot.startTime
    const existingEnd = lesson.slot.endTime
    return newStart < existingEnd && existingStart < newEnd
  })
}

/**
 * Создание занятия
 */
export async function createLesson(
  input: CreateLessonInput,
  repo: CreateLessonRepository
): Promise<CreateLessonResult> {
  const { slotId, studentId, instructorId, createdBy, lessonTypeId, pricingOptionId, price } = input

  // 1. Проверяем существование слота
  const slot = await repo.getSlot(slotId)
  if (!slot) {
    return { success: false, error: 'SLOT_NOT_FOUND' }
  }

  // 2. Проверяем доступность слота
  if (slot.status !== 'AVAILABLE') {
    return { success: false, error: 'SLOT_NOT_AVAILABLE' }
  }

  // 3. Проверяем связь ученик-инструктор
  const connection = await repo.getConnection(studentId, instructorId)
  if (!connection) {
    return { success: false, error: 'NO_CONNECTION' }
  }

  if (connection.status !== 'ACTIVE') {
    return { success: false, error: 'CONNECTION_NOT_ACTIVE' }
  }

  // 4. Проверяем пересечение с существующими занятиями ученика
  const studentLessons = await repo.getStudentLessons(studentId)
  if (hasTimeConflict(slot.startTime, slot.endTime, studentLessons)) {
    return { success: false, error: 'STUDENT_TIME_CONFLICT' }
  }

  // 5. Определяем статус занятия
  const instructorProfile = await repo.getInstructorProfile(instructorId)
  let status: LessonStatus = 'PENDING'

  // Автоподтверждение или создание инструктором
  if (instructorProfile?.autoConfirmBookings || createdBy === instructorId) {
    status = 'CONFIRMED'
  }

  // 6. Создаём занятие
  const lesson = await repo.createLessonInDb({
    slotId,
    studentId,
    instructorId,
    status,
    createdBy,
    lessonTypeId,
    pricingOptionId,
    price,
  })

  // 7. Обновляем статус слота
  await repo.updateSlotStatus(slotId, 'BOOKED')

  return { success: true, lesson }
}

/**
 * Подтверждение занятия инструктором
 */
export async function confirmLesson(
  lessonId: string,
  userId: string,
  repo: ConfirmLessonRepository
): Promise<LessonActionResult> {
  // 1. Получаем занятие
  const lesson = await repo.getLesson(lessonId)
  if (!lesson) {
    return { success: false, error: 'LESSON_NOT_FOUND' }
  }

  // 2. Проверяем авторизацию (только инструктор)
  if (lesson.instructorId !== userId) {
    return { success: false, error: 'NOT_AUTHORIZED' }
  }

  // 3. Проверяем статус
  if (lesson.status !== 'PENDING') {
    return { success: false, error: 'INVALID_STATUS' }
  }

  // 4. Проверяем пересечение с существующими занятиями ученика
  const studentLessons = await repo.getStudentLessonsForConflictCheck(lesson.studentId, lessonId)
  if (hasTimeConflict(lesson.slot.startTime, lesson.slot.endTime, studentLessons)) {
    return { success: false, error: 'STUDENT_TIME_CONFLICT' }
  }

  // 5. Обновляем статус
  const updatedLesson = await repo.updateLessonStatus(lessonId, 'CONFIRMED')

  return { success: true, lesson: updatedLesson }
}

/**
 * Отмена занятия
 */
export async function cancelLesson(
  lessonId: string,
  userId: string,
  reason: string | undefined,
  repo: CancelLessonRepository,
  now: Date = new Date()
): Promise<CancelLessonResult> {
  // 1. Получаем занятие
  const lesson = await repo.getLesson(lessonId)
  if (!lesson) {
    return { success: false, error: 'LESSON_NOT_FOUND' }
  }

  // 2. Проверяем статус (можно отменить только PENDING или CONFIRMED)
  if (lesson.status !== 'PENDING' && lesson.status !== 'CONFIRMED') {
    return { success: false, error: 'INVALID_STATUS' }
  }

  // 3. Получаем слот и профиль инструктора для расчёта поздней отмены
  const slot = await repo.getSlot(lesson.slotId)
  const instructorProfile = await repo.getInstructorProfile(lesson.instructorId)

  // 4. Вычисляем, является ли отмена поздней
  let isLateCancellation = false
  if (slot && instructorProfile) {
    const hoursUntilLesson = (slot.startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    isLateCancellation = hoursUntilLesson < instructorProfile.lateCancelHours
  }

  // 5. Обновляем занятие
  const updatedLesson = await repo.updateLesson(lessonId, {
    status: 'CANCELLED',
    cancelledBy: userId,
    cancelledAt: now,
    cancelReason: reason,
  })

  // 6. Возвращаем слот в доступные
  if (slot) {
    await repo.updateSlotStatus(slot.id, 'AVAILABLE')
  }

  return { success: true, lesson: updatedLesson, isLateCancellation }
}

/**
 * Завершение занятия (COMPLETED)
 */
export async function completeLesson(
  lessonId: string,
  instructorId: string,
  notes: string | undefined,
  repo: CompleteLessonRepository
): Promise<LessonActionResult> {
  // 1. Получаем занятие
  const lesson = await repo.getLesson(lessonId)
  if (!lesson) {
    return { success: false, error: 'LESSON_NOT_FOUND' }
  }

  // 2. Проверяем авторизацию
  if (lesson.instructorId !== instructorId) {
    return { success: false, error: 'NOT_AUTHORIZED' }
  }

  // 3. Проверяем статус (только CONFIRMED можно завершить)
  if (lesson.status !== 'CONFIRMED') {
    return { success: false, error: 'INVALID_STATUS' }
  }

  // 4. Обновляем занятие
  const updatedLesson = await repo.updateLesson(lessonId, {
    status: 'COMPLETED',
    instructorNotes: notes,
  })

  // 5. Обновляем статистику связи
  await repo.updateConnectionStats(lesson.studentId, lesson.instructorId, 'COMPLETED')

  return { success: true, lesson: updatedLesson }
}

/**
 * Отметка неявки ученика (NO_SHOW)
 */
export async function markNoShow(
  lessonId: string,
  instructorId: string,
  repo: CompleteLessonRepository
): Promise<LessonActionResult> {
  // 1. Получаем занятие
  const lesson = await repo.getLesson(lessonId)
  if (!lesson) {
    return { success: false, error: 'LESSON_NOT_FOUND' }
  }

  // 2. Проверяем авторизацию
  if (lesson.instructorId !== instructorId) {
    return { success: false, error: 'NOT_AUTHORIZED' }
  }

  // 3. Проверяем статус (только CONFIRMED можно отметить как неявку)
  if (lesson.status !== 'CONFIRMED') {
    return { success: false, error: 'INVALID_STATUS' }
  }

  // 4. Обновляем занятие
  const updatedLesson = await repo.updateLesson(lessonId, {
    status: 'NO_SHOW',
  })

  // 5. Обновляем статистику связи
  await repo.updateConnectionStats(lesson.studentId, lesson.instructorId, 'NO_SHOW')

  return { success: true, lesson: updatedLesson }
}
