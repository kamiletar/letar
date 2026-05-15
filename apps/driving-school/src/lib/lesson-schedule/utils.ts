import { formatDuration } from '@letar/format-utils'
import type { LessonDaySchedule, LessonSchedule } from './types'
import { type DayOfWeek, DAYS_OF_WEEK } from './types'

// Реэкспорт из общей библиотеки
export { formatDuration }

/**
 * Подсчитать количество активных дней занятий
 */
export function countLessonDays(schedule: LessonSchedule): number {
  return DAYS_OF_WEEK.filter((day) => schedule[day] !== null && schedule[day] !== undefined).length
}

/**
 * Получить список активных дней
 */
export function getActiveLessonDays(schedule: LessonSchedule): DayOfWeek[] {
  return DAYS_OF_WEEK.filter((day) => schedule[day] !== null && schedule[day] !== undefined)
}

/**
 * Проверить, есть ли занятия хотя бы в один день
 */
export function hasAnyLessonDays(schedule: LessonSchedule): boolean {
  return countLessonDays(schedule) > 0
}

/**
 * Вычислить время окончания занятия
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + durationMinutes
  const endHours = Math.floor(totalMinutes / 60) % 24
  const endMinutes = totalMinutes % 60
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
}

/**
 * Форматировать расписание дня в читаемый вид
 */
export function formatLessonDaySchedule(daySchedule: LessonDaySchedule | null | undefined): string {
  if (!daySchedule) {
    return 'Выходной'
  }
  const endTime = calculateEndTime(daySchedule.startTime, daySchedule.duration)
  return `${daySchedule.startTime}–${endTime} (${daySchedule.duration} мин)`
}

/**
 * Проверить, одинаковое ли расписание во все активные дни
 */
export function isUniformSchedule(schedule: LessonSchedule): boolean {
  const activeDays = getActiveLessonDays(schedule)
  if (activeDays.length <= 1) {
    return true
  }

  const first = schedule[activeDays[0]]
  return activeDays.every((day) => {
    const current = schedule[day]
    return current?.startTime === first?.startTime && current?.duration === first?.duration
  })
}

/**
 * Получить общее время занятий в неделю (в минутах)
 */
export function getTotalWeeklyMinutes(schedule: LessonSchedule): number {
  return DAYS_OF_WEEK.reduce((total, day) => {
    const daySchedule = schedule[day]
    return total + (daySchedule?.duration || 0)
  }, 0)
}
