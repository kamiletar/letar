/**
 * Фабрика Redis-клиента с graceful degradation. Каждый вызывающий модуль создаёт свой
 * инстанс через createRedisClient() — при отсутствии URL или недоступности Redis
 * возвращает null, и приложение продолжает работать без Redis (кэш/rate-limit становятся
 * no-op/fail-open на стороне вызывающего кода).
 *
 * ⚠️ `enableOfflineQueue: false` — не косметика. При недоступном Redis и включённой (дефолтной
 * у ioredis) офлайн-очереди команда не отклоняется и не падает — она ждёт переподключения,
 * а `retryStrategy` ниже переподключается бесконечно. `await` на такой команде не завершается
 * никогда, и `maxRetriesPerRequest` это не ограничивает (он не про время ожидания очереди).
 * Ровно так 2026-08-08 `dashboard-agent` ушёл в crash loop на s3: голый `await` на Redis-вызове
 * при регистрации Fastify-плагина завис намертво, плагин не стартовал за 10с — подробности в
 * `apps/dashboard-agent/src/lib/with-timeout.ts`. `enableOfflineQueue: false` превращает это в
 * немедленный reject («Stream isn't writeable») — обычную ошибку, которую try/catch в
 * вызывающем коде (все текущие потребители уже так делают) гасит как «Redis недоступен».
 * Не бесплатно: короткий разрыв соединения теперь не переживается прозрачно (команда,
 * отправленная в момент реконнекта, падает вместо ожидания в очереди) — но потребители этой
 * библиотеки уже спроектированы на «Redis может отказать в любой момент», так что для них это
 * строго лучше зависания. Переопределяется через `redisOptions.enableOfflineQueue: true`, если
 * конкретному потребителю нужна старая семантика.
 */

import Redis, { type RedisOptions } from 'ioredis'

export interface CreateRedisClientOptions {
  /** Имя переменной окружения с URL подключения. По умолчанию REDIS_URL. */
  envVar?: string
  /** URL по умолчанию, если переменная окружения не задана (например для локальной разработки). */
  fallbackUrl?: string
  /** Подавить console.error/console.warn при ошибках подключения. */
  silent?: boolean
  /** Доп. опции ioredis поверх дефолтных (maxRetriesPerRequest, enableOfflineQueue, lazyConnect, retryStrategy). */
  redisOptions?: RedisOptions
  /** Префикс для лога, например '[redis:svoichuzhie]'. */
  logPrefix?: string
}

export type GetRedisClient = () => Redis | null

/**
 * Возвращает ленивый singleton-геттер Redis-клиента. Состояние (клиент, флаг сбоя
 * подключения) не шарится между вызовами createRedisClient() — каждый вызывающий модуль
 * держит свой инстанс.
 */
export function createRedisClient(options: CreateRedisClientOptions = {}): GetRedisClient {
  const { envVar = 'REDIS_URL', fallbackUrl, silent = false, redisOptions, logPrefix = '[redis]' } = options

  let client: Redis | null = null
  let connectionFailed = false

  return function getRedis(): Redis | null {
    const url = process.env[envVar] || fallbackUrl
    if (!url || connectionFailed) {
      return null
    }

    if (!client) {
      client = new Redis(url, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
        retryStrategy(times) {
          // Переподключение: 1с, 2с, 4с... макс 30с
          return Math.min(times * 1000, 30000)
        },
        ...redisOptions,
      })

      client.on('error', (err) => {
        if (!silent) {
          console.error(`${logPrefix} Ошибка:`, err.message)
        }
      })

      client.on('connect', () => {
        connectionFailed = false
      })

      client.connect().catch(() => {
        connectionFailed = true
        if (!silent) {
          console.warn(`${logPrefix} Не удалось подключиться — работаем без Redis`)
        }
      })
    }

    return client
  }
}
