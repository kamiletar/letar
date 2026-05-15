import type { DayOfWeek, WorkingHoursSchedule } from './types'
import { DAY_NAMES_SHORT, DAYS_OF_WEEK } from './types'

/**
 * Получить текущий день недели в формате DayOfWeek
 */
export function getCurrentDayOfWeek(date: Date = new Date()): DayOfWeek {
  const dayIndex = date.getDay()
  // В JS воскресенье = 0, понедельник = 1, ...
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[dayIndex]
}

/**
 * Парсинг UTC offset из строки "UTC+3" в минуты
 */
export function parseUtcOffset(timezone: string | null | undefined): number {
  if (!timezone) {
    return 0
  }

  const match = timezone.match(/UTC([+-])(\d+)/)
  if (!match) {
    return 0
  }

  const sign = match[1] === '+' ? 1 : -1
  const hours = parseInt(match[2], 10)
  return sign * hours * 60
}

/**
 * Получить текущее время в часовом поясе филиала
 */
export function getTimeInTimezone(timezone: string | null | undefined, date: Date = new Date()): Date {
  const offsetMinutes = parseUtcOffset(timezone)
  const utc = date.getTime() + date.getTimezoneOffset() * 60000
  return new Date(utc + offsetMinutes * 60000)
}

/**
 * Проверить, открыт ли филиал сейчас
 */
export function isOpenNow(
  workingHours: WorkingHoursSchedule | null | undefined,
  timezone: string | null | undefined
): boolean {
  if (!workingHours) {
    return false
  }

  const now = getTimeInTimezone(timezone)
  const day = getCurrentDayOfWeek(now)
  const schedule = workingHours[day]

  if (!schedule) {
    return false
  }

  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  return currentTime >= schedule.open && currentTime < schedule.close
}

/**
 * Получить время до открытия/закрытия
 */
export function getNextStatusChange(
  workingHours: WorkingHoursSchedule | null | undefined,
  timezone: string | null | undefined
): { isOpen: boolean; nextChange: string | null; nextDay: string | null } {
  if (!workingHours) {
    return { isOpen: false, nextChange: null, nextDay: null }
  }

  const now = getTimeInTimezone(timezone)
  const currentDay = getCurrentDayOfWeek(now)
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  const schedule = workingHours[currentDay]

  // Если сейчас открыто - показать время закрытия
  if (schedule && currentTime >= schedule.open && currentTime < schedule.close) {
    return { isOpen: true, nextChange: schedule.close, nextDay: null }
  }

  // Если сегодня ещё не открылись
  if (schedule && currentTime < schedule.open) {
    return { isOpen: false, nextChange: schedule.open, nextDay: null }
  }

  // Ищем следующий рабочий день
  const currentIndex = DAYS_OF_WEEK.indexOf(currentDay)
  for (let i = 1; i <= 7; i++) {
    const nextIndex = (currentIndex + i) % 7
    const nextDay = DAYS_OF_WEEK[nextIndex]
    const nextSchedule = workingHours[nextDay]
    if (nextSchedule) {
      return {
        isOpen: false,
        nextChange: nextSchedule.open,
        nextDay: DAY_NAMES_SHORT[nextDay],
      }
    }
  }

  return { isOpen: false, nextChange: null, nextDay: null }
}

/**
 * Форматирование расписания для отображения
 */
export function formatWorkingHours(workingHours: WorkingHoursSchedule | null | undefined): string {
  if (!workingHours) {
    return 'Не указано'
  }

  const lines: string[] = []

  for (const day of DAYS_OF_WEEK) {
    const schedule = workingHours[day]
    if (schedule) {
      lines.push(`${DAY_NAMES_SHORT[day]}: ${schedule.open}–${schedule.close}`)
    } else {
      lines.push(`${DAY_NAMES_SHORT[day]}: выходной`)
    }
  }

  return lines.join(', ')
}

/**
 * Группировка одинаковых дней для компактного отображения
 * Пример: "Пн-Пт: 9:00-18:00, Сб-Вс: выходной"
 */
export function formatWorkingHoursCompact(workingHours: WorkingHoursSchedule | null | undefined): string[] {
  if (!workingHours) {
    return ['Не указано']
  }

  const result: string[] = []
  let i = 0

  while (i < DAYS_OF_WEEK.length) {
    const day = DAYS_OF_WEEK[i]
    const schedule = workingHours[day]
    let j = i

    // Ищем последовательность одинаковых расписаний
    while (j < DAYS_OF_WEEK.length - 1) {
      const nextDay = DAYS_OF_WEEK[j + 1]
      const nextSchedule = workingHours[nextDay]

      const same =
        (schedule === null && nextSchedule === null) ||
        (schedule === undefined && nextSchedule === undefined) ||
        (schedule && nextSchedule && schedule.open === nextSchedule.open && schedule.close === nextSchedule.close)

      if (!same) {
        break
      }
      j++
    }

    // Форматируем группу
    const startDay = DAY_NAMES_SHORT[day]
    const endDay = DAY_NAMES_SHORT[DAYS_OF_WEEK[j]]
    const dayRange = i === j ? startDay : `${startDay}–${endDay}`
    const timeRange = schedule ? `${schedule.open}–${schedule.close}` : 'выходной'

    result.push(`${dayRange}: ${timeRange}`)
    i = j + 1
  }

  return result
}

/**
 * Проверить, заполнено ли расписание (хотя бы один рабочий день)
 */
export function hasWorkingHours(workingHours: WorkingHoursSchedule | null | undefined): boolean {
  if (!workingHours) {
    return false
  }

  return DAYS_OF_WEEK.some((day) => workingHours[day] !== null && workingHours[day] !== undefined)
}

/**
 * Парсинг JSON из БД в WorkingHoursSchedule
 */
export function parseWorkingHours(json: unknown): WorkingHoursSchedule | null {
  if (!json || typeof json !== 'object') {
    return null
  }

  return json as WorkingHoursSchedule
}
