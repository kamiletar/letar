/**
 * IPC handlers для репутации пользователя
 */

import { getReputationService } from '../services/reputation'
import { createHandler, forwardEvents } from '../utils/ipc-handler-factory'

/**
 * Регистрация IPC handlers для репутации
 */
export function registerReputationHandlers(): void {
  const service = getReputationService()

  // Получить текущую репутацию
  createHandler('reputation:get', () => service.getReputation())

  // Пересчитать репутацию
  createHandler('reputation:recalculate', () => service.recalculate())

  // Сбросить репутацию (для тестов)
  createHandler('reputation:reset', () => service.reset())

  // Получить текущий score
  createHandler('reputation:getScore', () => service.getScore())

  // Подписка на события репутации
  forwardEvents(service, 'reputation', {
    'reputation:updated': 'updated',
    'reputation:rankChanged': 'rankChanged',
  })
}
