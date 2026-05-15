'use client'

/**
 * Хук для пакетной публикации аниме на трекер
 *
 * Управляет состоянием 3-шагового диалога:
 * 1. Выбор аниме (SelectStep)
 * 2. Прогресс публикации (ProgressStep)
 * 3. Результаты (ResultStep)
 */

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { WatchStatus } from '@/generated/prisma'

/** Данные аниме для отображения в списке выбора */
export interface BatchAnimeItem {
  id: string
  name: string
  directoryCid: string | null
  trackerPublishedAt: Date | string | null
  /** directoryCid на момент последней публикации (для сравнения) */
  trackerPublishedCid: string | null
  watchStatus: WatchStatus
}

/** Шаг диалога */
export type BatchStep = 'select' | 'progress' | 'result'

/** Прогресс одного элемента */
export interface BatchItemProgress {
  directoryCid: string
  animeName: string
  result?: {
    success: boolean
    error?: string
  }
}

/** Результат пакетной публикации */
export interface BatchResult {
  total: number
  successCount: number
  errorCount: number
  cancelledCount: number
  results: Array<{
    directoryCid: string
    animeName: string
    result: {
      success: boolean
      animeId?: string
      status?: string
      episodeCount?: number
      error?: string
      isReplacement?: boolean
      replacesAnimeId?: string
    }
  }>
}

/** Фильтр по статусу просмотра */
export type WatchStatusFilter = WatchStatus | 'ALL'

export function useBatchPublish(animes: BatchAnimeItem[]) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<BatchStep>('select')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [watchStatusFilter, setWatchStatusFilter] = useState<WatchStatusFilter>('COMPLETED')
  const [isPublishing, setIsPublishing] = useState(false)

  // Прогресс
  const [current, setCurrent] = useState(0)
  const [total, setTotal] = useState(0)
  const [currentAnimeName, setCurrentAnimeName] = useState('')
  const [processedItems, setProcessedItems] = useState<BatchItemProgress[]>([])

  // Результат
  const [result, setResult] = useState<BatchResult | null>(null)

  // Ref для cleanup listener
  const cleanupRef = useRef<(() => void) | null>(null)

  // Аниме с directoryCid (можно опубликовать)
  const publishableAnimes = animes.filter((a) => a.directoryCid != null)

  // Фильтрованный список по watchStatus
  const filteredAnimes =
    watchStatusFilter === 'ALL'
      ? publishableAnimes
      : publishableAnimes.filter((a) => a.watchStatus === watchStatusFilter)

  /** Переключить выбор одного аниме */
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  /** Выбрать все видимые */
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredAnimes.map((a) => a.id)))
  }, [filteredAnimes])

  /** Снять выбор всех */
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  /** Выбрать неопубликованные и требующие обновления */
  const selectUnpublished = useCallback(() => {
    setSelectedIds(
      new Set(
        filteredAnimes.filter((a) => !a.trackerPublishedAt || a.trackerPublishedCid !== a.directoryCid).map((a) => a.id)
      )
    )
  }, [filteredAnimes])

  /** Запуск пакетной публикации */
  const startPublish = useCallback(async () => {
    const items = animes
      .filter((a) => selectedIds.has(a.id) && a.directoryCid)
      .map((a) => ({
        animeId: a.id,
        directoryCid: a.directoryCid!,
        animeName: a.name,
      }))

    if (items.length === 0) {
      return
    }

    setStep('progress')
    setIsPublishing(true)
    setCurrent(0)
    setTotal(items.length)
    setCurrentAnimeName('')
    setProcessedItems([])

    // Подписка на прогресс
    const cleanup = window.electronAPI!.ipfs.onTrackerBatchProgress(
      (progress: {
        current: number
        total: number
        currentAnimeName: string
        currentDirectoryCid: string
        result?: { success: boolean; animeId?: string; status?: string; episodeCount?: number; error?: string }
      }) => {
        setCurrent(progress.current)
        setTotal(progress.total)
        setCurrentAnimeName(progress.currentAnimeName)

        if (progress.result) {
          setProcessedItems((prev) => [
            ...prev,
            {
              directoryCid: progress.currentDirectoryCid,
              animeName: progress.currentAnimeName,
              result: {
                success: progress.result!.success,
                error: progress.result!.error,
              },
            },
          ])
        }
      }
    )
    cleanupRef.current = cleanup

    // Запуск
    const response = await window.electronAPI!.ipfs.trackerBatchPublish(items)

    // Cleanup listener
    cleanup()
    cleanupRef.current = null
    setIsPublishing(false)

    if (response.success && response.data) {
      setResult(response.data)
    } else {
      setResult({
        total: items.length,
        successCount: 0,
        errorCount: items.length,
        cancelledCount: 0,
        results: [],
      })
    }

    setStep('result')

    // Инвалидируем кеш — main process обновил trackerPublishedAt/trackerPublishedCid
    queryClient.invalidateQueries({ queryKey: ['animes'] })
  }, [animes, selectedIds, queryClient])

  /** Отмена пакетной публикации */
  const cancelPublish = useCallback(async () => {
    await window.electronAPI!.ipfs.trackerCancelBatch()
  }, [])

  /** Сброс (вернуться к выбору) */
  const reset = useCallback(() => {
    setStep('select')
    setSelectedIds(new Set())
    setCurrent(0)
    setTotal(0)
    setCurrentAnimeName('')
    setProcessedItems([])
    setResult(null)
  }, [])

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      cleanupRef.current?.()
    }
  }, [])

  return {
    // Шаг
    step,

    // Выбор
    filteredAnimes,
    selectedIds,
    watchStatusFilter,
    setWatchStatusFilter,
    toggleSelection,
    selectAll,
    deselectAll,
    selectUnpublished,

    // Прогресс
    isPublishing,
    current,
    total,
    currentAnimeName,
    processedItems,

    // Результат
    result,

    // Действия
    startPublish,
    cancelPublish,
    reset,
  }
}
