/**
 * IPC Handlers для подписок (P2P Sharing)
 *
 * Каналы:
 * - subscription:list — Список всех подписок
 * - subscription:get — Получить подписку по ID
 * - subscription:add — Добавить подписку
 * - subscription:remove — Удалить подписку
 * - subscription:update — Обновить настройки подписки
 * - subscription:refresh — Обновить данные подписки (проверить IPNS)
 * - subscription:refreshAll — Обновить все подписки
 */

import type { PublishedLibrary, Subscription, SubscriptionCreateData } from '../../shared/types/ipfs'
import { cat } from '../services/ipfs/unixfs-service'
import {
  addSubscription,
  deleteSubscription,
  getAllSubscriptions,
  getSubscriptionById,
  refreshAllSubscriptions,
  refreshSubscription,
  updateSubscription,
} from '../services/subscription-store'
import { broadcastToWindows, createHandler } from '../utils/ipc-handler-factory'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('SubscriptionHandlers')

/** Флаг для предотвращения повторной регистрации */
let isRegistered = false

/**
 * Регистрация IPC handlers для подписок
 */
export function registerSubscriptionHandlers(): void {
  if (isRegistered) {
    log.warn('Handlers already registered, skipping')
    return
  }

  // Список всех подписок
  createHandler('subscription:list', () => getAllSubscriptions())

  // Получить подписку по ID
  createHandler('subscription:get', (id: string) => getSubscriptionById(id))

  // Добавить подписку
  createHandler('subscription:add', (data: SubscriptionCreateData) => {
    const subscription = addSubscription(data)
    broadcastToWindows('subscription:added', subscription)
    return subscription
  })

  // Удалить подписку
  createHandler('subscription:remove', (id: string) => {
    const subscription = getSubscriptionById(id)
    const result = deleteSubscription(id)
    if (result && subscription) {
      broadcastToWindows('subscription:removed', subscription)
    }
    return result
  })

  // Обновить настройки подписки
  createHandler(
    'subscription:update',
    (id: string, data: Partial<Pick<Subscription, 'displayName' | 'autoPin' | 'autoPinLimit'>>) => {
      const subscription = updateSubscription(id, data)
      if (subscription) {
        broadcastToWindows('subscription:updated', subscription)
      }
      return subscription
    },
  )

  // Обновить данные подписки (проверить IPNS)
  createHandler('subscription:refresh', async (id: string) => {
    const result = await refreshSubscription(id)
    broadcastToWindows('subscription:refreshed', result)
    return result
  })

  // Обновить все подписки
  createHandler('subscription:refreshAll', async () => {
    const results = await refreshAllSubscriptions()
    broadcastToWindows('subscription:allRefreshed', results)
    return results
  })

  // Получить библиотеку из IPFS по lastKnownCid (без IPNS resolution)
  createHandler('subscription:fetchLibrary', async (id: string) => {
    const subscription = getSubscriptionById(id)
    if (!subscription) {
      throw new Error(`Подписка ${id} не найдена`)
    }
    if (!subscription.lastKnownCid) {
      return null
    }

    try {
      const content = await cat(subscription.lastKnownCid)
      const library = JSON.parse(content.toString('utf-8')) as PublishedLibrary
      if (library.version !== 1) {
        return null
      }
      return library
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const cause = err instanceof Error && (err as Error & { cause?: unknown }).cause
        ? String((err as Error & { cause?: unknown }).cause)
        : ''
      // IPNS может указывать на директорию (пользователь не публиковал библиотеку)
      if (message.includes('dag node is a directory') || message.includes('is a directory')) {
        return null
      }
      // Таймаут — контент недоступен в сети IPFS (нет коннекта между нодами)
      if (
        cause.includes('UND_ERR_HEADERS_TIMEOUT')
        || cause.includes('HeadersTimeoutError')
        || message.includes('fetch failed')
        || message.includes('terminated')
      ) {
        return null
      }
      throw err
    }
  })

  isRegistered = true
  // Handlers registered (no logging needed)
}
