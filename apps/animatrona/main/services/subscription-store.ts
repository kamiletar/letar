/**
 * Subscription Store — Хранение подписок на библиотеки
 *
 * Подписки хранятся в JSON файле в userData директории.
 * Используется для P2P Sharing — подписка на библиотеки других пользователей.
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'

import type {
  PublishedLibrary,
  Subscription,
  SubscriptionCreateData,
  SubscriptionRefreshResult,
} from '../../shared/types/ipfs'
import { createModuleLogger } from '../utils/logger'
import { getIpnsService } from './ipfs'

const log = createModuleLogger('SubscriptionStore')

const SUBSCRIPTIONS_FILE = 'subscriptions.json'

/**
 * Получить путь к файлу подписок
 */
function getSubscriptionsPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, SUBSCRIPTIONS_FILE)
}

/**
 * Загрузить подписки из файла
 */
function loadSubscriptions(): Subscription[] {
  try {
    const filePath = getSubscriptionsPath()
    if (!fs.existsSync(filePath)) {
      return []
    }
    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    log.error('Ошибка загрузки подписок', { error })
    return []
  }
}

/**
 * Сохранить подписки в файл
 */
function saveSubscriptions(subscriptions: Subscription[]): void {
  try {
    const filePath = getSubscriptionsPath()
    fs.writeFileSync(filePath, JSON.stringify(subscriptions, null, 2), 'utf-8')
  } catch (error) {
    log.error('Ошибка сохранения подписок', { error })
    throw error
  }
}

/**
 * Получить все подписки
 */
export function getAllSubscriptions(): Subscription[] {
  return loadSubscriptions()
}

/**
 * Получить подписку по ID
 */
export function getSubscriptionById(id: string): Subscription | null {
  const subscriptions = loadSubscriptions()
  return subscriptions.find((s) => s.id === id) || null
}

/**
 * Получить подписку по IPNS имени
 */
export function getSubscriptionByIpnsName(ipnsName: string): Subscription | null {
  const subscriptions = loadSubscriptions()
  return subscriptions.find((s) => s.ipnsName === ipnsName) || null
}

/**
 * Добавить подписку
 */
export function addSubscription(data: SubscriptionCreateData): Subscription {
  const subscriptions = loadSubscriptions()

  // Проверяем, нет ли уже такой подписки
  const existing = subscriptions.find((s) => s.ipnsName === data.ipnsName)
  if (existing) {
    throw new Error(`Подписка на ${data.ipnsName} уже существует`)
  }

  const now = new Date().toISOString()
  const subscription: Subscription = {
    id: uuidv4(),
    ipnsName: data.ipnsName,
    displayName: data.displayName,
    lastKnownCid: null,
    lastCheckedAt: null,
    autoPin: data.autoPin ?? false,
    autoPinLimit: data.autoPinLimit ?? 0,
    createdAt: now,
    updatedAt: now,
  }

  subscriptions.push(subscription)
  saveSubscriptions(subscriptions)

  log.info('Добавлена подписка', { displayName: data.displayName, ipnsName: data.ipnsName })
  return subscription
}

/**
 * Удалить подписку
 */
export function deleteSubscription(id: string): boolean {
  const subscriptions = loadSubscriptions()
  const index = subscriptions.findIndex((s) => s.id === id)

  if (index === -1) {
    return false
  }

  const [removed] = subscriptions.splice(index, 1)
  saveSubscriptions(subscriptions)

  log.info('Удалена подписка', { displayName: removed.displayName })
  return true
}

/**
 * Обновить подписку
 */
export function updateSubscription(
  id: string,
  data: Partial<Pick<Subscription, 'displayName' | 'autoPin' | 'autoPinLimit' | 'lastKnownCid' | 'lastCheckedAt'>>,
): Subscription | null {
  const subscriptions = loadSubscriptions()
  const subscription = subscriptions.find((s) => s.id === id)

  if (!subscription) {
    return null
  }

  // Обновляем поля
  if (data.displayName !== undefined) {
    subscription.displayName = data.displayName
  }
  if (data.autoPin !== undefined) {
    subscription.autoPin = data.autoPin
  }
  if (data.autoPinLimit !== undefined) {
    subscription.autoPinLimit = data.autoPinLimit
  }
  if (data.lastKnownCid !== undefined) {
    subscription.lastKnownCid = data.lastKnownCid
  }
  if (data.lastCheckedAt !== undefined) {
    subscription.lastCheckedAt = data.lastCheckedAt
  }

  subscription.updatedAt = new Date().toISOString()

  saveSubscriptions(subscriptions)
  return subscription
}

/**
 * Обновить данные подписки (проверить обновления библиотеки)
 */
export async function refreshSubscription(id: string): Promise<SubscriptionRefreshResult> {
  const subscription = getSubscriptionById(id)
  if (!subscription) {
    throw new Error(`Подписка ${id} не найдена`)
  }

  const ipnsService = getIpnsService()

  log.info('Обновление подписки', { displayName: subscription.displayName })

  // Разрешаем IPNS имя
  const resolved = await ipnsService.resolve(subscription.ipnsName)
  const newCid = resolved.cid
  const hasUpdates = newCid !== subscription.lastKnownCid

  // Пытаемся получить библиотеку
  // Новый формат: CID → директория с library.json
  // Старый формат: CID → голый JSON
  let library: PublishedLibrary | null = null
  try {
    const { cat } = await import('./ipfs')
    let content: Buffer

    try {
      // Новый формат: директория с library.json
      content = await cat(`${newCid}/library.json`)
    } catch {
      // Fallback: старый формат — голый JSON по CID
      content = await cat(newCid)
    }

    library = JSON.parse(content.toString('utf-8')) as PublishedLibrary

    // Валидация версии формата
    if (library.version !== 1) {
      log.warn('Неподдерживаемая версия формата', { version: library.version })
      library = null
    }
  } catch (err) {
    log.warn('Не удалось получить библиотеку', { error: err })
  }

  // Обновляем подписку
  const now = new Date().toISOString()
  const updated = updateSubscription(id, {
    lastKnownCid: newCid,
    lastCheckedAt: now,
  })

  log.info('Подписка обновлена', {
    displayName: subscription.displayName,
    hasUpdates,
  })

  return {
    subscription: updated || subscription,
    newCid: hasUpdates ? newCid : null,
    library,
    hasUpdates,
  }
}

/**
 * Обновить все подписки
 */
export async function refreshAllSubscriptions(): Promise<SubscriptionRefreshResult[]> {
  const subscriptions = loadSubscriptions()
  const results: SubscriptionRefreshResult[] = []

  for (const sub of subscriptions) {
    try {
      const result = await refreshSubscription(sub.id)
      results.push(result)
    } catch (err) {
      log.error('Ошибка обновления подписки', { displayName: sub.displayName, error: err })
      // Добавляем результат с ошибкой
      results.push({
        subscription: sub,
        newCid: null,
        library: null,
        hasUpdates: false,
      })
    }
  }

  return results
}
