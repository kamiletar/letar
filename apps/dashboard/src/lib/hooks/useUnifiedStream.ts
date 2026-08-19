'use client'

import { useEventSource } from '@letar/hooks'
import { useEffect, useRef, useState } from 'react'

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
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [containers, setContainers] = useState<ContainersData | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const attemptsRef = useRef(0)

  const url = serverId ? `/api/stream/unified?serverId=${encodeURIComponent(serverId)}` : '/api/stream/unified'

  const { status, reconnect: reconnectStream, disconnect } = useEventSource({
    url,
    enabled,
    reconnect: {
      strategy: 'exponential',
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      maxAttempts: maxReconnectAttempts,
      jitter: true,
    },
    events: {
      metrics: (event) => {
        try {
          setMetrics(JSON.parse(event.data) as MetricsData)
        } catch (err) {
          console.error('[Unified Stream] Error parsing metrics:', err)
        }
      },
      containers: (event) => {
        try {
          setContainers(JSON.parse(event.data) as ContainersData)
        } catch (err) {
          console.error('[Unified Stream] Error parsing containers:', err)
        }
      },
    },
  })

  // Отслеживаем число попыток и репортим финальную неудачу — сам useEventSource
  // ретраит молча, наружу нужен и счётчик, и колбэк onError только при исчерпании попыток
  useEffect(() => {
    if (status === 'connected') {
      attemptsRef.current = 0
      setReconnectAttempts(0)
      return
    }
    if (status === 'error') {
      attemptsRef.current += 1
      setReconnectAttempts(attemptsRef.current)
      return
    }
    if (status === 'disconnected' && attemptsRef.current >= maxReconnectAttempts) {
      onError?.('Max reconnection attempts reached')
    }
  }, [status, maxReconnectAttempts, onError])

  const error = status === 'error'
    ? 'Connection lost, reconnecting...'
    : status === 'disconnected' && attemptsRef.current >= maxReconnectAttempts
    ? 'Max reconnection attempts reached'
    : null

  const reconnect = () => {
    attemptsRef.current = 0
    setReconnectAttempts(0)
    reconnectStream()
  }

  const state: UnifiedStreamState = {
    metrics,
    containers,
    isConnected: status === 'connected',
    error,
    reconnectAttempts,
  }

  return {
    ...state,
    reconnect,
    disconnect,
  }
}
