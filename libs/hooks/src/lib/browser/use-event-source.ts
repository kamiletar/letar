'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type EventSourceStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export type EventSourceReconnectStrategy = 'constant' | 'linear' | 'exponential'

export interface EventSourceReconnectOptions {
  /** Стратегия роста задержки между попытками (по умолчанию 'exponential') */
  strategy?: EventSourceReconnectStrategy
  /** Базовая задержка в мс (по умолчанию 1000) */
  baseDelayMs?: number
  /** Максимальная задержка в мс (по умолчанию 30000) */
  maxDelayMs?: number
  /** Максимум попыток переподключения, Infinity — без ограничения (по умолчанию Infinity) */
  maxAttempts?: number
  /** Добавлять ±20% джиттер к задержке (по умолчанию false) */
  jitter?: boolean
}

export interface UseEventSourceOptions {
  /** URL SSE-эндпоинта. `null`/`undefined` — соединение не открывается */
  url: string | null | undefined
  /** Включить/выключить соединение (по умолчанию true) */
  enabled?: boolean
  /** `EventSource.withCredentials` */
  withCredentials?: boolean
  /**
   * Обработчики именованных событий (`EventSource.addEventListener`).
   * Ключ `'message'` соответствует безымянным событиям (эквивалент `EventSource.onmessage`).
   */
  events?: Record<string, (event: MessageEvent) => void>
  /** Вызывается при успешном открытии соединения */
  onOpen?: () => void
  /** Вызывается при каждой ошибке соединения, до применения стратегии переподключения */
  onError?: (event: Event) => void
  /**
   * Поведение при ошибке:
   * - `'native'` (по умолчанию) — не закрывать соединение, дать браузеру переподключиться самому
   * - `'none'` — закрыть соединение, не переподключаться
   * - объект — закрыть соединение и переподключиться по заданной стратегии
   */
  reconnect?: 'native' | 'none' | EventSourceReconnectOptions
  /**
   * Форсировать пересоздание соединения при возврате вкладки в фокус (по умолчанию true).
   * Chrome Memory Saver и подобные throttling-политики замораживают фоновые вкладки — старый
   * `EventSource` иногда не переподключается сам при возврате в фокус.
   */
  reconnectOnVisible?: boolean
  /** Минимальный интервал между попытками подключения — защита от частых реконнектов (по умолчанию 0, выключено) */
  minConnectIntervalMs?: number
}

export interface UseEventSourceResult {
  /** Текущий статус соединения */
  status: EventSourceStatus
  /** Принудительно переподключиться (сбрасывает счётчик попыток) */
  reconnect: () => void
  /** Закрыть соединение */
  disconnect: () => void
}

const DEFAULT_RECONNECT: Required<EventSourceReconnectOptions> = {
  strategy: 'exponential',
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  maxAttempts: Infinity,
  jitter: false,
}

function computeDelay(attempt: number, options: Required<EventSourceReconnectOptions>): number {
  const { strategy, baseDelayMs, maxDelayMs, jitter } = options
  let delay: number
  switch (strategy) {
    case 'constant':
      delay = baseDelayMs
      break
    case 'linear':
      delay = baseDelayMs * attempt
      break
    case 'exponential':
    default:
      delay = baseDelayMs * 2 ** (attempt - 1)
      break
  }
  delay = Math.min(delay, maxDelayMs)
  return jitter ? delay * (0.8 + Math.random() * 0.4) : delay
}

/**
 * Единая точка управления `EventSource`-подключением: переподключение с настраиваемым backoff,
 * форсированное пересоздание на `visibilitychange` и поддержка произвольных именованных событий
 * (не только безымянного `onmessage`).
 *
 * Заменяет ручные реализации `new EventSource(...)`, расползшиеся по монорепо — каждая с
 * собственной логикой переподключения и без обработки фоновой заморозки вкладки.
 *
 * @example
 * ```tsx
 * const { status } = useEventSource({
 *   url: '/api/stream',
 *   events: {
 *     message: (event) => setData(JSON.parse(event.data)),
 *   },
 * })
 * ```
 */
export function useEventSource({
  url,
  enabled = true,
  withCredentials,
  events,
  onOpen,
  onError,
  reconnect = 'native',
  reconnectOnVisible = true,
  minConnectIntervalMs = 0,
}: UseEventSourceOptions): UseEventSourceResult {
  const [status, setStatus] = useState<EventSourceStatus>('disconnected')

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptRef = useRef(0)
  const isConnectingRef = useRef(false)
  const lastConnectTimeRef = useRef(0)

  const eventsRef = useRef(events)
  eventsRef.current = events
  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  const reconnectOptions: Required<EventSourceReconnectOptions> | null = typeof reconnect === 'object'
    ? { ...DEFAULT_RECONNECT, ...reconnect }
    : null

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  const connect = useCallback(() => {
    if (!enabled || !url) {
      return
    }

    if (isConnectingRef.current) {
      return
    }

    if (minConnectIntervalMs > 0) {
      const now = Date.now()
      if (now - lastConnectTimeRef.current < minConnectIntervalMs) {
        return
      }
      lastConnectTimeRef.current = now
    }

    isConnectingRef.current = true
    eventSourceRef.current?.close()
    setStatus('connecting')

    const source = withCredentials !== undefined ? new EventSource(url, { withCredentials }) : new EventSource(url)
    eventSourceRef.current = source

    source.addEventListener('open', () => {
      isConnectingRef.current = false
      attemptRef.current = 0
      setStatus('connected')
      onOpenRef.current?.()
    })

    for (const eventName of Object.keys(eventsRef.current ?? {})) {
      source.addEventListener(eventName, (event: Event) => {
        eventsRef.current?.[eventName]?.(event as MessageEvent)
      })
    }

    source.addEventListener('error', (event) => {
      isConnectingRef.current = false
      onErrorRef.current?.(event)

      if (reconnect === 'native') {
        setStatus('error')
        return
      }

      source.close()
      if (eventSourceRef.current === source) {
        eventSourceRef.current = null
      }

      if (reconnect === 'none' || !reconnectOptions) {
        setStatus('disconnected')
        return
      }

      setStatus('error')
      attemptRef.current += 1
      if (attemptRef.current > reconnectOptions.maxAttempts) {
        setStatus('disconnected')
        return
      }

      const delay = computeDelay(attemptRef.current, reconnectOptions)
      clearReconnectTimer()
      reconnectTimeoutRef.current = setTimeout(connect, delay)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reconnectOptions производный от reconnect, уже в зависимостях
  }, [url, enabled, withCredentials, reconnect, minConnectIntervalMs, clearReconnectTimer])

  const disconnect = useCallback(() => {
    clearReconnectTimer()
    isConnectingRef.current = false
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setStatus('disconnected')
  }, [clearReconnectTimer])

  const manualReconnect = useCallback(() => {
    attemptRef.current = 0
    disconnect()
    connect()
  }, [connect, disconnect])

  useEffect(() => {
    if (enabled && url) {
      connect()
    } else {
      disconnect()
    }
    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- connect/disconnect инкапсулируют остальные опции через ref
  }, [url, enabled])

  useEffect(() => {
    if (!reconnectOnVisible) {
      return
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && enabled && url) {
        attemptRef.current = 0
        connect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [reconnectOnVisible, enabled, url, connect])

  return { status, reconnect: manualReconnect, disconnect }
}
