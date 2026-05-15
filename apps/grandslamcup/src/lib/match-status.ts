/**
 * Утилиты для отображения статуса матча.
 * Если матч SCHEDULED, но время уже прошло — показываем "Прошёл (нет результатов)".
 */

/** Отображаемый статус матча (включая псевдостатус) */
export type DisplayMatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED' | 'PAST_SCHEDULED'

/** Порог: матч считается прошедшим через 2 часа после scheduledAt */
const MATCH_DURATION_MS = 2 * 60 * 60 * 1000

/** Определить отображаемый статус матча */
export function getDisplayStatus(match: { status: string; scheduledAt: Date | string | null }): DisplayMatchStatus {
  if (match.status === 'SCHEDULED' && match.scheduledAt) {
    const scheduledTime = new Date(match.scheduledAt).getTime()
    if (scheduledTime + MATCH_DURATION_MS < Date.now()) {
      return 'PAST_SCHEDULED'
    }
  }
  return match.status as DisplayMatchStatus
}

/** Русское название статуса */
export const matchStatusLabels: Record<DisplayMatchStatus, string> = {
  SCHEDULED: 'Запланирован',
  LIVE: 'Идёт',
  FINISHED: 'Завершён',
  POSTPONED: 'Отложен',
  CANCELLED: 'Отменён',
  PAST_SCHEDULED: 'Прошёл (нет результатов)',
}

/** Цвет badge для статуса */
export const matchStatusColors: Record<DisplayMatchStatus, string> = {
  SCHEDULED: 'blue',
  LIVE: 'green',
  FINISHED: 'gray',
  POSTPONED: 'orange',
  CANCELLED: 'red',
  PAST_SCHEDULED: 'yellow',
}

/** Комбинированный маппинг: статус → { label, color } для Badge */
export const STATUS_MAP: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: 'Запланирован', color: 'blue' },
  LIVE: { label: 'LIVE', color: 'red' },
  FINISHED: { label: 'Завершён', color: 'green' },
  POSTPONED: { label: 'Перенесён', color: 'yellow' },
  CANCELLED: { label: 'Отменён', color: 'red' },
  PAST_SCHEDULED: { label: 'Прошёл', color: 'yellow' },
}

/** Является ли матч "прошедшим" (FINISHED или PAST_SCHEDULED) */
export function isMatchPast(match: { status: string; scheduledAt: Date | string | null }): boolean {
  const displayStatus = getDisplayStatus(match)
  return displayStatus === 'FINISHED' || displayStatus === 'PAST_SCHEDULED' || displayStatus === 'CANCELLED'
}

/** Является ли матч "предстоящим" */
export function isMatchUpcoming(match: { status: string; scheduledAt: Date | string | null }): boolean {
  const displayStatus = getDisplayStatus(match)
  return displayStatus === 'SCHEDULED'
}
