/**
 * Ограничение времени ожидания промиса.
 *
 * Заведено 2026-08-08 после того, как агент ушёл в crash loop на s3:
 * `deployRoutes` делает `await rehydrateFromRedis()` **при регистрации плагина**, а Redis там
 * недоступен. Команда не падала — ioredis по умолчанию держит `enableOfflineQueue: true` и
 * складывает команды в очередь до успешного подключения, а `retryStrategy` переподключается
 * бесконечно. То есть `await` не завершался никогда, и Fastify убивал плагин по своему
 * 10-секундному таймауту: `AVV_ERR_PLUGIN_EXEC_TIMEOUT: Plugin did not start in time`.
 *
 * ⚠️ Обрати внимание на форму отказа: не «Redis недоступен, работаем без него», как обещает
 * `@letar/redis-client`, а **полная смерть приложения**. Graceful degradation, построенная на
 * `try/catch`, не спасает от зависания — исключения не происходит вовсе.
 *
 * Отсюда правило шире одного места: **сетевой вызов на пути старта приложения обязан иметь
 * границу по времени.** Без неё любая внешняя зависимость получает право не пустить сервис
 * подняться — включая необязательную, без которой он спроектирован работать.
 */

export interface WithTimeoutOptions<T> {
  /** Сколько ждать, мс */
  ms: number
  /** Что вернуть, если не успели. Без этого поля промис отклоняется. */
  fallback?: T
  /** Текст в предупреждение — что именно не успело */
  label?: string
}

/**
 * Ждёт `promise` не дольше `ms`.
 *
 * С `fallback` — возвращает его и пишет предупреждение (для необязательных зависимостей).
 * Без `fallback` — отклоняется с ошибкой (для обязательных).
 *
 * ⚠️ Исходный промис при этом **не отменяется** — отменить чужой промис в JS нельзя. Он
 * продолжит выполняться в фоне и, если завершится, просто никого не заинтересует. Для
 * rehydrate это безопасно: он наполняет кеш в памяти, а не выполняет побочное действие.
 * Для операций с побочным эффектом (запись, отправка) так делать нельзя — там нужна отмена
 * на уровне самой операции (`AbortSignal`), а не обёртка.
 */
export async function withTimeout<T>(promise: Promise<T>, options: WithTimeoutOptions<T>): Promise<T> {
  const { ms, fallback, label } = options

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<{ __timedOut: true }>((resolve) => {
    timer = setTimeout(() => resolve({ __timedOut: true }), ms)
  })

  try {
    const result = await Promise.race([promise, timeout])

    if (typeof result === 'object' && result !== null && '__timedOut' in result) {
      // Именно `in`, а не `fallback !== undefined`: `fallback: undefined` — валидный выбор
      // «продолжить без результата», и он не должен превращаться в бросок исключения.
      if ('fallback' in options) {
        console.warn(`[withTimeout] ${label ?? 'операция'} не уложилась в ${ms}мс — продолжаем без неё`)
        return fallback as T
      }
      throw new Error(`${label ?? 'Операция'} не уложилась в ${ms}мс`)
    }

    return result as T
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}
