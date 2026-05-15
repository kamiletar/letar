/**
 * WatchPartySync — Совместный просмотр через Kubo PubSub
 *
 * Real-time синхронизация воспроизведения через PubSub.
 * Комнаты живут в памяти на время сеанса.
 *
 * PubSub топики:
 * - animatrona/party/<roomId>/sync — playback state
 * - animatrona/party/<roomId>/participants — join/leave
 * - animatrona/party/<roomId>/chat — сообщения
 */

import { EventEmitter } from 'events'

import type { Message } from 'kubo-rpc-client'

import type {
  WatchPartyChatMessage,
  WatchPartyParticipant,
  WatchPartyPlaybackState,
  WatchPartyRoom,
} from '../../../shared/types/orbitdb'
import { createModuleLogger } from '../../utils/logger'
import { getKuboService } from '../kubo'

/** Тип handler'а для PubSub */
type PubSubHandler = (msg: Message) => void

import { getUserProfileSync } from './user-profile-sync'

const log = createModuleLogger('WatchPartySync')

/** PubSub topic base */
const PARTY_TOPIC_BASE = 'animatrona/party/'

/**
 * События WatchPartySync
 */
export interface WatchPartySyncEvents {
  /** Состояние воспроизведения обновлено */
  'playback:updated': (roomId: string, state: WatchPartyPlaybackState) => void
  /** Участник присоединился */
  'participant:joined': (roomId: string, participant: WatchPartyParticipant) => void
  /** Участник покинул комнату */
  'participant:left': (roomId: string, peerId: string) => void
  /** Получено сообщение чата */
  'message:received': (roomId: string, message: WatchPartyChatMessage) => void
  /** Комната закрыта */
  'room:closed': (roomId: string) => void
  /** Ошибка */
  error: (error: Error) => void
}

/**
 * Singleton сервис Watch Party
 */
export class WatchPartySync extends EventEmitter {
  private static instance: WatchPartySync | null = null

  /** Флаг инициализации */
  private isInitialized = false

  /** Текущая комната (если подключены) */
  private currentRoomId: string | null = null

  /** Информация о текущей комнате */
  private currentRoom: WatchPartyRoom | null = null

  /** Участники текущей комнаты */
  private participants: Map<string, WatchPartyParticipant> = new Map()

  /** Текущее состояние playback */
  private playbackState: WatchPartyPlaybackState | null = null

  /** Подписанные топики */
  private subscribedTopics: Set<string> = new Set()

  /** PubSub handlers для отписки (topic -> handler) */
  private topicHandlers: Map<string, PubSubHandler> = new Map()

  private constructor() {
    super()
  }

  /**
   * Получить singleton
   */
  static getInstance(): WatchPartySync {
    if (!WatchPartySync.instance) {
      WatchPartySync.instance = new WatchPartySync()
    }
    return WatchPartySync.instance
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

    // Покидаем комнату если в ней
    if (this.currentRoomId) {
      await this.leaveRoom()
    }

    // Отписываемся от всех топиков
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

    this.isInitialized = false
    log.info('Остановлен')
  }

  /**
   * Создать Watch Party комнату
   */
  async createRoom(options: {
    name: string
    animeName: string
    episodeNumber: number
    filePath?: string
    contentCid?: string
    isPrivate?: boolean
    maxParticipants?: number
  }): Promise<WatchPartyRoom | null> {
    const kuboService = getKuboService()
    const myPeerId = kuboService.getPeerId()

    if (!myPeerId) {
      log.error('PeerId недоступен')
      return null
    }

    const userProfileSync = getUserProfileSync()
    const profile = await userProfileSync.getProfile()

    if (!profile) {
      log.error('Профиль не найден')
      return null
    }

    // Генерируем ID комнаты
    const roomId = `party-${myPeerId.slice(0, 8)}-${Date.now()}`

    const room: WatchPartyRoom = {
      id: roomId,
      name: options.name,
      hostPeerId: myPeerId,
      hostName: profile.displayName,
      animeName: options.animeName,
      episodeNumber: options.episodeNumber,
      filePath: options.filePath,
      contentCid: options.contentCid,
      isActive: true,
      isPrivate: options.isPrivate ?? false,
      maxParticipants: options.maxParticipants ?? 10,
      createdAt: Date.now(),
    }

    log.info('Комната создана', { roomId })

    // Автоматически присоединяемся к своей комнате
    await this.joinRoom(roomId, room)

    return room
  }

  /**
   * Присоединиться к комнате
   */
  async joinRoom(roomId: string, roomInfo?: WatchPartyRoom): Promise<boolean> {
    // Покидаем текущую комнату если есть
    if (this.currentRoomId && this.currentRoomId !== roomId) {
      await this.leaveRoom()
    }

    const kuboService = getKuboService()
    const myPeerId = kuboService.getPeerId()

    if (!myPeerId) {
      return false
    }

    const userProfileSync = getUserProfileSync()
    const profile = await userProfileSync.getProfile()

    if (!profile) {
      return false
    }

    // Создаём участника
    const participant: WatchPartyParticipant = {
      peerId: myPeerId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl ?? undefined,
      role: roomInfo?.hostPeerId === myPeerId ? 'host' : 'guest',
      isReady: false,
      currentPosition: 0,
      joinedAt: Date.now(),
    }

    this.currentRoomId = roomId
    this.currentRoom = roomInfo ?? null
    this.participants.set(myPeerId, participant)
    this.playbackState = {
      isPlaying: false,
      position: 0,
      playbackRate: 1,
      timestamp: Date.now(),
      changedBy: roomInfo?.hostPeerId ?? myPeerId,
    }

    // Подписываемся на PubSub топики
    await this.subscribeToRoom(roomId)

    // Broadcast присоединение
    await this.broadcastParticipantJoin(roomId, participant)

    log.info('Присоединились к комнате', { roomId })
    return true
  }

  /**
   * Покинуть комнату
   */
  async leaveRoom(): Promise<boolean> {
    if (!this.currentRoomId) {
      return false
    }

    const roomId = this.currentRoomId
    const kuboService = getKuboService()
    const myPeerId = kuboService.getPeerId()

    // Broadcast выход
    if (myPeerId) {
      await this.broadcastParticipantLeave(roomId, myPeerId)
    }

    // Если мы хост, закрываем комнату
    if (this.currentRoom?.hostPeerId === myPeerId) {
      await this.broadcastRoomClosed(roomId)
    }

    // Отписываемся от топиков
    await this.unsubscribeFromRoom(roomId)

    this.currentRoomId = null
    this.currentRoom = null
    this.participants.clear()
    this.playbackState = null

    log.info('Покинули комнату', { roomId })
    return true
  }

  /**
   * Закрыть комнату (только хост)
   */
  async closeRoom(): Promise<boolean> {
    if (!this.currentRoomId) {
      return false
    }

    const kuboService = getKuboService()
    const myPeerId = kuboService.getPeerId()

    if (!myPeerId || this.currentRoom?.hostPeerId !== myPeerId) {
      log.error('Только хост может закрыть комнату')
      return false
    }

    return this.leaveRoom()
  }

  /**
   * Обновить playback (play/pause/seek)
   */
  async updatePlayback(action: 'play' | 'pause' | 'seek', position?: number): Promise<boolean> {
    if (!this.currentRoomId || !this.playbackState) {
      return false
    }

    const kuboService = getKuboService()
    const myPeerId = kuboService.getPeerId()

    if (!myPeerId) {
      return false
    }

    const newState: WatchPartyPlaybackState = {
      ...this.playbackState,
      isPlaying: action === 'play',
      position: position ?? this.playbackState.position,
      timestamp: Date.now(),
      changedBy: myPeerId,
    }

    this.playbackState = newState
    await this.broadcastPlaybackUpdate(this.currentRoomId, newState)

    return true
  }

  /**
   * Отправить сообщение чата
   */
  async sendMessage(text: string): Promise<WatchPartyChatMessage | null> {
    if (!this.currentRoomId) {
      return null
    }

    const kuboService = getKuboService()
    const myPeerId = kuboService.getPeerId()

    if (!myPeerId) {
      return null
    }

    const userProfileSync = getUserProfileSync()
    const profile = await userProfileSync.getProfile()

    if (!profile) {
      return null
    }

    const message: WatchPartyChatMessage = {
      id: `msg-${myPeerId.slice(0, 8)}-${Date.now()}`,
      roomId: this.currentRoomId,
      senderId: myPeerId,
      senderName: profile.displayName,
      text,
      timestamp: Date.now(),
    }

    await this.broadcastChatMessage(this.currentRoomId, message)

    return message
  }

  /**
   * Отправить реакцию
   */
  async sendReaction(reaction: string): Promise<WatchPartyChatMessage | null> {
    if (!this.currentRoomId) {
      return null
    }

    const kuboService = getKuboService()
    const myPeerId = kuboService.getPeerId()

    if (!myPeerId) {
      return null
    }

    const userProfileSync = getUserProfileSync()
    const profile = await userProfileSync.getProfile()

    if (!profile) {
      return null
    }

    const message: WatchPartyChatMessage = {
      id: `react-${myPeerId.slice(0, 8)}-${Date.now()}`,
      roomId: this.currentRoomId,
      senderId: myPeerId,
      senderName: profile.displayName,
      text: '',
      reaction,
      timestamp: Date.now(),
    }

    await this.broadcastChatMessage(this.currentRoomId, message)

    return message
  }

  // === PubSub ===

  /**
   * Подписаться на топики комнаты
   */
  private async subscribeToRoom(roomId: string): Promise<void> {
    const topics = [
      `${PARTY_TOPIC_BASE}${roomId}/sync`,
      `${PARTY_TOPIC_BASE}${roomId}/participants`,
      `${PARTY_TOPIC_BASE}${roomId}/chat`,
    ]

    for (const topic of topics) {
      if (this.subscribedTopics.has(topic)) {
        continue
      }

      this.subscribedTopics.add(topic)

      // Запускаем listener в фоне
      this.startTopicListener(topic, roomId).catch((err) => {
        log.error('Topic listener error', { topic, error: String(err) })
      })
    }

    log.info('Подписка на топики комнаты', { roomId, topics: topics.length })
  }

  /**
   * Запустить listener для топика
   */
  private async startTopicListener(topic: string, roomId: string): Promise<void> {
    const kuboService = getKuboService()
    const client = kuboService.getClientOrNull()

    if (!client) {
      log.warn('Kubo client недоступен')
      return
    }

    // Создаём callback handler для kubo-rpc-client v6.x
    const handler: PubSubHandler = (msg: Message) => {
      try {
        const data = new TextDecoder().decode(msg.data)
        const message = JSON.parse(data)
        this.handleMessage(topic, roomId, message)
      } catch (parseErr) {
        log.warn('Ошибка парсинга сообщения', { error: String(parseErr) })
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
   * Отписаться от топиков комнаты
   */
  private async unsubscribeFromRoom(roomId: string): Promise<void> {
    const topics = [
      `${PARTY_TOPIC_BASE}${roomId}/sync`,
      `${PARTY_TOPIC_BASE}${roomId}/participants`,
      `${PARTY_TOPIC_BASE}${roomId}/chat`,
    ]

    const client = getKuboService().getClientOrNull()
    for (const topic of topics) {
      const handler = this.topicHandlers.get(topic)
      if (handler) {
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

    log.info('Отписка от топиков комнаты', { roomId })
  }

  /**
   * Обработка входящего сообщения
   */
  private handleMessage(topic: string, roomId: string, message: unknown): void {
    if (roomId !== this.currentRoomId) {
      return
    }

    const kuboService = getKuboService()
    const myPeerId = kuboService.getPeerId()

    if (topic.endsWith('/sync')) {
      const state = message as WatchPartyPlaybackState
      // Игнорируем свои сообщения
      if (state.changedBy === myPeerId) {
        return
      }

      this.playbackState = state
      this.emit('playback:updated', roomId, state)
    } else if (topic.endsWith('/participants')) {
      const msg = message as { type: 'join' | 'leave' | 'closed'; participant?: WatchPartyParticipant; peerId?: string }

      if (msg.type === 'join' && msg.participant) {
        // Игнорируем своё присоединение
        if (msg.participant.peerId === myPeerId) {
          return
        }

        this.participants.set(msg.participant.peerId, msg.participant)
        this.emit('participant:joined', roomId, msg.participant)
      } else if (msg.type === 'leave' && msg.peerId) {
        if (msg.peerId === myPeerId) {
          return
        }

        this.participants.delete(msg.peerId)
        this.emit('participant:left', roomId, msg.peerId)
      } else if (msg.type === 'closed') {
        this.emit('room:closed', roomId)
        // Автоматически выходим
        this.currentRoomId = null
        this.currentRoom = null
        this.participants.clear()
        this.playbackState = null
      }
    } else if (topic.endsWith('/chat')) {
      const chatMsg = message as WatchPartyChatMessage
      // Игнорируем свои сообщения
      if (chatMsg.senderId === myPeerId) {
        return
      }

      this.emit('message:received', roomId, chatMsg)
    }
  }

  // === Broadcast методы ===

  private async broadcastPlaybackUpdate(roomId: string, state: WatchPartyPlaybackState): Promise<void> {
    await this.publish(`${PARTY_TOPIC_BASE}${roomId}/sync`, state)
  }

  private async broadcastParticipantJoin(roomId: string, participant: WatchPartyParticipant): Promise<void> {
    await this.publish(`${PARTY_TOPIC_BASE}${roomId}/participants`, { type: 'join', participant })
  }

  private async broadcastParticipantLeave(roomId: string, peerId: string): Promise<void> {
    await this.publish(`${PARTY_TOPIC_BASE}${roomId}/participants`, { type: 'leave', peerId })
  }

  private async broadcastRoomClosed(roomId: string): Promise<void> {
    await this.publish(`${PARTY_TOPIC_BASE}${roomId}/participants`, { type: 'closed' })
  }

  private async broadcastChatMessage(roomId: string, message: WatchPartyChatMessage): Promise<void> {
    await this.publish(`${PARTY_TOPIC_BASE}${roomId}/chat`, message)
  }

  private async publish(topic: string, data: unknown): Promise<void> {
    const kuboService = getKuboService()
    const client = kuboService.getClientOrNull()

    if (!client) {
      return
    }

    try {
      await client.pubsub.publish(topic, new TextEncoder().encode(JSON.stringify(data)))
    } catch (err) {
      log.error('Ошибка publish', { topic, error: String(err) })
    }
  }

  // === Getters ===

  /**
   * Получить ID текущей комнаты
   */
  getCurrentRoom(): string | null {
    return this.currentRoomId
  }

  /**
   * Получить информацию о текущей комнате
   */
  getCurrentRoomInfo(): WatchPartyRoom | null {
    return this.currentRoom
  }

  /**
   * Получить участников
   */
  getParticipants(): WatchPartyParticipant[] {
    return Array.from(this.participants.values())
  }

  /**
   * Получить состояние playback
   */
  getPlaybackState(): WatchPartyPlaybackState | null {
    return this.playbackState
  }

  /**
   * Проверить готовность
   */
  isReady(): boolean {
    return this.isInitialized
  }
}

/**
 * Получить singleton WatchPartySync
 */
export function getWatchPartySync(): WatchPartySync {
  return WatchPartySync.getInstance()
}
