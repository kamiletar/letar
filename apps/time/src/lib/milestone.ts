/** Интервал юбилеев в часах (каждые 10 000 часов) */
export const MILESTONE_INTERVAL = 10_000

/** Типы уведомлений и их окна (в часах до юбилея) */
export const NOTIFICATION_WINDOWS = {
  month: 720, // 30 дней
  week: 168, // 7 дней
  day: 24, // 1 день
  hour: 1, // 1 час
  '5min': 5 / 60, // 5 минут
} as const

export type NotificationType = keyof typeof NOTIFICATION_WINDOWS

/** Текущий UNIX-час (количество полных часов с 1 января 1970) */
export function getCurrentUnixHour(): number {
  return Math.floor(Date.now() / 3_600_000)
}

/** Следующий юбилейный час (ближайшее кратное interval, строго больше current) */
export function getNextMilestone(currentHour?: number, interval = MILESTONE_INTERVAL): number {
  const hour = currentHour ?? getCurrentUnixHour()
  return Math.ceil((hour + 1) / interval) * interval
}

/** Миллисекунды до юбилейного часа */
export function getTimeToMilestone(milestoneHour: number): number {
  return milestoneHour * 3_600_000 - Date.now()
}

/** Проверяет, является ли час юбилейным */
export function isMilestoneHour(hour: number, interval = MILESTONE_INTERVAL): boolean {
  return hour > 0 && hour % interval === 0
}

/**
 * Определяет, какие типы уведомлений нужно отправить прямо сейчас.
 * Возвращает типы, чьи окна совпадают с текущим временем до юбилея.
 * Каждый тип имеет допуск ±30 минут (кроме 5min — ±3 минуты).
 */
export function getActiveNotificationTypes(milestoneHour: number): NotificationType[] {
  const hoursLeft = (milestoneHour * 3_600_000 - Date.now()) / 3_600_000
  const active: NotificationType[] = []

  for (const [type, windowHours] of Object.entries(NOTIFICATION_WINDOWS)) {
    // Допуск: 30 минут для основных, 3 минуты для 5min
    const tolerance = type === '5min' ? 3 / 60 : 0.5
    if (Math.abs(hoursLeft - windowHours) <= tolerance) {
      active.push(type as NotificationType)
    }
  }

  return active
}

/** Разбивает миллисекунды на дни, часы, минуты, секунды */
export function formatTimeRemaining(ms: number): {
  days: number
  hours: number
  minutes: number
  seconds: number
} {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}
