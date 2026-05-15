/**
 * IPC handlers для статистики пользователя
 */

import { getDailyHistory, getStatsTracker, loadStats, resetStats } from '../services/stats'
import { createHandler, forwardEvents } from '../utils/ipc-handler-factory'

/**
 * Регистрация IPC handlers для статистики
 */
export function registerStatsHandlers(): void {
  const tracker = getStatsTracker()

  // Получить текущую статистику
  createHandler('stats:get', () => tracker.getStats())

  // Получить историю по дням
  createHandler('stats:getDailyHistory', (days = 30) => getDailyHistory(days))

  // Сбросить статистику (для тестов/отладки)
  createHandler('stats:reset', () => resetStats())

  // Получить текущую сессию
  createHandler('stats:getCurrentSession', () => {
    const stats = loadStats()
    const sessionMs = BigInt(stats.currentSessionMs || '0')
    return {
      isActive: sessionMs > 0n,
      durationMs: stats.currentSessionMs,
    }
  })

  // Подписка на события статистики
  forwardEvents(tracker, 'stats', {
    'stats:updated': 'updated',
    'stats:sessionStarted': 'sessionStarted',
    'stats:sessionEnded': 'sessionEnded',
  })
}
