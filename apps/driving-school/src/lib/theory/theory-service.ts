/**
 * Сервис для работы с теоретическими занятиями
 *
 * Бизнес-логика:
 * - Построение списка посещаемости из членов группы и существующих отметок
 * - Расчёт процента посещаемости
 * - Подсчёт статистики по занятиям
 */

// === Типы ===

export interface AttendanceMember {
  memberId: string
  userId: string
  userName: string
  userEmail: string | null
  userImage: string | null
  isPresent: boolean
  markedAt: Date | null
}

export interface GroupMember {
  id: string
  userId: string
  user: {
    id: string
    name: string
    email: string | null
    image: string | null
  }
}

export interface AttendanceRecord {
  memberId: string
  isPresent: boolean
  markedAt: Date | null
}

export interface AttendanceStats {
  total: number
  present: number
  absent: number
  rate: number | null
}

export interface LessonStats {
  totalLessons: number
  completedLessons: number
  cancelledLessons: number
  scheduledLessons: number
  averageAttendanceRate: number | null
}

export type TheoryLessonStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

// === Функции ===

/**
 * Построение списка посещаемости из членов группы и существующих отметок
 *
 * @param members - Члены учебной группы
 * @param attendances - Существующие отметки посещаемости
 * @returns Список с информацией о посещаемости каждого члена
 */
export function buildAttendanceList(members: GroupMember[], attendances: AttendanceRecord[]): AttendanceMember[] {
  const attendanceMap = new Map(attendances.map((a) => [a.memberId, a]))

  return members.map((member) => {
    const attendance = attendanceMap.get(member.id)
    return {
      memberId: member.id,
      userId: member.user.id,
      userName: member.user.name,
      userEmail: member.user.email,
      userImage: member.user.image,
      isPresent: attendance?.isPresent ?? false,
      markedAt: attendance?.markedAt ?? null,
    }
  })
}

/**
 * Расчёт процента посещаемости
 *
 * @param presentCount - Количество посещённых занятий
 * @param totalCount - Общее количество занятий
 * @returns Процент посещаемости или null если нет занятий
 */
export function calculateAttendanceRate(presentCount: number, totalCount: number): number | null {
  if (totalCount === 0) {
    return null
  }
  return Math.round((presentCount / totalCount) * 100)
}

/**
 * Подсчёт статистики посещаемости для занятия
 *
 * @param attendances - Список отметок посещаемости
 * @returns Статистика посещаемости
 */
export function calculateAttendanceStats(attendances: AttendanceRecord[]): AttendanceStats {
  const present = attendances.filter((a) => a.isPresent).length
  const total = attendances.length
  const absent = total - present

  return {
    total,
    present,
    absent,
    rate: calculateAttendanceRate(present, total),
  }
}

/**
 * Подсчёт статистики по занятиям группы
 *
 * @param lessons - Список занятий со статусами и посещаемостью
 * @returns Общая статистика по занятиям
 */
export function calculateLessonStats(
  lessons: Array<{ status: TheoryLessonStatus; attendances: AttendanceRecord[] }>
): LessonStats {
  const totalLessons = lessons.length
  const completedLessons = lessons.filter((l) => l.status === 'COMPLETED').length
  const cancelledLessons = lessons.filter((l) => l.status === 'CANCELLED').length
  const scheduledLessons = lessons.filter((l) => l.status === 'SCHEDULED').length

  // Считаем среднюю посещаемость только по завершённым занятиям
  const completedWithAttendance = lessons.filter((l) => l.status === 'COMPLETED' && l.attendances.length > 0)

  let averageAttendanceRate: number | null = null

  if (completedWithAttendance.length > 0) {
    const totalRate = completedWithAttendance.reduce((sum, lesson) => {
      const stats = calculateAttendanceStats(lesson.attendances)
      return sum + (stats.rate ?? 0)
    }, 0)
    averageAttendanceRate = Math.round(totalRate / completedWithAttendance.length)
  }

  return {
    totalLessons,
    completedLessons,
    cancelledLessons,
    scheduledLessons,
    averageAttendanceRate,
  }
}

/**
 * Проверка, может ли занятие быть отредактировано
 *
 * @param status - Текущий статус занятия
 * @returns true если занятие можно редактировать
 */
export function canEditLesson(status: TheoryLessonStatus): boolean {
  return status === 'SCHEDULED'
}

/**
 * Проверка, можно ли отменить занятие
 *
 * @param status - Текущий статус занятия
 * @returns true если занятие можно отменить
 */
export function canCancelLesson(status: TheoryLessonStatus): boolean {
  return status === 'SCHEDULED' || status === 'IN_PROGRESS'
}

/**
 * Проверка, можно ли отмечать посещаемость
 *
 * @param status - Текущий статус занятия
 * @returns true если можно отмечать посещаемость
 */
export function canMarkAttendance(status: TheoryLessonStatus): boolean {
  return status === 'IN_PROGRESS' || status === 'COMPLETED'
}

/**
 * Получение следующего статуса занятия
 *
 * @param currentStatus - Текущий статус
 * @param action - Действие: 'start', 'complete', 'cancel'
 * @returns Новый статус или null если переход невозможен
 */
export function getNextLessonStatus(
  currentStatus: TheoryLessonStatus,
  action: 'start' | 'complete' | 'cancel'
): TheoryLessonStatus | null {
  switch (action) {
    case 'start':
      if (currentStatus === 'SCHEDULED') {
        return 'IN_PROGRESS'
      }
      return null
    case 'complete':
      if (currentStatus === 'IN_PROGRESS') {
        return 'COMPLETED'
      }
      return null
    case 'cancel':
      if (currentStatus === 'SCHEDULED' || currentStatus === 'IN_PROGRESS') {
        return 'CANCELLED'
      }
      return null
    default:
      return null
  }
}

/**
 * Фильтрация активных членов группы (без leftAt)
 *
 * @param members - Все члены группы
 * @returns Только активные члены
 */
export function filterActiveMembers<T extends { leftAt: Date | null }>(members: T[]): T[] {
  return members.filter((m) => m.leftAt === null)
}
