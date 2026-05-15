/**
 * FriendRequestsSync — Синхронизация запросов в друзья через SQLite + Kubo PubSub
 *
 * Стратегия:
 * 1. SQLite (Prisma) — локальное хранение запросов и списка друзей
 * 2. Kubo PubSub — уведомление о новых запросах
 * 3. Direct messaging через PubSub для отправки запросов
 *
 * PubSub топики:
 * - animatrona/dm/<peerId> — direct messages (запросы в друзья, ответы)
 */

import { EventEmitter } from 'events'

import type { Message } from 'kubo-rpc-client'

import type { Friend, FriendRequest } from '../../../renderer/src/generated/prisma'
import { getPrismaClient } from '../../utils/db'
import { createModuleLogger } from '../../utils/logger'
import { getKuboService } from '../kubo'

/** Тип handler'а для PubSub */
type PubSubHandler = (msg: Message) => void

import { generateFriendCode } from './friend-code'
import { getUserProfileSync } from './user-profile-sync'

const log = createModuleLogger('FriendRequestsSync')

/** Тип сообщения в PubSub */
type DMMessageType = 'friend-request' | 'friend-request-accepted' | 'friend-request-rejected'

/** Direct message в PubSub */
interface DirectMessage {
  type: DMMessageType
  fromPeerId: string
  fromFriendCode: string
  fromDisplayName: string
  requestId?: string
  timestamp: number
}

/** Информация о текущем просмотре */
interface WatchingInfo {
  animeName: string
  episodeNumber: number
  progress: number
}

/**
 * События FriendRequestsSync
 */
export interface FriendRequestsSyncEvents {
  /** Получен новый запрос в друзья */
  'request:received': (request: FriendRequest) => void
  /** Статус запроса изменён */
  'request:updated': (request: FriendRequest) => void
  /** Список друзей обновлён */
  'friends:updated': (friends: Friend[]) => void
  /** Ошибка */
  error: (error: Error) => void
}

/**
 * Singleton сервис синхронизации запросов в друзья
 */
export class FriendRequestsSync extends EventEmitter {
  private static instance: FriendRequestsSync | null = null

  /** Флаг инициализации */
  private isInitialized = false

  /** PubSub handler для отписки */
  private pubsubHandler: PubSubHandler | null = null

  /** Текущий DM топик */
  private dmTopic: string | null = null

  private constructor() {
    super()
  }

  /**
   * Получить singleton экземпляр
   */
  static getInstance(): FriendRequestsSync {
    if (!FriendRequestsSync.instance) {
      FriendRequestsSync.instance = new FriendRequestsSync()
    }
    return FriendRequestsSync.instance
  }

  /**
   * Инициализировать сервис
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.info('Уже инициализирован')
      return
    }

    try {
      log.info('Инициализация...')

      // Подписываемся на direct messages
      await this.subscribeToDM()

      this.isInitialized = true
      log.info('Инициализация завершена')
    } catch (error) {
      log.error('Ошибка инициализации', { error: String(error) })
      this.emit('error', error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * Остановить сервис
   */
  async shutdown(): Promise<void> {
    log.info('Остановка...')

    // Отписываемся от PubSub
    if (this.pubsubHandler && this.dmTopic) {
      const client = getKuboService().getClientOrNull()
      if (client) {
        try {
          await client.pubsub.unsubscribe(this.dmTopic, this.pubsubHandler)
        } catch (e) {
          log.debug('Ошибка отписки', { error: String(e) })
        }
      }
      this.pubsubHandler = null
      this.dmTopic = null
    }

    this.isInitialized = false
    log.info('Остановлен')
  }

  /**
   * Подписаться на direct messages
   */
  private async subscribeToDM(): Promise<void> {
    const kuboService = getKuboService()
    const myPeerId = kuboService.getPeerId()
    const client = kuboService.getClientOrNull()

    if (!myPeerId || !client) {
      log.warn('PeerId или client недоступен, повтор через 5 сек')
      if (this.isInitialized) {
        setTimeout(() => {
          this.subscribeToDM().catch((e) => {
            log.error('Ошибка переподписки на DM', { error: String(e) })
          })
        }, 5000)
      }
      return
    }

    const topic = `animatrona/dm/${myPeerId}`
    this.dmTopic = topic

    // Создаём callback handler для kubo-rpc-client v6.x
    const handler: PubSubHandler = (msg: Message) => {
      try {
        const data = new TextDecoder().decode(msg.data)
        const message = JSON.parse(data) as DirectMessage
        this.handleDirectMessage(message).catch((err) => {
          log.error('Ошибка обработки DM', { error: String(err) })
        })
      } catch (parseErr) {
        log.warn('Ошибка парсинга DM', { error: String(parseErr) })
      }
    }

    try {
      await client.pubsub.subscribe(topic, handler, {
        onError: (err) => {
          log.warn('DM subscribe error', { error: String(err) })
          // Очищаем handler при ошибке соединения
          this.pubsubHandler = null
          this.dmTopic = null
          // Переподписываемся через 5 секунд — Kubo мог перезапуститься
          if (this.isInitialized) {
            setTimeout(() => {
              this.subscribeToDM().catch((e) => {
                log.error('Ошибка переподписки на DM', { error: String(e) })
              })
            }, 5000)
          }
        },
      })
      // Сохраняем handler ПОСЛЕ успешного subscribe
      this.pubsubHandler = handler
      log.info('Подписка на DM', { topic })
    } catch (err) {
      // Подписка не удалась — очищаем и планируем retry
      this.dmTopic = null
      log.warn('DM subscribe failed, повтор через 5 сек', { error: String(err) })
      if (this.isInitialized) {
        setTimeout(() => {
          this.subscribeToDM().catch((e) => {
            log.error('Ошибка переподписки на DM', { error: String(e) })
          })
        }, 5000)
      }
    }
  }

  /**
   * Обработать входящее direct message
   */
  private async handleDirectMessage(message: DirectMessage): Promise<void> {
    log.info('Получено DM', { type: message.type, from: message.fromPeerId.slice(-8) })

    const prisma = getPrismaClient()
    const kuboService = getKuboService()
    const myPeerId = kuboService.getPeerId()

    if (!myPeerId) {
      return
    }

    switch (message.type) {
      case 'friend-request': {
        // Проверяем, нет ли уже такого запроса
        const existing = await prisma.friendRequest.findFirst({
          where: {
            fromPeerId: message.fromPeerId,
            toPeerId: myPeerId,
            status: 'pending',
          },
        })

        if (existing) {
          log.info('Запрос уже существует', { requestId: existing.id })
          return
        }

        // Создаём новый запрос
        const request = await prisma.friendRequest.create({
          data: {
            fromPeerId: message.fromPeerId,
            fromFriendCode: message.fromFriendCode,
            fromDisplayName: message.fromDisplayName,
            toPeerId: myPeerId,
            status: 'pending',
          },
        })

        log.info('Создан входящий запрос', { requestId: request.id })
        this.emit('request:received', request)
        break
      }

      case 'friend-request-accepted': {
        // Обновляем наш исходящий запрос
        if (!message.requestId) {
          return
        }

        const request = await prisma.friendRequest.findUnique({
          where: { id: message.requestId },
        })

        if (!request) {
          return
        }

        // Обновляем статус запроса
        const updated = await prisma.friendRequest.update({
          where: { id: message.requestId },
          data: {
            status: 'accepted',
            respondedAt: new Date(),
          },
        })

        // Добавляем в друзья
        await prisma.friend.upsert({
          where: { peerId: message.fromPeerId },
          create: {
            peerId: message.fromPeerId,
            friendCode: message.fromFriendCode,
            displayName: message.fromDisplayName,
            friendsSince: new Date(),
          },
          update: {
            friendCode: message.fromFriendCode,
            displayName: message.fromDisplayName,
          },
        })

        log.info('Запрос принят другом', { requestId: message.requestId })
        this.emit('request:updated', updated)
        this.emit('friends:updated', await this.getFriends())
        break
      }

      case 'friend-request-rejected': {
        // Обновляем наш исходящий запрос
        if (!message.requestId) {
          return
        }

        const updated = await prisma.friendRequest.update({
          where: { id: message.requestId },
          data: {
            status: 'rejected',
            respondedAt: new Date(),
          },
        })

        log.info('Запрос отклонён', { requestId: message.requestId })
        this.emit('request:updated', updated)
        break
      }
    }
  }

  /**
   * Отправить запрос в друзья
   */
  async sendRequest(targetPeerId: string): Promise<FriendRequest | null> {
    const kuboService = getKuboService()
    const client = kuboService.getClientOrNull()
    const myPeerId = kuboService.getPeerId()

    if (!client || !myPeerId) {
      log.error('Kubo недоступен')
      return null
    }

    const prisma = getPrismaClient()

    // Получаем свой профиль
    const userProfileSync = getUserProfileSync()
    const myProfile = await userProfileSync.getProfile()

    if (!myProfile) {
      log.error('Профиль не найден')
      return null
    }

    // Проверяем, нет ли уже запроса
    const existing = await prisma.friendRequest.findFirst({
      where: {
        fromPeerId: myPeerId,
        toPeerId: targetPeerId,
        status: 'pending',
      },
    })

    if (existing) {
      log.warn('Запрос уже существует')
      return existing
    }

    // Создаём запрос в локальной БД
    const request = await prisma.friendRequest.create({
      data: {
        fromPeerId: myPeerId,
        fromFriendCode: myProfile.friendCode,
        fromDisplayName: myProfile.displayName,
        toPeerId: targetPeerId,
        status: 'pending',
      },
    })

    // Отправляем через PubSub
    const message: DirectMessage = {
      type: 'friend-request',
      fromPeerId: myPeerId,
      fromFriendCode: myProfile.friendCode,
      fromDisplayName: myProfile.displayName,
      requestId: request.id,
      timestamp: Date.now(),
    }

    const topic = `animatrona/dm/${targetPeerId}`
    await client.pubsub.publish(topic, new TextEncoder().encode(JSON.stringify(message)))

    log.info('Запрос отправлен', { requestId: request.id, to: targetPeerId.slice(-8) })
    return request
  }

  /**
   * Получить входящие запросы
   */
  async getIncomingRequests(): Promise<FriendRequest[]> {
    const kuboService = getKuboService()
    const myPeerId = kuboService.getPeerId()

    if (!myPeerId) {
      return []
    }

    const prisma = getPrismaClient()
    return prisma.friendRequest.findMany({
      where: {
        toPeerId: myPeerId,
        status: 'pending',
      },
      orderBy: { sentAt: 'desc' },
    })
  }

  /**
   * Получить исходящие запросы
   */
  async getOutgoingRequests(): Promise<FriendRequest[]> {
    const kuboService = getKuboService()
    const myPeerId = kuboService.getPeerId()

    if (!myPeerId) {
      return []
    }

    const prisma = getPrismaClient()
    return prisma.friendRequest.findMany({
      where: {
        fromPeerId: myPeerId,
        status: 'pending',
      },
      orderBy: { sentAt: 'desc' },
    })
  }

  /**
   * Принять запрос в друзья
   */
  async acceptRequest(requestId: string): Promise<boolean> {
    const kuboService = getKuboService()
    const client = kuboService.getClientOrNull()
    const myPeerId = kuboService.getPeerId()

    if (!client || !myPeerId) {
      log.error('Kubo недоступен')
      return false
    }

    const prisma = getPrismaClient()

    // Находим запрос
    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    })

    if (!request) {
      log.error('Запрос не найден', { requestId })
      return false
    }

    // Получаем свой профиль
    const userProfileSync = getUserProfileSync()
    const myProfile = await userProfileSync.getProfile()

    if (!myProfile) {
      log.error('Профиль не найден')
      return false
    }

    // Обновляем статус запроса
    const updated = await prisma.friendRequest.update({
      where: { id: requestId },
      data: {
        status: 'accepted',
        respondedAt: new Date(),
      },
    })

    // Добавляем в друзья
    await prisma.friend.upsert({
      where: { peerId: request.fromPeerId },
      create: {
        peerId: request.fromPeerId,
        friendCode: request.fromFriendCode,
        displayName: request.fromDisplayName,
        friendsSince: new Date(),
      },
      update: {
        friendCode: request.fromFriendCode,
        displayName: request.fromDisplayName,
      },
    })

    // Уведомляем отправителя через PubSub
    const message: DirectMessage = {
      type: 'friend-request-accepted',
      fromPeerId: myPeerId,
      fromFriendCode: myProfile.friendCode,
      fromDisplayName: myProfile.displayName,
      requestId: request.id,
      timestamp: Date.now(),
    }

    const topic = `animatrona/dm/${request.fromPeerId}`
    await client.pubsub.publish(topic, new TextEncoder().encode(JSON.stringify(message)))

    log.info('Запрос принят', { requestId })
    this.emit('request:updated', updated)
    this.emit('friends:updated', await this.getFriends())

    return true
  }

  /**
   * Отклонить запрос в друзья
   */
  async rejectRequest(requestId: string): Promise<boolean> {
    const kuboService = getKuboService()
    const client = kuboService.getClientOrNull()
    const myPeerId = kuboService.getPeerId()

    if (!client || !myPeerId) {
      log.error('Kubo недоступен')
      return false
    }

    const prisma = getPrismaClient()

    // Находим запрос
    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId },
    })

    if (!request) {
      log.error('Запрос не найден', { requestId })
      return false
    }

    // Получаем свой профиль для уведомления
    const userProfileSync = getUserProfileSync()
    const myProfile = await userProfileSync.getProfile()

    // Обновляем статус
    const updated = await prisma.friendRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        respondedAt: new Date(),
      },
    })

    // Уведомляем отправителя через PubSub
    if (myProfile) {
      const message: DirectMessage = {
        type: 'friend-request-rejected',
        fromPeerId: myPeerId,
        fromFriendCode: myProfile.friendCode,
        fromDisplayName: myProfile.displayName,
        requestId: request.id,
        timestamp: Date.now(),
      }

      const topic = `animatrona/dm/${request.fromPeerId}`
      await client.pubsub.publish(topic, new TextEncoder().encode(JSON.stringify(message)))
    }

    log.info('Запрос отклонён', { requestId })
    this.emit('request:updated', updated)

    return true
  }

  /**
   * Получить список друзей
   */
  async getFriends(): Promise<Friend[]> {
    const prisma = getPrismaClient()
    return prisma.friend.findMany({
      orderBy: { displayName: 'asc' },
    })
  }

  /**
   * Удалить из друзей
   */
  async removeFriend(peerId: string): Promise<boolean> {
    const prisma = getPrismaClient()

    const friend = await prisma.friend.findUnique({
      where: { peerId },
    })

    if (!friend) {
      log.error('Друг не найден', { peerId: peerId.slice(-8) })
      return false
    }

    await prisma.friend.delete({
      where: { peerId },
    })

    log.info('Друг удалён', { peerId: peerId.slice(-8) })
    this.emit('friends:updated', await this.getFriends())

    return true
  }

  /**
   * Заблокировать пользователя
   */
  async blockUser(peerId: string): Promise<boolean> {
    const prisma = getPrismaClient()
    const kuboService = getKuboService()
    const myPeerId = kuboService.getPeerId()

    if (!myPeerId) {
      return false
    }

    // Удаляем из друзей если есть
    await this.removeFriend(peerId)

    // Создаём blocked запись
    await prisma.friendRequest.create({
      data: {
        fromPeerId: myPeerId,
        fromFriendCode: generateFriendCode(myPeerId),
        fromDisplayName: '',
        toPeerId: peerId,
        status: 'blocked',
      },
    })

    log.info('Пользователь заблокирован', { peerId: peerId.slice(-8) })
    return true
  }

  /**
   * Проверить, заблокирован ли пользователь
   */
  async isBlocked(peerId: string): Promise<boolean> {
    const prisma = getPrismaClient()
    const kuboService = getKuboService()
    const myPeerId = kuboService.getPeerId()

    if (!myPeerId) {
      return false
    }

    const block = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { fromPeerId: myPeerId, toPeerId: peerId, status: 'blocked' },
          { fromPeerId: peerId, toPeerId: myPeerId, status: 'blocked' },
        ],
      },
    })

    return block !== null
  }

  /**
   * Обновить онлайн-статус друга
   */
  async updateFriendStatus(peerId: string, isOnline: boolean, watching?: WatchingInfo): Promise<void> {
    const prisma = getPrismaClient()

    await prisma.friend.updateMany({
      where: { peerId },
      data: {
        isOnline,
        watchingJson: watching ? JSON.stringify(watching) : null,
        lastSeenAt: new Date(),
      },
    })

    this.emit('friends:updated', await this.getFriends())
  }

  /**
   * Проверить, инициализирован ли сервис
   */
  isReady(): boolean {
    return this.isInitialized
  }
}

/**
 * Получить singleton экземпляр FriendRequestsSync
 */
export function getFriendRequestsSync(): FriendRequestsSync {
  return FriendRequestsSync.getInstance()
}
