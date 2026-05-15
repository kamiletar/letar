import { CronExpressionParser } from 'cron-parser'

/**
 * Получает следующую дату запуска по cron выражению
 */
export function getNextRunDate(schedule: string): Date | null {
  try {
    const interval = CronExpressionParser.parse(schedule)
    return interval.next().toDate()
  } catch {
    return null
  }
}

/**
 * Получает список следующих N запусков по cron выражению
 */
export function getNextRunDates(schedule: string, count = 5): Date[] {
  try {
    const interval = CronExpressionParser.parse(schedule)
    const dates: Date[] = []
    for (let i = 0; i < count; i++) {
      dates.push(interval.next().toDate())
    }
    return dates
  } catch {
    return []
  }
}

/**
 * Валидирует cron выражение
 */
export function validateCronExpression(schedule: string): { valid: boolean; error?: string } {
  try {
    CronExpressionParser.parse(schedule)
    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Некорректное cron выражение',
    }
  }
}

/**
 * Генерирует человеко-читаемое описание cron выражения
 */
export function describeCronExpression(schedule: string): string {
  const parts = schedule.split(' ')
  if (parts.length !== 5) {
    return schedule
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

  // Простые случаи
  if (minute === '0' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Каждый день в ${hour}:00`
  }
  if (minute !== '*' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Каждый день в ${hour}:${minute.padStart(2, '0')}`
  }
  if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Каждую минуту'
  }
  if (minute.startsWith('*/') && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Каждые ${minute.slice(2)} минут`
  }
  if (minute === '0' && hour.startsWith('*/') && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Каждые ${hour.slice(2)} часов`
  }

  return schedule
}
