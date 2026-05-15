/**
 * Real-time обновления через Server-Sent Events (SSE)
 *
 * Предоставляет:
 * - useRealtime — подписка на события
 * - useRealtimeQuery — интеграция с TanStack Query
 * - RealtimeIndicator — индикатор статуса подключения
 *
 * @module use-realtime
 */

'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

// === Типы ===

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface RealtimeEvent<T = unknown> {
  /** Тип события */
  type: string
  /** Данные события */
  data: T
  /** Временная метка */
  timestamp: number
}

export interface UseRealtimeOptions {
  /** URL SSE endpoint */
  url: string
  /** Автоматическое переподключение */
  autoReconnect?: boolean
  /** Задержка перед переподключением (мс) */
  reconnectDelay?: number
  /** Максимальное количество попыток переподключения */
  maxRetries?: number
  /** Callback при получении события */
  onMessage?: (event: RealtimeEvent) => void
  /** Callback при ошибке */
  onError?: (error: Error) => void
  /** Callback при изменении статуса */
  onStatusChange?: (status: RealtimeStatus) => void
  /** Включить/выключить подключение */
  enabled?: boolean
}

export interface UseRealtimeReturn {
  /** Текущий статус подключения */
  status: RealtimeStatus
  /** Последнее полученное событие */
  lastEvent: RealtimeEvent | null
  /** Время последнего обновления */
  lastUpdated: Date | null
  /** Переподключиться */
  reconnect: () => void
  /** Отключиться */
  disconnect: () => void
}

// === Основной хук ===

export function useRealtime({
  url,
  autoReconnect = true,
  reconnectDelay = 3000,
  maxRetries = 5,
  onMessage,
  onError,
  onStatusChange,
  enabled = true,
}: UseRealtimeOptions): UseRealtimeReturn {
  const [status, setStatus] = useState<RealtimeStatus>('disconnected')
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const retriesRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Обновление статуса
  const updateStatus = useCallback(
    (newStatus: RealtimeStatus) => {
      setStatus(newStatus)
      onStatusChange?.(newStatus)
    },
    [onStatusChange]
  )

  // Подключение
  const connect = useCallback(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    // Закрываем предыдущее подключение
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    updateStatus('connecting')

    try {
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        updateStatus('connected')
        retriesRef.current = 0
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as RealtimeEvent
          setLastEvent(data)
          setLastUpdated(new Date())
          onMessage?.(data)
        } catch {
          // Если не JSON, создаём событие из строки
          const realtimeEvent: RealtimeEvent = {
            type: 'message',
            data: event.data,
            timestamp: Date.now(),
          }
          setLastEvent(realtimeEvent)
          setLastUpdated(new Date())
          onMessage?.(realtimeEvent)
        }
      }

      eventSource.onerror = () => {
        updateStatus('error')
        eventSource.close()

        // Переподключение
        if (autoReconnect && retriesRef.current < maxRetries) {
          retriesRef.current++
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectDelay * retriesRef.current)
        } else {
          updateStatus('disconnected')
          onError?.(new Error('SSE connection failed'))
        }
      }
    } catch (error) {
      updateStatus('error')
      onError?.(error instanceof Error ? error : new Error('Failed to connect'))
    }
  }, [url, enabled, autoReconnect, reconnectDelay, maxRetries, onMessage, onError, updateStatus])

  // Отключение
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    updateStatus('disconnected')
  }, [updateStatus])

  // Переподключение
  const reconnect = useCallback(() => {
    retriesRef.current = 0
    disconnect()
    connect()
  }, [connect, disconnect])

  // Эффект подключения/отключения
  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  return {
    status,
    lastEvent,
    lastUpdated,
    reconnect,
    disconnect,
  }
}

// === Хук интеграции с TanStack Query ===

export interface UseRealtimeQueryOptions extends Omit<UseRealtimeOptions, 'onMessage'> {
  /** Query keys для инвалидации */
  queryKeys: unknown[][]
  /** Типы событий для отслеживания */
  eventTypes?: string[]
}

export function useRealtimeQuery({ queryKeys, eventTypes, ...options }: UseRealtimeQueryOptions) {
  const queryClient = useQueryClient()

  const handleMessage = useCallback(
    (event: RealtimeEvent) => {
      // Если указаны типы событий, фильтруем
      if (eventTypes && !eventTypes.includes(event.type)) {
        return
      }

      // Инвалидируем все указанные query keys
      queryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key })
      })
    },
    [queryClient, queryKeys, eventTypes]
  )

  return useRealtime({
    ...options,
    onMessage: handleMessage,
  })
}

// === Форматирование времени ===

export function formatLastUpdated(date: Date | null): string {
  if (!date) {
    return 'Никогда'
  }

  const now = new Date()
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffSeconds < 5) {
    return 'Только что'
  }
  if (diffSeconds < 60) {
    return `${diffSeconds} сек. назад`
  }
  if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)} мин. назад`
  }

  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

// === Статусы для UI ===

export const REALTIME_STATUS_CONFIG: Record<RealtimeStatus, { label: string; color: string }> = {
  connecting: { label: 'Подключение...', color: 'yellow' },
  connected: { label: 'Подключено', color: 'green' },
  disconnected: { label: 'Отключено', color: 'gray' },
  error: { label: 'Ошибка', color: 'red' },
}
