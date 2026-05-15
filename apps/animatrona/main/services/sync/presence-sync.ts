/**
 * PresenceSync — Сервис онлайн-статусов через Kubo PubSub
 *
 * Broadcast присутствия друзей через Kubo PubSub.
 * Каждый пользователь публикует свой статус в топик своего Friend Code.
 *
 * PubSub топики:
 * - animatrona/presence/<friendCode> — статус конкретного пользователя
 */

import { EventEmitter } from 'events'

import type { Message } from 'kubo-rpc-client'

import type { PresenceMessage, PresenceSettings, WatchingInfo } from '../../../shared/types/orbitdb'
import { createModuleLogger } from '../../utils/logger'
import { getKuboService } from '../kubo'

/** Тип handler'а для PubSub */
type PubSubHandler = (msg: Message) => void

import { getFriendRequestsSync } from './friend-requests-sync'
import { getUserProfileSync } from './user-profile-sync'

const log = createModuleLogger('PresenceSync')

/** Базовый топик для presence */
const PRESENCE_TOPIC_BASE = 'animatrona/presence/'

/** Интервал broadcast по умолчанию (30 секунд) */
const DEFAULT_BROADCAST_INTERVAL = 30000

/** Таймаут для считания пира offline (2 минуты без сообщений) */
const OFFLINE_TIMEOUT = 120000

/**
 * События PresenceSync
 */
export interface PresenceSyncEvents {
  /** Presence друга обновлён */
  'presence:updated': (peerId: string, presence: PresenceMessage) => void
  /** Друг перешёл в онлайн */
  'friend:online': (peerId: string) => void
  /** Друг перешёл в оффлайн */
  'friend:offline': (peerId: string) => void
  /** Ошибка */
  error: (error: Error) => void
}

/**
 * Singleton сервис для управления online presence
 */
export class PresenceSync extends EventEmitter {
  private static instance: PresenceSync | null = null

  /** Настройки */
  private settings: PresenceSettings = {
    showOnlineStatus: true,
    showWatching: true,
    broadcastInterval: DEFAULT_BROADCAST_INTERVAL,
  }

  /** Последние presence сообщения от друзей (peerId → message) */
  private friendPresence: Map<string, PresenceMessage> = new Map()

  /** Интервал broadcast */
  private broadcastInterval: ReturnType<typeof setInterval> | null = null

  /** Интервал проверки offline */
  private offlineCheckInterval: ReturnType<typeof setInterval> | null = null

  /** Текущий watching */
  private currentWatching: WatchingInfo | undefined

  /** Подписанные топики */
  private subscribedTopics: Set<string> = new Set()

  /** PubSub handlers для отписки (topic -> handler) */
  private topicHandlers: Map<string, PubSubHandler> = new Map()

  /** Флаг запуска */
  private isRunning = false

  private constructor() {
    super()
  }

  /**
   * Получить singleton
   */
  static getInstance(): PresenceSync {
    if (!PresenceSync.instance) {
      PresenceSync.instance = new PresenceSync()
    }
    return PresenceSync.instance
  }

  /**
   * Запустить сервис presence
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      log.info('Уже запущен')
      return
    }

    log.info('Запуск...')

    const kuboService = getKuboService()
    if (!kuboService.isRunning()) {
      log.warn('Kubo не запущен')
      return
    }

    this.isRunning = true

    // Подписываемся на топики друзей
    await this.subscribeToFriends()

    // Запускаем broadcast своего presence
    this.startBroadcast()

    // Запускаем проверку offline статусов
    this.startOfflineCheck()

    log.info('Запущен')
  }

  /**
   * Остановить сервис
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    log.info('Остановка...')

    // Отправляем offline статус
    await this.broadcastPresence('offline')

    // Останавливаем интервалы
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval)
      this.broadcastInterval = null
    }

    if (this.offlineCheckInterval) {
      clearInterval(this.offlineCheckInterval)
      this.offlineCheckInterval = null
    }

    // Отписываемся от топиков
    await this.unsubscribeFromAll()

    this.isRunning = false
    log.info('Остановлен')
  }

  /**
   * Обновить настройки
   */
  updateSettings(settings: Partial<PresenceSettings>): void {
    this.settings = { ...this.settings, ...settings }

    // Перезапускаем broadcast с новым интервалом
    if (this.isRunning && settings.broadcastInterval) {
      this.startBroadcast()
    }
  }

  /**
   * Обновить текущий watching статус
   */
  setWatching(watching: WatchingInfo | undefined): void {
    this.currentWatching = watching

    // Немедленный broadcast при изменении watching
    if (this.isRunning) {
      this.broadcastPresence('online')
    }
  }

  /**
   * Получить presence друга
   */
  getFriendPresence(peerId: string): PresenceMessage | undefined {
    return this.friendPresence.get(peerId)
  }

  /**
   * Получить все presence
   */
  getAllPresence(): Map<string, PresenceMessage> {
    return new Map(this.friendPresence)
  }

  /**
   * Проверить онлайн-статус друга
   */
  isFriendOnline(peerId: string): boolean {
    const presence = this.friendPresence.get(peerId)
    if (!presence) {
      return false
    }

    // Проверяем timeout
    const now = Date.now()
    return presence.status !== 'offline' && now - presence.timestamp < OFFLINE_TIMEOUT
  }

  /**
   * Подписаться на топики друзей
   */
  private async subscribeToFriends(): Promise<void> {
    const friendRequestsSync = getFriendRequestsSync()
    if (!friendRequestsSync.isReady()) {
      return
    }

    const friends = await friendRequestsSync.getFriends()

    for (const friend of friends) {
      await this.subscribeToFriend(friend.friendCode, friend.peerId)
    }
  }

  /**
   * Подписаться на топик друга
   */
  private async subscribeToFriend(friendCode: string, peerId: string): Promise<void> {
    const topic = `${PRESENCE_TOPIC_BASE}${friendCode}`

    if (this.subscribedTopics.has(topic)) {
      return
    }

    this.subscribedTopics.add(topic)

    // Запускаем listener в фоне
    this.startTopicListener(topic, peerId).catch((err) => {
      log.error('Topic listener error', { topic, error: String(err) })
    })

    log.info('Подписан на друга', { friendCode })
  }

  /**
   * Запустить listener для топика
   */
  private async startTopicListener(topic: string, peerId: string): Promise<void> {
    const kuboService = getKuboService()
    const client = kuboService.getClientOrNull()

    if (!client) {
      log.warn('Kubo client недоступен')
      return
    }

    // Создаём callback handler для kubo-rpc-client v6.x
    const handler: PubSubHandler = (msg: Message) => {
      try {
        this.handlePresenceMessage(peerId, msg.data)
      } catch (parseErr) {
        log.warn('Ошибка парсинга presence', { error: String(parseErr) })
      }
    }

    try {
      await client.pubsub.subscribe(topic, handler, {
        onError: (err) => {
          log.error('PubSub subscribe error', { topic, error: String(err) })
          // Удаляем ghost handler при ошибке соединения
          this.topicHandlers.delete(topic)
          this.subscribedTopics.delete(topic)
        },
      })
      // Сохраняем handler для отписки ПОСЛЕ успешного subscribe
      this.topicHandlers.set(topic, handler)
    } catch (err) {
      // Подписка не удалась — убираем из subscribedTopics
      this.subscribedTopics.delete(topic)
      log.error('PubSub subscribe error', { topic, error: String(err) })
    }
  }

  /**
   * Обработка входящего presence сообщения
   */
  private handlePresenceMessage(peerId: string, data: Uint8Array): void {
    try {
      const message: PresenceMessage = JSON.parse(new TextDecoder().decode(data))

      // Сохраняем presence
      const previousPresence = this.friendPresence.get(peerId)
      this.friendPresence.set(peerId, message)

      // Эмитим события
      this.emit('presence:updated', peerId, message)

      // Переход online/offline
      if (!previousPresence || previousPresence.status === 'offline') {
        if (message.status !== 'offline') {
          this.emit('friend:online', peerId)
          this.updateFriendDbStatus(peerId, true, message.watching)
        }
      } else if (message.status === 'offline') {
        this.emit('friend:offline', peerId)
        this.updateFriendDbStatus(peerId, false)
      } else {
        // Обновляем watching
        this.updateFriendDbStatus(peerId, true, message.watching)
      }
    } catch (err) {
      log.error('Ошибка парсинга presence', { error: String(err) })
    }
  }

  /**
   * Обновить статус друга в БД
   */
  private async updateFriendDbStatus(peerId: string, isOnline: boolean, watching?: WatchingInfo): Promise<void> {
    const friendRequestsSync = getFriendRequestsSync()
    if (!friendRequestsSync.isReady()) {
      return
    }

    await friendRequestsSync.updateFriendStatus(peerId, isOnline, watching)
  }

  /**
   * Broadcast своего presence
   */
  private async broadcastPresence(status: 'online' | 'away' | 'dnd' | 'offline'): Promise<void> {
    if (!this.settings.showOnlineStatus && status !== 'offline') {
      return // Не показываем онлайн-статус
    }

    const kuboService = getKuboService()
    const client = kuboService.getClientOrNull()

    if (!client) {
      return
    }

    const userProfileSync = getUserProfileSync()
    const profile = await userProfileSync.getProfile()

    if (!profile) {
      return
    }

    const message: PresenceMessage = {
      peerId: profile.peerId,
      friendCode: profile.friendCode,
      status,
      watching: this.settings.showWatching ? this.currentWatching : undefined,
      timestamp: Date.now(),
    }

    const topic = `${PRESENCE_TOPIC_BASE}${profile.friendCode}`
    const data = new TextEncoder().encode(JSON.stringify(message))

    try {
      await client.pubsub.publish(topic, data)
    } catch (err) {
      log.error('Ошибка broadcast', { error: String(err) })
    }
  }

  /**
   * Запустить периодический broadcast
   */
  private startBroadcast(): void {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval)
    }

    // Первый broadcast сразу
    this.broadcastPresence('online')

    // Периодический broadcast
    this.broadcastInterval = setInterval(() => {
      this.broadcastPresence('online')
    }, this.settings.broadcastInterval)
  }

  /**
   * Запустить проверку offline статусов
   */
  private startOfflineCheck(): void {
    if (this.offlineCheckInterval) {
      clearInterval(this.offlineCheckInterval)
    }

    this.offlineCheckInterval = setInterval(() => {
      const now = Date.now()

      for (const [peerId, presence] of this.friendPresence) {
        if (presence.status !== 'offline' && now - presence.timestamp > OFFLINE_TIMEOUT) {
          // Помечаем как offline
          const offlinePresence: PresenceMessage = {
            ...presence,
            status: 'offline',
            timestamp: now,
          }
          this.friendPresence.set(peerId, offlinePresence)
          this.emit('friend:offline', peerId)
          this.updateFriendDbStatus(peerId, false)
        }
      }
    }, 30000) // Проверяем каждые 30 секунд
  }

  /**
   * Отписаться от всех топиков
   */
  private async unsubscribeFromAll(): Promise<void> {
    const client = getKuboService().getClientOrNull()
    for (const [topic, handler] of this.topicHandlers) {
      try {
        if (client) {
          await client.pubsub.unsubscribe(topic, handler)
        }
      } catch (e) {
        log.debug('Ошибка отписки', { topic, error: String(e) })
      }
      this.subscribedTopics.delete(topic)
    }
    this.topicHandlers.clear()
  }

  /**
   * Добавить друга для подписки (вызывается при добавлении друга)
   */
  async addFriendSubscription(friendCode: string, peerId: string): Promise<void> {
    if (this.isRunning) {
      await this.subscribeToFriend(friendCode, peerId)
    }
  }

  /**
   * Удалить подписку на друга
   */
  async removeFriendSubscription(friendCode: string): Promise<void> {
    const topic = `${PRESENCE_TOPIC_BASE}${friendCode}`

    const handler = this.topicHandlers.get(topic)
    if (handler) {
      const client = getKuboService().getClientOrNull()
      if (client) {
        try {
          await client.pubsub.unsubscribe(topic, handler)
        } catch (e) {
          log.debug('Ошибка отписки', { topic, error: String(e) })
        }
      }
      this.topicHandlers.delete(topic)
    }

    this.subscribedTopics.delete(topic)
  }

  /**
   * Проверить, запущен ли сервис
   */
  isActive(): boolean {
    return this.isRunning
  }
}

/**
 * Получить singleton PresenceSync
 */
export function getPresenceSync(): PresenceSync {
  return PresenceSync.getInstance()
}
