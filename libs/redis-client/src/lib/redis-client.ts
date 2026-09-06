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
 *
 * ⚠️ Лог ошибок схлопывается, и это тоже не косметика. `retryStrategy` переподключается
 * бесконечно, поэтому при лежащем Redis событие `error` приходит вечно — сначала раз в секунду,
 * дальше раз в 30 секунд. Печать каждого события забивает `docker logs` (у `dashboard-agent`,
 * живущего сутками, это основной инструмент разбора инцидентов) и маскирует настоящие ошибки.
 * Поэтому печатается только первая ошибка каждого текста, повторы копятся молча, а при
 * восстановлении соединения выводится одна итоговая строка с их числом. Смена текста ошибки
 * (ECONNREFUSED → WRONGPASS и т.п.) — это новая информация, она печатается сразу и дублем не
 * считается.
 */

import Redis, { type RedisOptions } from 'ioredis'

export interface CreateRedisClientOptions {
  /** Имя переменной окружения с URL подключения. По умолчанию REDIS_URL. */
  envVar?: string
  /** URL по умолчанию, если переменная окружения не задана (например для локальной разработки). */
  fallbackUrl?: string
  /** Подавить весь вывод в консоль (ошибки подключения и сообщение о восстановлении). */
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
  /** Текст последней напечатанной ошибки — по нему отличаем повтор от новой ошибки. */
  let lastLoggedError: string | null = null
  /** Сколько повторов последней ошибки проглочено с момента её печати. */
  let suppressedErrors = 0

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
        if (silent) {
          return
        }

        // Тот же текст, что и в прошлый раз, — молчим до восстановления соединения
        if (err.message === lastLoggedError) {
          suppressedErrors++
          return
        }

        // Ошибка сменилась: это новая информация, а не дубль. Заодно отчитываемся за то,
        // что успели проглотить по прошлой — иначе счётчик потеряется до самого reconnect.
        const suffix = suppressedErrors > 0 ? ` (подавлено повторов предыдущей ошибки: ${suppressedErrors})` : ''
        console.error(`${logPrefix} Ошибка:`, `${err.message}${suffix}`)
        lastLoggedError = err.message
        suppressedErrors = 0
      })

      client.on('connect', () => {
        connectionFailed = false

        // Первое подключение (ошибок не было) проходит молча — сообщать не о чем
        if (!silent && lastLoggedError !== null) {
          const tail = suppressedErrors > 0 ? `, подавлено повторов: ${suppressedErrors}` : ''
          console.warn(`${logPrefix} Соединение восстановлено${tail}`)
        }

        lastLoggedError = null
        suppressedErrors = 0
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
