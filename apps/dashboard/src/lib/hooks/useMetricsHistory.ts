'use client'

import type { MetricDataPoint } from '@/app/_components/charts'
import { useCallback, useRef, useState } from 'react'

interface MetricsHistory {
  cpu: MetricDataPoint[]
  memory: MetricDataPoint[]
  disk: MetricDataPoint[]
}

interface UseMetricsHistoryOptions {
  maxPoints?: number
  intervalMs?: number
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Хук для хранения исторических данных метрик для графиков
 * Накапливает точки данных с настраиваемым максимальным количеством
 */
export function useMetricsHistory(options: UseMetricsHistoryOptions = {}) {
  const { maxPoints = 60, intervalMs = 5000 } = options

  const [history, setHistory] = useState<MetricsHistory>({
    cpu: [],
    memory: [],
    disk: [],
  })

  const lastUpdateRef = useRef<number>(0)

  const addDataPoint = useCallback(
    (cpu: number | undefined, memory: number | undefined, disk: number | undefined) => {
      const now = Date.now()

      // Ограничиваем частоту обновлений
      if (now - lastUpdateRef.current < intervalMs - 500) {
        return
      }
      lastUpdateRef.current = now

      const timestamp = now
      const time = formatTime(new Date(timestamp))

      setHistory((prev) => {
        const newHistory: MetricsHistory = {
          cpu: [...prev.cpu],
          memory: [...prev.memory],
          disk: [...prev.disk],
        }

        // Добавляем точку CPU
        if (cpu !== undefined) {
          newHistory.cpu.push({ time, value: cpu, timestamp })
          if (newHistory.cpu.length > maxPoints) {
            newHistory.cpu = newHistory.cpu.slice(-maxPoints)
          }
        }

        // Добавляем точку памяти
        if (memory !== undefined) {
          newHistory.memory.push({ time, value: memory, timestamp })
          if (newHistory.memory.length > maxPoints) {
            newHistory.memory = newHistory.memory.slice(-maxPoints)
          }
        }

        // Добавляем точку диска
        if (disk !== undefined) {
          newHistory.disk.push({ time, value: disk, timestamp })
          if (newHistory.disk.length > maxPoints) {
            newHistory.disk = newHistory.disk.slice(-maxPoints)
          }
        }

        return newHistory
      })
    },
    [maxPoints, intervalMs]
  )

  const clearHistory = useCallback(() => {
    setHistory({
      cpu: [],
      memory: [],
      disk: [],
    })
    lastUpdateRef.current = 0
  }, [])

  return {
    history,
    addDataPoint,
    clearHistory,
  }
}

/**
 * Генерация начальных данных истории для демо/состояния загрузки
 */
export function generateInitialHistory(points = 10): MetricsHistory {
  const now = Date.now()
  const interval = 5000 // 5 секунд между точками

  const generatePoints = (baseValue: number, variance: number): MetricDataPoint[] => {
    return Array.from({ length: points }, (_, i) => {
      const timestamp = now - (points - 1 - i) * interval
      const value = baseValue + (Math.random() - 0.5) * variance
      return {
        time: formatTime(new Date(timestamp)),
        value: Math.max(0, Math.min(100, value)),
        timestamp,
      }
    })
  }

  return {
    cpu: generatePoints(25, 20),
    memory: generatePoints(45, 10),
    disk: generatePoints(60, 5),
  }
}
