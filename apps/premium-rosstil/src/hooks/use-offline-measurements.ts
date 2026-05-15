'use client'

import type { Gender } from '@/generated/prisma'
import { get, set } from 'idb-keyval'
import { useCallback, useEffect, useState } from 'react'

const IDB_KEY = 'OFFLINE_MEASUREMENTS'

/**
 * Структура мерок для оффлайн хранения
 */
export interface OfflineMeasurements {
  gender: Gender
  bust?: number
  waist?: number
  hips?: number
  height?: number
  preferredSize?: string
  notes?: string
  updatedAt: string // ISO дата последнего обновления
}

/**
 * Запись в истории изменений мерок
 */
export interface MeasurementHistoryEntry {
  date: string // ISO дата
  bust?: number
  waist?: number
  hips?: number
  height?: number
}

/**
 * Хук для работы с мерками в оффлайн режиме.
 * Сохраняет мерки в IndexedDB для доступа без интернета.
 */
export function useOfflineMeasurements() {
  const [measurements, setMeasurements] = useState<OfflineMeasurements | null>(null)
  const [history, setHistory] = useState<MeasurementHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Загрузка из IndexedDB при монтировании
  useEffect(() => {
    const loadMeasurements = async () => {
      try {
        const stored = await get<{ measurements: OfflineMeasurements; history: MeasurementHistoryEntry[] }>(IDB_KEY)
        if (stored) {
          setMeasurements(stored.measurements)
          setHistory(stored.history || [])
        }
      } catch (error) {
        console.error('Ошибка загрузки мерок из IndexedDB:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadMeasurements()
  }, [])

  // Сохранение мерок
  const saveMeasurements = useCallback(
    async (newMeasurements: Omit<OfflineMeasurements, 'updatedAt'>) => {
      const now = new Date().toISOString()
      const updated: OfflineMeasurements = {
        ...newMeasurements,
        updatedAt: now,
      }

      // Добавляем в историю, если есть изменения в числовых мерках
      const historyEntry: MeasurementHistoryEntry = {
        date: now,
        bust: newMeasurements.bust,
        waist: newMeasurements.waist,
        hips: newMeasurements.hips,
        height: newMeasurements.height,
      }

      // Сохраняем только если есть хотя бы одна мерка
      const hasAnyMeasurement = historyEntry.bust || historyEntry.waist || historyEntry.hips || historyEntry.height
      const newHistory = hasAnyMeasurement ? [...history, historyEntry].slice(-10) : history // Храним максимум 10 записей

      try {
        await set(IDB_KEY, { measurements: updated, history: newHistory })
        setMeasurements(updated)
        setHistory(newHistory)
        return { success: true }
      } catch (error) {
        console.error('Ошибка сохранения мерок в IndexedDB:', error)
        return { success: false, error }
      }
    },
    [history]
  )

  // Получение рекомендации размера на основе мерок
  const getRecommendedSize = useCallback(
    (bust?: number, waist?: number, hips?: number, gender?: Gender): string | null => {
      if (!bust && !waist && !hips) {
        return null
      }

      // Используем текущие мерки если не переданы
      const b = bust ?? measurements?.bust
      const w = waist ?? measurements?.waist
      const h = hips ?? measurements?.hips
      const g = gender ?? measurements?.gender

      if (!g) {
        return null
      }

      // Размерная сетка для женщин (российские размеры)
      const femaleChart: Array<{
        size: string
        bust: [number, number]
        waist: [number, number]
        hips: [number, number]
      }> = [
        { size: '40 (XS)', bust: [76, 80], waist: [58, 62], hips: [82, 86] },
        { size: '42 (S)', bust: [80, 84], waist: [62, 66], hips: [86, 90] },
        { size: '44 (S)', bust: [84, 88], waist: [66, 70], hips: [90, 94] },
        { size: '46 (M)', bust: [88, 92], waist: [70, 74], hips: [94, 98] },
        { size: '48 (M)', bust: [92, 96], waist: [74, 78], hips: [98, 102] },
        { size: '50 (L)', bust: [96, 100], waist: [78, 82], hips: [102, 106] },
        { size: '52 (L)', bust: [100, 104], waist: [82, 86], hips: [106, 110] },
        { size: '54 (XL)', bust: [104, 108], waist: [86, 90], hips: [110, 114] },
        { size: '56 (XXL)', bust: [108, 112], waist: [90, 94], hips: [114, 118] },
      ]

      // Размерная сетка для мужчин
      const maleChart: Array<{
        size: string
        bust: [number, number]
        waist: [number, number]
        hips: [number, number]
      }> = [
        { size: '44 (XS)', bust: [86, 90], waist: [74, 78], hips: [90, 94] },
        { size: '46 (S)', bust: [90, 94], waist: [78, 82], hips: [94, 98] },
        { size: '48 (M)', bust: [94, 98], waist: [82, 86], hips: [98, 102] },
        { size: '50 (M)', bust: [98, 102], waist: [86, 90], hips: [102, 106] },
        { size: '52 (L)', bust: [102, 106], waist: [90, 94], hips: [106, 110] },
        { size: '54 (L)', bust: [106, 110], waist: [94, 98], hips: [110, 114] },
        { size: '56 (XL)', bust: [110, 114], waist: [98, 102], hips: [114, 118] },
        { size: '58 (XXL)', bust: [114, 118], waist: [102, 106], hips: [118, 122] },
      ]

      const chart = g === 'MALE' ? maleChart : femaleChart

      // Находим размер, соответствующий мерках
      for (const row of chart) {
        const bustMatch = !b || (b >= row.bust[0] && b <= row.bust[1])
        const waistMatch = !w || (w >= row.waist[0] && w <= row.waist[1])
        const hipsMatch = !h || (h >= row.hips[0] && h <= row.hips[1])

        if (bustMatch && waistMatch && hipsMatch) {
          return row.size
        }
      }

      // Если не нашли точное соответствие, возвращаем ближайший по груди
      if (b) {
        for (const row of chart) {
          if (b <= row.bust[1]) {
            return row.size
          }
        }
        return chart[chart.length - 1].size
      }

      return null
    },
    [measurements]
  )

  // Сравнение мерок с размерной сеткой товара
  const compareWithSizeChart = useCallback(
    (
      sizeChart: Array<{ size: string; bust?: number; waist?: number; hips?: number }>
    ): Array<{ size: string; fit: 'tight' | 'perfect' | 'loose'; details: string }> => {
      if (!measurements) {
        return []
      }

      return sizeChart.map((row) => {
        const diffs: string[] = []
        let totalDiff = 0
        let count = 0

        if (row.bust && measurements.bust) {
          const diff = measurements.bust - row.bust
          diffs.push(`Грудь: ${diff > 0 ? '+' : ''}${diff} см`)
          totalDiff += diff
          count++
        }
        if (row.waist && measurements.waist) {
          const diff = measurements.waist - row.waist
          diffs.push(`Талия: ${diff > 0 ? '+' : ''}${diff} см`)
          totalDiff += diff
          count++
        }
        if (row.hips && measurements.hips) {
          const diff = measurements.hips - row.hips
          diffs.push(`Бёдра: ${diff > 0 ? '+' : ''}${diff} см`)
          totalDiff += diff
          count++
        }

        const avgDiff = count > 0 ? totalDiff / count : 0
        let fit: 'tight' | 'perfect' | 'loose'
        if (avgDiff < -2) {
          fit = 'tight'
        } else if (avgDiff > 2) {
          fit = 'loose'
        } else {
          fit = 'perfect'
        }

        return {
          size: row.size,
          fit,
          details: diffs.join(', ') || 'Нет данных для сравнения',
        }
      })
    },
    [measurements]
  )

  return {
    measurements,
    history,
    isLoading,
    saveMeasurements,
    getRecommendedSize,
    compareWithSizeChart,
    hasMeasurements: !!measurements,
  }
}
