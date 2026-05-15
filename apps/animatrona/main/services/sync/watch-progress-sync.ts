/**
 * WatchProgressSync — Синхронизация прогресса просмотра через Kubo PubSub
 *
 * Стратегия:
 * 1. SQLite (Prisma) — единственный источник истины
 * 2. Kubo PubSub — синхронизация с друзьями
 * 3. Last-write-wins по полю lastWatchedAt
 *
 * Топики PubSub:
 * - animatrona/sync/${friendPeerId} — приватный канал для синхронизации с другом
 * - animatrona/sync-request/${myPeerId} — входящие запросы синхронизации
 */

import { EventEmitter } from 'events'

import type { Message } from 'kubo-rpc-client'

import type { WatchProgress } from '../../../renderer/src/generated/prisma'
import { getPrismaClient } from '../../utils/db'
import { withDbRetry } from '../../utils/db-retry'
import { createModuleLogger } from '../../utils/logger'
import { getKuboService } from '../kubo'

const log = createModuleLogger('WatchProgressSync')

/** Тип handler'а для PubSub */
type PubSubHandler = (msg: Message) => void

/**
 * Тип сообщения синхронизации
 */
interface SyncMessage {
  type: 'watch-progress' | 'sync-request' | 'sync-response'
  data: WatchProgressSyncData | SyncRequestData
  timestamp: number
  fromPeerId: string
}

/**
 * Данные прогресса для синхронизации
 */
interface WatchProgressSyncData {
  animeId: string
  episodeId: string
  currentTime: number
  completed: boolean
  volume: number
  selectedAudioTrackId: string | null
  selectedSubtitleTrackId: string | null
  lastWatchedAt: number // Unix timestamp для conflict resolution
}

/**
 * Запрос синхронизации (при подключении)
 */
interface SyncRequestData {
  since: number // Запросить обновления с этого timestamp
}

/**
 * События WatchProgressSync
 */
export interface WatchProgressSyncEvents {
  'progress:updated': (progress: WatchProgress, source: 'local' | 'remote') => void
  'sync:started': () => void
  'sync:completed': (count: number) => void
  'peer:connected': (peerId: string) => void
  error: (error: Error) => void
}

/**
 * Singleton сервис синхронизации прогресса
 */
export class WatchProgressSync extends EventEmitter {
  private static instance: WatchProgressSync | null = null

  /** Подписки на PubSub топики (topic -> handler для отписки) */
  private subscriptions: Map<string, PubSubHandler> = new Map()

  /** PeerId'ы друзей для синхронизации */
  private friendPeerIds: Set<string> = new Set()

  /** Флаг инициализации */
  private isInitialized = false

  /** Мой PeerId */
  private myPeerId: string | null = null

  private constructor() {
    super()
  }

  /**
   * Получить singleton экземпляр
   */
  static getInstance(): WatchProgressSync {
    if (!WatchProgressSync.instance) {
      WatchProgressSync.instance = new WatchProgressSync()
    }
    return WatchProgressSync.instance
  }

  /**
   * Инициализировать синхронизацию
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.info('Уже инициализирован')
      return
    }

    try {
      log.info('Инициализация...')

      const kuboService = getKuboService()
      if (!kuboService.isRunning()) {
        throw new Error('KuboService не запущен')
      }

      this.myPeerId = kuboService.getPeerId()
      if (!this.myPeerId) {
        throw new Error('PeerId не доступен')
      }

      // Подписываемся на входящие запросы синхронизации
      await this.subscribeToIncoming()

      this.isInitialized = true
      log.info('Инициализация завершена', { peerId: this.myPeerId.slice(-8) })
    } catch (error) {
      log.error('Ошибка инициализации', { error: String(error) })
      this.emit('error', error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * Остановить синхронизацию
   */
  async shutdown(): Promise<void> {
    log.info('Остановка...')

    // Отменяем все подписки
    const client = getKuboService().getClientOrNull()
    for (const [topic, handler] of this.subscriptions) {
      try {
        if (client) {
          await client.pubsub.unsubscribe(topic, handler)
        }
        log.info('Отписка от топика', { topic })
      } catch (e) {
        log.debug('Ошибка отписки', { topic, error: String(e) })
      }
    }
    this.subscriptions.clear()
    this.friendPeerIds.clear()

    this.isInitialized = false
    log.info('Остановлен')
  }

  /**
   * Добавить друга для синхронизации
   */
  async addFriend(friendPeerId: string): Promise<void> {
    if (this.friendPeerIds.has(friendPeerId)) {
      return
    }

    log.info('Добавление друга для синхронизации', { peerId: friendPeerId.slice(-8) })
    this.friendPeerIds.add(friendPeerId)

    // Подписываемся на его обновления
    await this.subscribeToFriend(friendPeerId)

    // Запрашиваем начальную синхронизацию
    await this.requestSync(friendPeerId)
  }

  /**
   * Удалить друга из синхронизации
   */
  removeFriend(friendPeerId: string): void {
    if (!this.friendPeerIds.has(friendPeerId)) {
      return
    }

    log.info('Удаление друга из синхронизации', { peerId: friendPeerId.slice(-8) })
    this.friendPeerIds.delete(friendPeerId)

    // Отписываемся от его топика
    const topic = this.getFriendTopic(friendPeerId)
    const handler = this.subscriptions.get(topic)
    if (handler) {
      const client = getKuboService().getClientOrNull()
      if (client) {
        client.pubsub.unsubscribe(topic, handler).catch((e) => {
          log.debug('Ошибка отписки', { topic, error: String(e) })
        })
      }
      this.subscriptions.delete(topic)
    }
  }

  /**
   * Сохранить прогресс и отправить друзьям
   */
  async saveProgress(
    animeId: string,
    episodeId: string,
    data: {
      currentTime: number
      completed?: boolean
      volume?: number
      selectedAudioTrackId?: string | null
      selectedSubtitleTrackId?: string | null
    }
  ): Promise<WatchProgress> {
    const prisma = getPrismaClient()

    // Сохраняем в SQLite (с retry при блокировке БД импортом)
    const progress = await withDbRetry(
      () =>
        prisma.watchProgress.upsert({
          where: {
            animeId_episodeId: { animeId, episodeId },
          },
          create: {
            animeId,
            episodeId,
            currentTime: data.currentTime,
            completed: data.completed ?? false,
            volume: data.volume ?? 1,
            selectedAudioTrackId: data.selectedAudioTrackId ?? null,
            selectedSubtitleTrackId: data.selectedSubtitleTrackId ?? null,
            lastWatchedAt: new Date(),
          },
          update: {
            currentTime: data.currentTime,
            completed: data.completed,
            volume: data.volume,
            selectedAudioTrackId: data.selectedAudioTrackId,
            selectedSubtitleTrackId: data.selectedSubtitleTrackId,
            lastWatchedAt: new Date(),
          },
        }),
      { context: 'sync:saveProgress' }
    )

    // Отправляем друзьям
    await this.broadcastProgress(progress)

    this.emit('progress:updated', progress, 'local')
    return progress
  }

  /**
   * Получить прогресс из SQLite
   */
  async getProgress(animeId: string, episodeId: string): Promise<WatchProgress | null> {
    const prisma = getPrismaClient()
    return prisma.watchProgress.findUnique({
      where: {
        animeId_episodeId: { animeId, episodeId },
      },
    })
  }

  /**
   * Получить весь прогресс для аниме
   */
  async getProgressForAnime(animeId: string): Promise<WatchProgress[]> {
    const prisma = getPrismaClient()
    return prisma.watchProgress.findMany({
      where: { animeId },
      orderBy: { lastWatchedAt: 'desc' },
    })
  }

  /**
   * Удалить прогресс
   */
  async deleteProgress(animeId: string, episodeId: string): Promise<void> {
    const prisma = getPrismaClient()
    await prisma.watchProgress.delete({
      where: {
        animeId_episodeId: { animeId, episodeId },
      },
    })
  }

  // === Private Methods ===

  /**
   * Подписаться на входящие сообщения
   */
  private async subscribeToIncoming(): Promise<void> {
    if (!this.myPeerId) {
      return
    }

    const topic = `animatrona/sync-request/${this.myPeerId}`
    await this.subscribeToPubSub(topic, this.handleIncomingMessage.bind(this))
  }

  /**
   * Подписаться на обновления от друга
   */
  private async subscribeToFriend(friendPeerId: string): Promise<void> {
    const topic = this.getFriendTopic(friendPeerId)
    await this.subscribeToPubSub(topic, this.handleFriendMessage.bind(this))
  }

  /**
   * Подписаться на PubSub топик
   */
  private async subscribeToPubSub(topic: string, handler: (msg: SyncMessage) => void): Promise<void> {
    const kuboService = getKuboService()
    const client = kuboService.getClientOrNull()
    if (!client) {
      log.warn('Kubo client недоступен, повтор через 5 сек', { topic })
      if (this.isInitialized) {
        setTimeout(() => {
          this.subscribeToPubSub(topic, handler).catch((e) => {
            log.error('Ошибка повторной подписки PubSub', { topic, error: String(e) })
          })
        }, 5000)
      }
      return
    }

    // Создаём обработчик для PubSub (callback API kubo-rpc-client v6.x)
    const pubsubHandler: PubSubHandler = (msg: Message) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(msg.data)) as SyncMessage
        handler(data)
      } catch (e) {
        log.debug('Ошибка парсинга сообщения', { error: String(e) })
      }
    }

    try {
      const wasSubscribed = this.subscriptions.has(topic)
      await client.pubsub.subscribe(topic, pubsubHandler, {
        onError: (err) => {
          log.warn('PubSub error', { topic, error: String(err) })
          // Удаляем ghost handler при ошибке соединения
          this.subscriptions.delete(topic)
          // Переподписываемся через 5 секунд — Kubo мог перезапуститься
          if (this.isInitialized) {
            setTimeout(() => {
              this.subscribeToPubSub(topic, handler).catch((e) => {
                log.error('Ошибка переподписки PubSub', { topic, error: String(e) })
              })
            }, 5000)
          }
        },
      })
      // Сохраняем handler для отписки ПОСЛЕ успешного subscribe
      this.subscriptions.set(topic, pubsubHandler)
      if (wasSubscribed) {
        log.info('PubSub переподписка успешна', { topic })
      } else {
        log.info('PubSub подписка успешна', { topic })
      }
    } catch (error: unknown) {
      log.warn('Ошибка подписки PubSub, повтор через 5 сек', { topic, error: String(error) })
      if (this.isInitialized) {
        setTimeout(() => {
          this.subscribeToPubSub(topic, handler).catch((e) => {
            log.error('Ошибка повторной подписки PubSub', { topic, error: String(e) })
          })
        }, 5000)
      }
    }
  }

  /**
   * Обработать входящее сообщение (запрос синхронизации)
   */
  private async handleIncomingMessage(msg: SyncMessage): Promise<void> {
    // Проверяем что это от друга
    if (!this.friendPeerIds.has(msg.fromPeerId)) {
      log.debug('Игнорируем сообщение от не-друга', { peerId: msg.fromPeerId.slice(-8) })
      return
    }

    if (msg.type === 'sync-request') {
      // Отправляем наши обновления
      await this.sendSyncResponse(msg.fromPeerId, (msg.data as SyncRequestData).since)
    }
  }

  /**
   * Обработать сообщение от друга
   */
  private async handleFriendMessage(msg: SyncMessage): Promise<void> {
    if (msg.type === 'watch-progress') {
      await this.mergeRemoteProgress(msg.data as WatchProgressSyncData, msg.fromPeerId)
    } else if (msg.type === 'sync-response') {
      // Массовое обновление из sync-response
      // (в данной реализации отправляем по одному)
      await this.mergeRemoteProgress(msg.data as WatchProgressSyncData, msg.fromPeerId)
    }
  }

  /**
   * Мержить удалённый прогресс (Last-Write-Wins)
   */
  private async mergeRemoteProgress(remote: WatchProgressSyncData, fromPeerId: string): Promise<void> {
    const prisma = getPrismaClient()

    // Получаем локальный прогресс
    const local = await prisma.watchProgress.findUnique({
      where: {
        animeId_episodeId: {
          animeId: remote.animeId,
          episodeId: remote.episodeId,
        },
      },
    })

    const remoteDate = new Date(remote.lastWatchedAt)

    // Last-Write-Wins: если удалённый новее — обновляем
    if (!local || local.lastWatchedAt < remoteDate) {
      const progress = await withDbRetry(
        () =>
          prisma.watchProgress.upsert({
            where: {
              animeId_episodeId: {
                animeId: remote.animeId,
                episodeId: remote.episodeId,
              },
            },
            create: {
              animeId: remote.animeId,
              episodeId: remote.episodeId,
              currentTime: remote.currentTime,
              completed: remote.completed,
              volume: remote.volume,
              selectedAudioTrackId: remote.selectedAudioTrackId,
              selectedSubtitleTrackId: remote.selectedSubtitleTrackId,
              lastWatchedAt: remoteDate,
            },
            update: {
              currentTime: remote.currentTime,
              completed: remote.completed,
              volume: remote.volume,
              selectedAudioTrackId: remote.selectedAudioTrackId,
              selectedSubtitleTrackId: remote.selectedSubtitleTrackId,
              lastWatchedAt: remoteDate,
            },
          }),
        { context: 'sync:mergeRemoteProgress' }
      )

      log.info('Применено обновление от друга', {
        peerId: fromPeerId.slice(-8),
        animeId: remote.animeId,
        episodeId: remote.episodeId,
      })

      this.emit('progress:updated', progress, 'remote')
    }
  }

  /**
   * Отправить прогресс друзьям
   */
  private async broadcastProgress(progress: WatchProgress): Promise<void> {
    if (this.friendPeerIds.size === 0) {
      return
    }

    const syncData: WatchProgressSyncData = {
      animeId: progress.animeId,
      episodeId: progress.episodeId,
      currentTime: progress.currentTime,
      completed: progress.completed,
      volume: progress.volume,
      selectedAudioTrackId: progress.selectedAudioTrackId,
      selectedSubtitleTrackId: progress.selectedSubtitleTrackId,
      lastWatchedAt: progress.lastWatchedAt.getTime(),
    }

    const message: SyncMessage = {
      type: 'watch-progress',
      data: syncData,
      timestamp: Date.now(),
      fromPeerId: this.myPeerId!,
    }

    // Отправляем каждому другу
    for (const friendPeerId of this.friendPeerIds) {
      await this.publishToFriend(friendPeerId, message)
    }
  }

  /**
   * Запросить синхронизацию у друга
   */
  private async requestSync(friendPeerId: string): Promise<void> {
    const prisma = getPrismaClient()

    // Находим самое старое обновление для определения since
    const oldest = await prisma.watchProgress.findFirst({
      orderBy: { lastWatchedAt: 'asc' },
    })

    const message: SyncMessage = {
      type: 'sync-request',
      data: {
        since: oldest?.lastWatchedAt.getTime() ?? 0,
      },
      timestamp: Date.now(),
      fromPeerId: this.myPeerId!,
    }

    // Отправляем в его входящий топик
    const topic = `animatrona/sync-request/${friendPeerId}`
    await this.publishMessage(topic, message)

    log.info('Запрошена синхронизация', { peerId: friendPeerId.slice(-8) })
  }

  /**
   * Отправить ответ на запрос синхронизации
   */
  private async sendSyncResponse(toPeerId: string, since: number): Promise<void> {
    const prisma = getPrismaClient()

    // Получаем все обновления после since
    const updates = await prisma.watchProgress.findMany({
      where: {
        lastWatchedAt: { gt: new Date(since) },
      },
    })

    log.info('Отправка sync response', {
      peerId: toPeerId.slice(-8),
      count: updates.length,
    })

    // Отправляем каждое обновление
    for (const progress of updates) {
      const syncData: WatchProgressSyncData = {
        animeId: progress.animeId,
        episodeId: progress.episodeId,
        currentTime: progress.currentTime,
        completed: progress.completed,
        volume: progress.volume,
        selectedAudioTrackId: progress.selectedAudioTrackId,
        selectedSubtitleTrackId: progress.selectedSubtitleTrackId,
        lastWatchedAt: progress.lastWatchedAt.getTime(),
      }

      const message: SyncMessage = {
        type: 'sync-response',
        data: syncData,
        timestamp: Date.now(),
        fromPeerId: this.myPeerId!,
      }

      await this.publishToFriend(toPeerId, message)
    }
  }

  /**
   * Отправить сообщение другу
   */
  private async publishToFriend(friendPeerId: string, message: SyncMessage): Promise<void> {
    const topic = this.getFriendTopic(friendPeerId)
    await this.publishMessage(topic, message)
  }

  /**
   * Отправить сообщение в PubSub топик
   */
  private async publishMessage(topic: string, message: SyncMessage): Promise<void> {
    const kuboService = getKuboService()
    const client = kuboService.getClientOrNull()
    if (!client) {
      return
    }

    try {
      const data = new TextEncoder().encode(JSON.stringify(message))
      await client.pubsub.publish(topic, data)
    } catch (error) {
      log.error('Ошибка публикации PubSub', { topic, error: String(error) })
    }
  }

  /**
   * Получить топик для синхронизации с другом
   */
  private getFriendTopic(friendPeerId: string): string {
    // Используем отсортированную пару PeerId для единого топика
    const peers = [this.myPeerId!, friendPeerId].sort()
    return `animatrona/sync/${peers[0].slice(-12)}/${peers[1].slice(-12)}`
  }
}

/**
 * Получить singleton экземпляр WatchProgressSync
 */
export function getWatchProgressSync(): WatchProgressSync {
  return WatchProgressSync.getInstance()
}
