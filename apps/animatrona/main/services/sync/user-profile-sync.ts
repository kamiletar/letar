/**
 * UserProfileSync — Синхронизация профиля пользователя через IPNS
 *
 * Стратегия:
 * 1. SQLite (Prisma) — локальное хранение профиля
 * 2. IPNS — публикация профиля для друзей
 * 3. Kubo API — работа с IPNS
 *
 * Публикация профиля:
 * - /ipns/<peerId> → JSON с профилем пользователя
 * - Друзья могут получить профиль по PeerId
 */

import { EventEmitter } from 'events'

import type { LocalUserProfile } from '../../../renderer/src/generated/prisma'
import { getPrismaClient } from '../../utils/db'
import { createModuleLogger } from '../../utils/logger'
import { getKuboService } from '../kubo'

import { generateFriendCode } from './friend-code'

const log = createModuleLogger('UserProfileSync')

/** ID профиля (singleton) */
const PROFILE_ID = 'default'

/**
 * Публичная версия профиля для IPNS
 */
interface PublicProfile {
  peerId: string
  friendCode: string
  displayName: string
  avatarUrl?: string
  avatarColor?: string
  status?: string
  updatedAt: number
}

/**
 * Данные для обновления профиля
 */
export interface ProfileUpdate {
  displayName?: string
  avatarUrl?: string
  avatarColor?: string
  status?: string
}

/**
 * События UserProfileSync
 */
export interface UserProfileSyncEvents {
  'profile:updated': (profile: LocalUserProfile) => void
  'profile:published': (cid: string) => void
  error: (error: Error) => void
}

/**
 * Singleton сервис синхронизации профиля
 */
export class UserProfileSync extends EventEmitter {
  private static instance: UserProfileSync | null = null

  /** Кэш профиля */
  private cachedProfile: LocalUserProfile | null = null

  /** Флаг инициализации */
  private isInitialized = false

  private constructor() {
    super()
  }

  /**
   * Получить singleton экземпляр
   */
  static getInstance(): UserProfileSync {
    if (!UserProfileSync.instance) {
      UserProfileSync.instance = new UserProfileSync()
    }
    return UserProfileSync.instance
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

      // Загружаем или создаём профиль
      await this.loadOrCreateProfile()

      this.isInitialized = true
      log.info('Инициализация завершена', {
        friendCode: this.cachedProfile?.friendCode,
      })
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
    this.cachedProfile = null
    this.isInitialized = false
    log.info('Остановлен')
  }

  /**
   * Загрузить или создать профиль
   */
  private async loadOrCreateProfile(): Promise<void> {
    const prisma = getPrismaClient()

    let profile = await prisma.localUserProfile.findUnique({
      where: { id: PROFILE_ID },
    })

    if (!profile) {
      // Создаём новый профиль
      const kuboService = getKuboService()
      const peerId = kuboService.getPeerId()

      if (!peerId) {
        throw new Error('PeerId не доступен. Kubo должен быть запущен.')
      }

      const friendCode = generateFriendCode(peerId)

      profile = await prisma.localUserProfile.create({
        data: {
          id: PROFILE_ID,
          peerId,
          friendCode,
          displayName: 'Анонимус',
        },
      })

      log.info('Создан новый профиль', { friendCode })
    }

    this.cachedProfile = profile
  }

  /**
   * Получить профиль пользователя
   */
  async getProfile(): Promise<LocalUserProfile | null> {
    if (this.cachedProfile) {
      return this.cachedProfile
    }

    const prisma = getPrismaClient()
    const profile = await prisma.localUserProfile.findUnique({
      where: { id: PROFILE_ID },
    })

    this.cachedProfile = profile
    return profile
  }

  /**
   * Обновить профиль пользователя
   */
  async updateProfile(updates: ProfileUpdate): Promise<LocalUserProfile | null> {
    const prisma = getPrismaClient()

    const profile = await prisma.localUserProfile.update({
      where: { id: PROFILE_ID },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    })

    this.cachedProfile = profile
    this.emit('profile:updated', profile)

    log.info('Профиль обновлён')
    return profile
  }

  /**
   * Получить Friend Code
   */
  async getFriendCode(): Promise<string | null> {
    const profile = await this.getProfile()
    return profile?.friendCode ?? null
  }

  /**
   * Получить PeerId
   */
  async getPeerId(): Promise<string | null> {
    const profile = await this.getProfile()
    return profile?.peerId ?? null
  }

  /**
   * Опубликовать профиль через IPNS
   * Делает профиль доступным по /ipns/<peerId>
   */
  async publishProfile(): Promise<string | null> {
    const profile = await this.getProfile()
    if (!profile) {
      log.warn('Профиль не найден')
      return null
    }

    const kuboService = getKuboService()
    const client = kuboService.getClientOrNull()

    if (!client) {
      log.warn('Kubo не доступен')
      return null
    }

    try {
      // Создаём публичную версию профиля
      const publicProfile: PublicProfile = {
        peerId: profile.peerId,
        friendCode: profile.friendCode,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl ?? undefined,
        avatarColor: profile.avatarColor ?? undefined,
        status: profile.status ?? undefined,
        updatedAt: profile.updatedAt.getTime(),
      }

      // Добавляем JSON в IPFS
      const content = new TextEncoder().encode(JSON.stringify(publicProfile))
      const { cid } = await client.add(content)

      // Публикуем через IPNS
      await client.name.publish(cid, {
        lifetime: '24h',
        key: 'self',
      })

      // Сохраняем CID в БД
      const prisma = getPrismaClient()
      await prisma.localUserProfile.update({
        where: { id: PROFILE_ID },
        data: {
          ipnsPublishedCid: cid.toString(),
          ipnsPublishedAt: new Date(),
        },
      })

      log.info('Профиль опубликован', { cid: cid.toString() })
      this.emit('profile:published', cid.toString())

      return cid.toString()
    } catch (error) {
      log.error('Ошибка публикации профиля', { error: String(error) })
      return null
    }
  }

  /**
   * Получить профиль друга по PeerId через IPNS
   */
  async getFriendProfile(friendPeerId: string): Promise<PublicProfile | null> {
    const kuboService = getKuboService()
    const client = kuboService.getClientOrNull()

    if (!client) {
      log.warn('Kubo не доступен')
      return null
    }

    try {
      // Резолвим IPNS имя
      const result = client.name.resolve(`/ipns/${friendPeerId}`)

      // Получаем первый результат
      let cidPath: string | null = null
      for await (const path of result) {
        cidPath = path
        break
      }

      if (!cidPath) {
        log.warn('IPNS не резолвится', { peerId: friendPeerId.slice(-8) })
        return null
      }

      // Извлекаем CID из пути (/ipfs/<cid>)
      const cid = cidPath.replace('/ipfs/', '')

      // Получаем содержимое
      const chunks: Uint8Array[] = []
      for await (const chunk of client.cat(cid)) {
        chunks.push(chunk)
      }

      const content = new TextDecoder().decode(
        new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0)).map((_, i) => {
          let offset = 0
          for (const chunk of chunks) {
            if (i < offset + chunk.length) {
              return chunk[i - offset]
            }
            offset += chunk.length
          }
          return 0
        })
      )

      const profile = JSON.parse(content) as PublicProfile

      log.info('Получен профиль друга', {
        peerId: friendPeerId.slice(-8),
        displayName: profile.displayName,
      })

      return profile
    } catch (error) {
      log.error('Ошибка получения профиля друга', {
        peerId: friendPeerId.slice(-8),
        error: String(error),
      })
      return null
    }
  }

  /**
   * Проверить, инициализирован ли сервис
   */
  isReady(): boolean {
    return this.isInitialized && this.cachedProfile !== null
  }
}

/**
 * Получить singleton экземпляр UserProfileSync
 */
export function getUserProfileSync(): UserProfileSync {
  return UserProfileSync.getInstance()
}
