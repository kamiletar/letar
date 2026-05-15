'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Информация о CPU */
interface CPUData {
  brand: string
  cores: number
  currentLoad: number
  avgLoad: number
}

/** Информация о памяти */
interface MemoryData {
  total: number
  used: number
  available: number
  usedPercentage: string
}

/** Информация о диске */
interface DiskData {
  mount: string
  size: number
  used: number
  use: number
}

/** Контейнер Docker */
interface Container {
  id: string
  names: string[]
  image: string
  state: string
  status: string
}

/** Статистика памяти контейнера */
interface ContainerMemory {
  id: string
  name: string
  memoryUsage: number
  memoryLimit: number
  memoryPercent: number
}

/** Данные метрик */
export interface MetricsData {
  cpu: CPUData
  memory: MemoryData
  disk: DiskData[]
  timestamp: string
}

/** Данные контейнеров */
export interface ContainersData {
  containers: Container[]
  memory: {
    containers: ContainerMemory[]
    totalDockerMemory: number
    containerCount: number
  }
  timestamp: string
}

/** Состояние unified stream */
export interface UnifiedStreamState {
  metrics: MetricsData | null
  containers: ContainersData | null
  isConnected: boolean
  error: string | null
  reconnectAttempts: number
}

interface UseUnifiedStreamOptions {
  enabled?: boolean
  serverId?: string | null
  maxReconnectAttempts?: number
  onError?: (error: string) => void
}

// Экспоненциальный backoff для переподключения
const getReconnectDelay = (attempt: number) => {
  const baseDelay = 1000 // 1 секунда
  const maxDelay = 30000 // 30 секунд
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
  // Добавляем jitter ±20%
  return delay * (0.8 + Math.random() * 0.4)
}

/**
 * Хук для подключения к единому SSE потоку метрик
 * Объединяет metrics и containers в одно соединение
 *
 * @param serverId - ID сервера для запроса (опционально, по умолчанию локальный)
 */
export function useUnifiedStream({
  enabled = true,
  serverId,
  maxReconnectAttempts = 5,
  onError,
}: UseUnifiedStreamOptions = {}) {
  const [state, setState] = useState<UnifiedStreamState>({
    metrics: null,
    containers: null,
    isConnected: false,
    error: null,
    reconnectAttempts: 0,
  })

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current) {
      return
    }

    // Закрываем существующее соединение
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    try {
      // Формируем URL с serverId
      const url = serverId ? `/api/stream/unified?serverId=${encodeURIComponent(serverId)}` : '/api/stream/unified'

      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      eventSource.addEventListener('open', () => {
        if (!mountedRef.current) {
          return
        }
        // eslint-disable-next-line no-console -- Логирование SSE соединения для отладки
        console.log('[Unified Stream] Connected')
        setState((prev) => ({
          ...prev,
          isConnected: true,
          error: null,
          reconnectAttempts: 0,
        }))
      })

      // Обработка метрик
      eventSource.addEventListener('metrics', (event: MessageEvent) => {
        if (!mountedRef.current) {
          return
        }
        try {
          const data = JSON.parse(event.data) as MetricsData
          setState((prev) => ({ ...prev, metrics: data }))
        } catch (err) {
          console.error('[Unified Stream] Error parsing metrics:', err)
        }
      })

      // Обработка контейнеров
      eventSource.addEventListener('containers', (event: MessageEvent) => {
        if (!mountedRef.current) {
          return
        }
        try {
          const data = JSON.parse(event.data) as ContainersData
          setState((prev) => ({ ...prev, containers: data }))
        } catch (err) {
          console.error('[Unified Stream] Error parsing containers:', err)
        }
      })

      // Обработка ошибок
      eventSource.addEventListener('error', () => {
        if (!mountedRef.current) {
          return
        }

        eventSource.close()
        eventSourceRef.current = null

        setState((prev) => {
          const newAttempts = prev.reconnectAttempts + 1
          const shouldReconnect = newAttempts <= maxReconnectAttempts

          if (!shouldReconnect) {
            const errorMsg = 'Max reconnection attempts reached'
            onError?.(errorMsg)
            return {
              ...prev,
              isConnected: false,
              error: errorMsg,
              reconnectAttempts: newAttempts,
            }
          }

          // Планируем переподключение с exponential backoff
          const delay = getReconnectDelay(newAttempts)
          // eslint-disable-next-line no-console -- Логирование переподключения
          console.log(`[Unified Stream] Reconnecting in ${Math.round(delay)}ms (attempt ${newAttempts})`)

          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect()
            }
          }, delay)

          return {
            ...prev,
            isConnected: false,
            error: 'Connection lost, reconnecting...',
            reconnectAttempts: newAttempts,
          }
        })
      })
    } catch (err) {
      console.error('[Unified Stream] Failed to create EventSource:', err)
      setState((prev) => ({
        ...prev,
        isConnected: false,
        error: 'Failed to connect',
      }))
    }
  }, [enabled, serverId, maxReconnectAttempts, onError])

  // Подключение при монтировании
  useEffect(() => {
    mountedRef.current = true

    if (enabled) {
      connect()
    }

    return () => {
      mountedRef.current = false

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [connect, enabled])

  // Ручное переподключение
  const reconnect = useCallback(() => {
    setState((prev) => ({ ...prev, reconnectAttempts: 0 }))
    connect()
  }, [connect])

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
    setState((prev) => ({ ...prev, isConnected: false }))
  }, [])

  return {
    ...state,
    reconnect,
    disconnect,
  }
}
