/**
 * IPC handlers для достижений пользователя
 */

import { getAchievementService } from '../services/achievements'
import { broadcastToWindows, createHandler } from '../utils/ipc-handler-factory'

/**
 * Регистрация IPC handlers для достижений
 */
export function registerAchievementsHandlers(): void {
  const service = getAchievementService()

  // Получить все достижения с прогрессом
  createHandler('achievements:getAll', () => service.getAllWithProgress())

  // Получить разблокированные достижения
  createHandler('achievements:getUnlocked', () => service.getUnlocked())

  // Получить данные достижений
  createHandler('achievements:get', () => service.getAchievements())

  // Отметить достижение как показанное
  createHandler('achievements:markNotified', (id: string) => service.markNotified(id))

  // Проверить все достижения
  createHandler('achievements:check', () => service.checkAllAchievements())

  // Сбросить достижения (для тестов)
  createHandler('achievements:reset', () => service.reset())

  // Подписка на события достижений
  service.on('achievements:unlocked', (event) => {
    broadcastToWindows('achievements:unlocked', event)
  })

  service.on('achievements:progress', (id: string, progress: number) => {
    broadcastToWindows('achievements:progress', { id, progress })
  })
}
