'use client'

import { useSSE } from './useSSE'

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

/** Информация о сети */
interface NetworkData {
  rx: number
  tx: number
}

/** Данные метрик от SSE */
interface MetricsData {
  cpu: CPUData
  memory: MemoryData
  disk: DiskData[]
  network: NetworkData
  timestamp: string
}

export function useRealtimeMetrics(enabled = true) {
  return useSSE<MetricsData>({
    url: '/api/stream/metrics',
    eventName: 'metrics',
    enabled,
    onError: (error) => {
      console.error('[Realtime Metrics] Connection error:', error)
    },
  })
}
