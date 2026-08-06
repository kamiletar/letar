/**
 * ActivityPub HTTP Client
 *
 * Клиент для взаимодействия с удалёнными ActivityPub серверами.
 * Поддерживает подписанные запросы и обработку ответов.
 */

import type { PrismaClient } from '@prisma/client'

import type {
  ActivityPubActivity,
  ActivityPubActor,
  AnnounceActivity,
  VideoSeriesObject,
} from '../../../../shared/types/federation'
import { createModuleLogger } from '../../../utils/logger'
import { signRequest } from './signatures'
import type { AnnouncesResponse, ContentResponse, FetchActorResult, OrderedCollection } from './types'

const log = createModuleLogger('ActivityPubClient')

/**
 * Таймаут для HTTP запросов (мс)
 */
const REQUEST_TIMEOUT = 10000

/**
 * User-Agent для запросов
 */
const USER_AGENT = 'Animatrona/0.24.0 (+https://github.com/animatrona)'

/**
 * ActivityPub HTTP Client
 */
export class ActivityPubClient {
  private prisma: PrismaClient
  private privateKeyPem: string | null = null
  private keyId: string | null = null

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Инициализировать клиент с ключами
   */
  async init(): Promise<void> {
    const settings = await this.prisma.federationSettings.findUnique({
      where: { id: 'default' },
    })

    if (settings?.privateKeyPem && settings?.publicKeyPem) {
      this.privateKeyPem = settings.privateKeyPem
      // keyId будет сформирован при первом запросе
    }
  }

  /**
   * Получить Actor по URL
   */
  async fetchActor(actorUrl: string): Promise<FetchActorResult> {
    try {
      const response = await this.fetch(actorUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/activity+json, application/ld+json',
        },
      })

      if (!response.ok) {
        await response.body?.cancel().catch(() => {
          /* игнорируем */
        })
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        }
      }

      const actor = (await response.json()) as ActivityPubActor

      // Валидация минимальных полей
      if (!actor.id || !actor.type || !actor.inbox || !actor.outbox) {
        return {
          success: false,
          error: 'Невалидный Actor: отсутствуют обязательные поля',
        }
      }

      return { success: true, actor }
    } catch (error) {
      return {
        success: false,
        error: `Ошибка запроса: ${(error as Error).message}`,
      }
    }
  }

  /**
   * Получить контент с трекера
   */
  async fetchContent(contentUrl: string, since?: string): Promise<ContentResponse | null> {
    try {
      let url = contentUrl
      if (since) {
        const separator = url.includes('?') ? '&' : '?'
        url = `${url}${separator}since=${encodeURIComponent(since)}`
      }

      const response = await this.signedFetch(url, { method: 'GET' })

      if (!response.ok) {
        await response.body?.cancel().catch(() => {
          /* игнорируем */
        })
        log.error('Ошибка получения контента', { status: response.status })
        return null
      }

      return (await response.json()) as ContentResponse
    } catch (error) {
      log.error('Ошибка fetchContent', { error })
      return null
    }
  }

  /**
   * Получить announces (сидеры) для CID
   */
  async fetchAnnounces(announcesUrl: string, cid: string): Promise<AnnouncesResponse | null> {
    try {
      const url = `${announcesUrl}/${cid}`
      const response = await this.signedFetch(url, { method: 'GET' })

      if (!response.ok) {
        log.error('Ошибка получения announces', { status: response.status })
        return null
      }

      return (await response.json()) as AnnouncesResponse
    } catch (error) {
      log.error('Ошибка fetchAnnounces', { error })
      return null
    }
  }

  /**
   * Получить outbox (список activities)
   */
  async fetchOutbox(outboxUrl: string): Promise<OrderedCollection<ActivityPubActivity> | null> {
    try {
      const response = await this.fetch(outboxUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/activity+json',
        },
      })

      if (!response.ok) {
        await response.body?.cancel().catch(() => {
          /* игнорируем */
        })
        return null
      }

      return (await response.json()) as OrderedCollection<ActivityPubActivity>
    } catch (error) {
      log.error('Ошибка fetchOutbox', { error })
      return null
    }
  }

  /**
   * Отправить activity в inbox трекера
   */
  async sendActivity(inboxUrl: string, activity: ActivityPubActivity): Promise<boolean> {
    try {
      const body = JSON.stringify(activity)

      const response = await this.signedFetch(inboxUrl, {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/activity+json',
        },
      })

      // 202 Accepted — успешно принято
      return response.status === 202 || response.ok
    } catch (error) {
      log.error('Ошибка sendActivity', { error })
      return false
    }
  }

  /**
   * Отправить Announce activity (объявление о доступности контента)
   */
  async sendAnnounce(inboxUrl: string, cid: string, peerId: string, size: number): Promise<boolean> {
    const settings = await this.prisma.federationSettings.findUnique({
      where: { id: 'default' },
    })

    if (!settings) {
      log.error('Настройки федерации не найдены')
      return false
    }

    const activity: AnnounceActivity = {
      '@context': ['https://www.w3.org/ns/activitystreams'],
      id: `urn:animatrona:announce:${cid}:${Date.now()}`,
      type: 'Announce',
      actor: `${settings.trackerName}/federation/actor`,
      object: cid,
      'animatrona:peerId': peerId,
      'animatrona:size': size,
      published: new Date().toISOString(),
    }

    return this.sendActivity(inboxUrl, activity)
  }

  /**
   * Отправить Create activity (создание контента)
   */
  async sendCreate(inboxUrl: string, content: VideoSeriesObject): Promise<boolean> {
    const settings = await this.prisma.federationSettings.findUnique({
      where: { id: 'default' },
    })

    if (!settings) {
      return false
    }

    const activity: ActivityPubActivity = {
      '@context': ['https://www.w3.org/ns/activitystreams'],
      id: `urn:animatrona:create:${content.id}:${Date.now()}`,
      type: 'Create',
      actor: `${settings.trackerName}/federation/actor`,
      published: new Date().toISOString(),
    } // Добавляем object
    ;(activity as Record<string, unknown>).object = content

    return this.sendActivity(inboxUrl, activity)
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Базовый fetch с таймаутом
   */
  private async fetch(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          ...options.headers,
        },
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  /**
   * Подписанный fetch
   */
  private async signedFetch(
    url: string,
    options: { method: 'GET' | 'POST' | 'DELETE'; body?: string; headers?: Record<string, string> },
  ): Promise<Response> {
    // Получаем ключи если ещё не загружены
    if (!this.privateKeyPem) {
      await this.init()
    }

    // Если нет ключей — делаем обычный запрос
    if (!this.privateKeyPem) {
      return this.fetch(url, {
        method: options.method,
        body: options.body,
        headers: options.headers,
      })
    }

    // Формируем keyId
    const settings = await this.prisma.federationSettings.findUnique({
      where: { id: 'default' },
    })
    const keyId = `${settings?.trackerName ?? 'animatrona'}/federation/actor#main-key`

    // Подписываем запрос
    const signatureHeaders = signRequest({
      method: options.method,
      url,
      body: options.body,
      privateKeyPem: this.privateKeyPem,
      keyId,
    })

    return this.fetch(url, {
      method: options.method,
      body: options.body,
      headers: {
        ...options.headers,
        Date: signatureHeaders.Date,
        Signature: signatureHeaders.Signature,
        ...(signatureHeaders.Digest ? { Digest: signatureHeaders.Digest } : {}),
      },
    })
  }
}
