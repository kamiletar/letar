/**
 * IPC Handlers для планировщика подписок
 *
 * Каналы:
 * - scheduler:getStatus — Получить статус планировщика
 * - scheduler:getConfig — Получить конфигурацию
 * - scheduler:updateConfig — Обновить конфигурацию
 * - scheduler:start — Запустить планировщик
 * - scheduler:stop — Остановить планировщик
 * - scheduler:checkNow — Проверить подписки сейчас
 */

import type { SchedulerConfig } from '../services/subscription-scheduler'
import {
  getSubscriptionScheduler,
  loadSchedulerConfig,
  updateSchedulerConfig,
} from '../services/subscription-scheduler'
import { broadcastToWindows, createHandler } from '../utils/ipc-handler-factory'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('SchedulerHandlers')

/** Флаг для предотвращения повторной регистрации */
let isRegistered = false

/**
 * Регистрация IPC handlers для планировщика
 */
export function registerSchedulerHandlers(): void {
  if (isRegistered) {
    log.warn('Handlers already registered, skipping')
    return
  }

  const scheduler = getSubscriptionScheduler()

  // Получить статус
  createHandler('scheduler:getStatus', () => scheduler.getStatus())

  // Получить конфигурацию
  createHandler('scheduler:getConfig', () => loadSchedulerConfig())

  // Обновить конфигурацию
  createHandler('scheduler:updateConfig', (updates: Partial<SchedulerConfig>) => {
    const config = updateSchedulerConfig(updates)
    // Перезапускаем планировщик с новыми настройками
    scheduler.restart()
    broadcastToWindows('scheduler:configUpdated', config)
    return config
  })

  // Запустить
  createHandler('scheduler:start', () => {
    scheduler.start()
    const status = scheduler.getStatus()
    broadcastToWindows('scheduler:statusChanged', status)
  })

  // Остановить
  createHandler('scheduler:stop', () => {
    scheduler.stop()
    const status = scheduler.getStatus()
    broadcastToWindows('scheduler:statusChanged', status)
  })

  // Проверить сейчас
  createHandler('scheduler:checkNow', () => scheduler.checkSubscriptions())

  isRegistered = true
  // Handlers registered (no logging needed)
}
