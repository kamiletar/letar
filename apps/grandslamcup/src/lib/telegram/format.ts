/**
 * Форматирование дат для Telegram-сообщений.
 */

import { formatTime } from '@/lib/format-date'

const MOSCOW_TZ = 'Europe/Moscow'

/** "Сб, 12 апреля 2026, 19:00" */
export function formatTelegramDate(date: Date | string): string {
  const d = new Date(date)
  const weekday = d.toLocaleDateString('ru-RU', { weekday: 'short', timeZone: MOSCOW_TZ })
  const day = d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: MOSCOW_TZ,
  })
  const time = formatTime(d)
  return `${weekday}, ${day}, ${time}`
}

/** "Сб, 12 апр." — короткая дата для еженедельника */
export function formatTelegramDateShort(date: Date | string): string {
  const d = new Date(date)
  const weekday = d.toLocaleDateString('ru-RU', { weekday: 'short', timeZone: MOSCOW_TZ })
  const day = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', timeZone: MOSCOW_TZ })
  return `${weekday}, ${day}`
}
