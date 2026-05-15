/**
 * Форматирование дат с московским часовым поясом.
 * Все даты в КБС отображаются по Москве (UTC+3).
 */

const MOSCOW_TZ = 'Europe/Moscow'

/** Дата + время: "12 апр., 20:00" */
export function formatDateTime(date: Date | string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: MOSCOW_TZ,
  })
}

/** Полная дата + время: "12 апреля 2026, 20:00" */
export function formatDateTimeFull(date: Date | string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: MOSCOW_TZ,
  })
}

/** Только дата: "12 апреля 2026" */
export function formatDate(date: Date | string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: MOSCOW_TZ,
  })
}

/** Короткая дата: "12 апр." */
export function formatDateShort(date: Date | string | null): string {
  if (!date) return '—'
  const d = new Date(date)
  const currentYear = new Date().getFullYear()
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    timeZone: MOSCOW_TZ,
  }
  // Показываем год если не текущий
  if (d.getFullYear() !== currentYear) {
    options.year = 'numeric'
  }
  return d.toLocaleDateString('ru-RU', options)
}

/** Числовой формат: "07.04.2026" */
export function formatDateNumeric(date: Date | string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: MOSCOW_TZ,
  })
}

/** Только время: "20:00" */
export function formatTime(date: Date | string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: MOSCOW_TZ,
  })
}
