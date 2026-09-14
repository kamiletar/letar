/**
 * Общий каркас для SSE-эндпоинта, построенного на периодическом опросе (БД, in-memory
 * состояние и т.п.): heartbeat-комментарий, опрос по интервалу, необязательный таймаут
 * автозакрытия и единая очистка ресурсов при `cancel()` потока и при `request.signal` 'abort'.
 *
 * Не годится для событийных (pub/sub) SSE-эндпоинтов, где данные приходят асинхронно от
 * внешнего источника (менеджер подписки, callback) — там нечего опрашивать по таймеру.
 */

/** Отправляет одно SSE-событие. Без `event` — обычный `data: ...` (клиент видит его как `message`). */
export type SseEmit = (data: unknown, event?: string) => void

/**
 * `'done'` закрывает поток сразу после этого вызова (эмиты внутри того же вызова успевают уйти
 * первыми). Любое другое значение (включая `undefined`) продолжает опрос дальше по интервалу.
 */
export type SsePollResult = 'continue' | 'done' | void

/**
 * Вызывается на каждом тике `intervalMs` (и один раз сразу, если `runPollImmediately: true`).
 * Брошенное исключение проглатывается — это временный сбой одного тика опроса, не повод рвать
 * поток; обрабатывай ожидаемые ошибки внутри `poll` сам, если нужно другое поведение.
 */
export type SsePoll = (emit: SseEmit) => SsePollResult | Promise<SsePollResult>

export interface CreatePollingSseResponseOptions {
  /** Исходный запрос — на его `signal` вешается очистка ресурсов при disconnect клиента. */
  request: Request
  poll: SsePoll
  /** Интервал опроса, мс. */
  intervalMs: number
  /** Интервал heartbeat-комментария `: heartbeat\n\n`, мс. Не задан — heartbeat не шлётся. */
  heartbeatMs?: number
  /** Автозакрытие потока через N мс. Не задан — поток живёт, пока клиент не отключится. */
  timeoutMs?: number
  /** Вызвать `poll` сразу при открытии потока, не дожидаясь первого тика интервала. */
  runPollImmediately?: boolean
  /** Заголовки поверх дефолтных SSE-заголовков (см. `SSE_HEADERS`). */
  headers?: Record<string, string>
}

/** Базовые заголовки SSE-ответа — те же, что использует `createPollingSseResponse` по умолчанию. */
export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const

export function createPollingSseResponse(options: CreatePollingSseResponseOptions): Response {
  const { request, poll, intervalMs, heartbeatMs, timeoutMs, runPollImmediately = false, headers } = options

  const encoder = new TextEncoder()

  let isActive = true
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null
  let pollInterval: ReturnType<typeof setInterval> | null = null
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const cleanup = () => {
    if (!isActive) {
      return
    }
    isActive = false
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
    }
    if (pollInterval) {
      clearInterval(pollInterval)
    }
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }

  const closeStream = () => {
    cleanup()
    try {
      controllerRef?.close()
    } catch {
      // Уже закрыт
    }
  }

  const emit: SseEmit = (data, event) => {
    if (!isActive || !controllerRef) {
      return
    }
    try {
      const eventLine = event ? `event: ${event}\n` : ''
      controllerRef.enqueue(encoder.encode(`${eventLine}data: ${JSON.stringify(data)}\n\n`))
    } catch {
      cleanup()
    }
  }

  const runPoll = async () => {
    if (!isActive) {
      return
    }
    try {
      const result = await poll(emit)
      if (result === 'done') {
        closeStream()
      }
    } catch {
      // Ошибка одного тика опроса не должна ронять весь поток
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller

      if (heartbeatMs) {
        heartbeatInterval = setInterval(() => {
          if (!isActive) {
            return
          }
          try {
            controller.enqueue(encoder.encode(': heartbeat\n\n'))
          } catch {
            cleanup()
          }
        }, heartbeatMs)
      }

      if (timeoutMs) {
        timeoutId = setTimeout(closeStream, timeoutMs)
      }

      pollInterval = setInterval(() => {
        void runPoll()
      }, intervalMs)

      if (runPollImmediately) {
        void runPoll()
      }
    },
    cancel() {
      cleanup()
    },
  })

  request.signal.addEventListener('abort', () => {
    closeStream()
  })

  return new Response(stream, {
    headers: { ...SSE_HEADERS, ...headers },
  })
}
