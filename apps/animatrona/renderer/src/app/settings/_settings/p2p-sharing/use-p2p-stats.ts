'use client'

/**
 * Хук для P2P статистики — загружает UserStats, DailyStats,
 * и ведёт кольцевой буфер bandwidth за сессию (60 точек).
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import type { IpfsServiceStatus } from '../../../../../../shared/types/ipfs'
import type { DailyStats, UserStats } from '../../../../../../shared/types/stats'

/** Точка данных bandwidth для графика */
export interface BandwidthPoint {
  /** Время (HH:MM:SS) */
  time: string
  /** Абсолютное время (Date.now()) для фильтрации по периоду */
  timestamp: number
  /** Входящая скорость (bytes/sec) */
  inSpeed: number
  /** Исходящая скорость (bytes/sec) */
  outSpeed: number
}

/** 3 часа при ~1 точке/сек */
const BUFFER_SIZE = 10800

export interface UseP2PStatsReturn {
  /** Суммарная статистика (всё время) */
  userStats: UserStats | null
  /** Дневная история за 30 дней */
  dailyHistory: DailyStats[]
  /** Кольцевой буфер bandwidth за сессию */
  bandwidthHistory: BandwidthPoint[]
  /** Текущий IPFS статус */
  ipfsStatus: IpfsServiceStatus | null
  /** Загрузка данных */
  isLoading: boolean
}

export function useP2PStats(): UseP2PStatsReturn {
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [dailyHistory, setDailyHistory] = useState<DailyStats[]>([])
  const [bandwidthHistory, setBandwidthHistory] = useState<BandwidthPoint[]>([])
  const [ipfsStatus, setIpfsStatus] = useState<IpfsServiceStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Для вычисления скорости из дельты байт
  const prevBytesRef = useRef<{ bytesIn: number; bytesOut: number; timestamp: number } | null>(null)

  // Загрузка начальных данных
  useEffect(() => {
    const load = async () => {
      const api = window.electronAPI
      if (!api) {
        return
      }

      try {
        const [statsResult, historyResult, ipfsResult] = await Promise.all([
          api.stats.get(),
          api.stats.getDailyHistory(30),
          api.ipfs.status(),
        ])

        if (statsResult.success && statsResult.data) {
          setUserStats(statsResult.data)
        }
        if (historyResult.success && historyResult.data) {
          setDailyHistory(historyResult.data)
        }
        if (ipfsResult.success && ipfsResult.data) {
          setIpfsStatus(ipfsResult.data)
        }
      } catch {
        // Игнорируем ошибки загрузки
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  // Обработка нового статуса IPFS → добавление точки в буфер
  const handleStatusUpdate = useCallback((status: IpfsServiceStatus) => {
    setIpfsStatus(status)

    if (!status.isRunning) {
      prevBytesRef.current = null
      return
    }

    const now = Date.now()
    const prev = prevBytesRef.current

    if (prev) {
      const timeDiff = (now - prev.timestamp) / 1000
      if (timeDiff > 0) {
        const inSpeed = Math.max(0, (status.bytesIn - prev.bytesIn) / timeDiff)
        const outSpeed = Math.max(0, (status.bytesOut - prev.bytesOut) / timeDiff)

        const timeStr = new Date().toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })

        const point: BandwidthPoint = { time: timeStr, timestamp: now, inSpeed, outSpeed }

        setBandwidthHistory((prev) => {
          const next = [...prev, point]
          return next.length > BUFFER_SIZE ? next.slice(-BUFFER_SIZE) : next
        })
      }
    }

    prevBytesRef.current = {
      bytesIn: status.bytesIn,
      bytesOut: status.bytesOut,
      timestamp: now,
    }
  }, [])

  // Подписка на обновления IPFS статуса
  useEffect(() => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return
    }

    const unsub = api.onStatusChanged(handleStatusUpdate)
    return () => unsub()
  }, [handleStatusUpdate])

  // Подписка на обновления статистики
  useEffect(() => {
    const api = window.electronAPI?.stats
    if (!api) {
      return
    }

    const unsub = api.onUpdated((event) => {
      setUserStats(event.stats)
    })
    return () => unsub()
  }, [])

  return {
    userStats,
    dailyHistory,
    bandwidthHistory,
    ipfsStatus,
    isLoading,
  }
}
