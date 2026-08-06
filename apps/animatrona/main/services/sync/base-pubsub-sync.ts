/**
 * BasePubSubSync — базовый класс для P2P sync-сервисов через Kubo PubSub.
 *
 * Предоставляет общую инфраструктуру:
 * - Отслеживание подписок на PubSub топики (Map<topic, handler>)
 * - subscribeTopic() / unsubscribeTopic() с retry при ошибках
 * - unsubscribeAll() для корректного shutdown
 * - publishJson() / parseJsonMessage() для JSON-сериализации
 * - Кэширование myPeerId
 */

import { EventEmitter } from 'events'

import type { Message } from 'kubo-rpc-client'

import type { Logger } from '../../utils/logger'
import { getKuboService } from '../kubo'

/** Тип handler'а для PubSub */
export type PubSubHandler = (msg: Message) => void

/** Максимальное количество попыток переподписки PubSub */
const MAX_SUBSCRIBE_RETRIES = 10

/** Максимальная задержка между retry (мс) */
const MAX_RETRY_DELAY = 60_000

/**
 * Абстрактный базовый класс для sync-сервисов, работающих через Kubo PubSub.
 *
 * Наследники реализуют доменную логику (подписки, обработку сообщений),
 * а BasePubSubSync управляет lifecycle подписок.
 */
export abstract class BasePubSubSync extends EventEmitter {
  /** Подписки на PubSub топики (topic → handler для отписки) */
  protected subscribedTopics: Map<string, PubSubHandler> = new Map()

  /** Мой PeerId из Kubo */
  protected myPeerId: string | null = null

  /** Флаг активности сервиса (для контроля retry) */
  protected isActive = false

  /** Логгер — должен быть установлен наследником */
  protected abstract log: Logger

  /**
   * Проверить доступность Kubo и получить PeerId.
   * Вызывать в initialize()/start() наследника.
   *
   * @returns true если Kubo доступен, false если нет
   */
  protected ensureKuboReady(): boolean {
    const kuboService = getKuboService()
    if (!kuboService.isRunning()) {
      this.log.warn('Kubo не запущен')
      return false
    }

    this.myPeerId = kuboService.getPeerId()
    if (!this.myPeerId) {
      this.log.warn('PeerId недоступен')
      return false
    }

    return true
  }

  /**
   * Подписаться на PubSub топик с JSON-десериализацией и retry при ошибках.
   *
   * @param topic - PubSub топик
   * @param onMessage - Обработчик десериализованного JSON-сообщения
   * @param retryOnError - Повторять подписку при ошибке соединения (по умолчанию true)
   */
  protected async subscribeTopic<T = unknown>(
    topic: string,
    onMessage: (data: T) => void,
    retryOnError = true,
    attempt = 0,
  ): Promise<void> {
    const kuboService = getKuboService()
    const client = kuboService.getClientOrNull()

    if (!client) {
      if (this.isActive && retryOnError && attempt < MAX_SUBSCRIBE_RETRIES) {
        const delay = Math.min(5000 * Math.pow(2, attempt), MAX_RETRY_DELAY)
        this.log.warn('Kubo client недоступен, повтор', { topic, attempt: attempt + 1, delayMs: delay })
        setTimeout(() => {
          this.subscribeTopic(topic, onMessage, retryOnError, attempt + 1).catch((e) => {
            this.log.error('Ошибка повторной подписки PubSub', { topic, error: String(e) })
          })
        }, delay)
      } else if (attempt >= MAX_SUBSCRIBE_RETRIES) {
        this.log.error('Превышен лимит попыток подписки PubSub', { topic, attempts: attempt })
      }
      return
    }

    // Обёртка: десериализация JSON из PubSub
    const handler: PubSubHandler = (msg: Message) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(msg.data)) as T
        onMessage(data)
      } catch (e) {
        this.log.debug('Ошибка парсинга PubSub сообщения', { topic, error: String(e) })
      }
    }

    try {
      await client.pubsub.subscribe(topic, handler, {
        onError: (err) => {
          this.log.warn('PubSub subscribe error', { topic, error: String(err) })
          // Удаляем ghost handler при ошибке соединения
          this.subscribedTopics.delete(topic)
          // Переподписываемся с exponential backoff — Kubo мог перезапуститься
          if (this.isActive && retryOnError) {
            // Сбрасываем счётчик попыток — это ошибка на уже работающей подписке
            const retryDelay = Math.min(5000, MAX_RETRY_DELAY)
            setTimeout(() => {
              this.subscribeTopic(topic, onMessage, retryOnError, 0).catch((e) => {
                this.log.error('Ошибка повторной подписки PubSub', { topic, error: String(e) })
              })
            }, retryDelay)
          }
        },
      })
      // Сохраняем handler ПОСЛЕ успешного subscribe
      this.subscribedTopics.set(topic, handler)
      this.log.info('Подписан на топик', { topic })
    } catch (err) {
      this.log.error('PubSub subscribe error', { topic, error: String(err) })
    }
  }

  /**
   * Отписаться от одного PubSub топика
   */
  protected async unsubscribeTopic(topic: string): Promise<void> {
    const handler = this.subscribedTopics.get(topic)
    if (!handler) {
      return
    }

    const client = getKuboService().getClientOrNull()
    if (client) {
      try {
        await client.pubsub.unsubscribe(topic, handler)
      } catch (e) {
        this.log.debug('Ошибка отписки', { topic, error: String(e) })
      }
    }
    this.subscribedTopics.delete(topic)
    this.log.info('Отписка от топика', { topic })
  }

  /**
   * Отписаться от всех PubSub топиков.
   * Вызывать в shutdown()/stop() наследника.
   */
  protected async unsubscribeAll(): Promise<void> {
    const client = getKuboService().getClientOrNull()
    for (const [topic, handler] of this.subscribedTopics) {
      try {
        if (client) {
          await client.pubsub.unsubscribe(topic, handler)
        }
        this.log.info('Отписка от топика', { topic })
      } catch (e) {
        this.log.debug('Ошибка отписки', { topic, error: String(e) })
      }
    }
    this.subscribedTopics.clear()
  }

  /**
   * Опубликовать JSON-сообщение в PubSub топик.
   *
   * @returns true если сообщение отправлено, false если Kubo недоступен
   */
  protected async publishJson(topic: string, data: unknown): Promise<boolean> {
    const client = getKuboService().getClientOrNull()
    if (!client) {
      this.log.warn('Kubo client недоступен, сообщение не отправлено', { topic })
      return false
    }

    try {
      const encoded = new TextEncoder().encode(JSON.stringify(data))
      await client.pubsub.publish(topic, encoded)
      return true
    } catch (err) {
      this.log.error('Ошибка публикации PubSub', { topic, error: String(err) })
      return false
    }
  }
}
