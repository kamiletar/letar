'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  DemuxResult,
  PerFileTranscodeSettings,
  QueueItem,
  QueueItemStatus,
  TranscodeProgressExtended,
} from '../../../shared/types'

/**
 * Состояние менеджера очереди транскодирования
 */
export interface TranscodeManagerState {
  /** Очередь элементов */
  queue: QueueItem[]
  /** Идёт ли обработка */
  isProcessing: boolean
  /** Загружается ли начальное состояние */
  isLoading: boolean
  /** Доступна ли пауза на этой платформе */
  pauseAvailable: boolean
  /** Метод паузы (signals/pssuspend/none) */
  pauseMethod: 'signals' | 'pssuspend' | 'none'
  /** Путь к библиотеке */
  libraryPath: string | null
}

/**
 * Хук для управления очередью транскодирования
 *
 * Предоставляет:
 * - Состояние очереди с реактивными обновлениями
 * - Методы управления (добавить, удалить, пауза, отмена)
 * - Подписки на события прогресса
 */
export function useTranscodeManager() {
  const [state, setState] = useState<TranscodeManagerState>({
    queue: [],
    isProcessing: false,
    isLoading: true,
    pauseAvailable: false,
    pauseMethod: 'none',
    libraryPath: null,
  })

  // Загрузка начального состояния
  useEffect(() => {
    const api = window.electronAPI
    if (!api) {
      setState((prev) => ({ ...prev, isLoading: false }))
      return
    }

    const loadInitial = async () => {
      try {
        // Загружаем очередь и возможности паузы параллельно
        const [queueResult, pauseResult] = await Promise.all([
          api.transcode.getQueue(),
          api.transcode.getPauseCapabilities(),
        ])

        setState((prev) => ({
          ...prev,
          queue: queueResult.success ? queueResult.queue : [],
          pauseAvailable: pauseResult.success && pauseResult.available,
          pauseMethod: pauseResult.method ?? 'none',
          isLoading: false,
        }))
      } catch (error) {
        console.error('[useTranscodeManager] loadInitial error:', error)
        setState((prev) => ({ ...prev, isLoading: false }))
      }
    }

    loadInitial()
  }, [])

  // Подписки на события
  useEffect(() => {
    const api = window.electronAPI
    if (!api) {
      return
    }

    // Прогресс элемента
    const unsubProgress = api.transcode.onProgress((id: string, progress: TranscodeProgressExtended) => {
      setState((prev) => ({
        ...prev,
        queue: prev.queue.map((item) => (item.id === id ? { ...item, progress } : item)),
      }))
    })

    // Изменение статуса
    const unsubStatus = api.transcode.onStatusChange((id: string, status: QueueItemStatus, error?: string) => {
      setState((prev) => ({
        ...prev,
        queue: prev.queue.map((item) => (item.id === id ? { ...item, status, error } : item)),
      }))
    })

    // Изменение очереди
    const unsubQueue = api.transcode.onQueueChange((queue: QueueItem[]) => {
      setState((prev) => ({ ...prev, queue }))
    })

    // Начало обработки
    const unsubStarted = api.transcode.onProcessingStarted(() => {
      setState((prev) => ({ ...prev, isProcessing: true }))
    })

    // Завершение обработки
    const unsubCompleted = api.transcode.onProcessingCompleted(() => {
      setState((prev) => ({ ...prev, isProcessing: false }))
    })

    return () => {
      unsubProgress()
      unsubStatus()
      unsubQueue()
      unsubStarted()
      unsubCompleted()
    }
  }, [])

  // === Методы управления ===

  /** Добавить файл в очередь */
  const addToQueue = useCallback(async (filePath: string, settings?: PerFileTranscodeSettings) => {
    const api = window.electronAPI
    if (!api) {
      return null
    }

    const result = await api.transcode.addToQueue(filePath, settings)
    return result.success ? result.id : null
  }, [])

  /** Добавить несколько файлов в очередь */
  const addFilesToQueue = useCallback(
    async (filePaths: string[], settings?: PerFileTranscodeSettings) => {
      const results: Array<{ path: string; id: string | null }> = []

      for (const path of filePaths) {
        const id = await addToQueue(path, settings)
        results.push({ path, id: id ?? null })
      }

      return results
    },
    [addToQueue]
  )

  /** Удалить из очереди */
  const removeFromQueue = useCallback(async (id: string) => {
    const api = window.electronAPI
    if (!api) {
      return false
    }

    const result = await api.transcode.removeFromQueue(id)
    return result.success
  }, [])

  /** Начать обработку очереди */
  const startProcessing = useCallback(async () => {
    const api = window.electronAPI
    if (!api) {
      return false
    }

    const result = await api.transcode.start()
    if (result.success) {
      setState((prev) => ({ ...prev, isProcessing: true }))
    }
    return result.success
  }, [])

  /** Приостановить элемент */
  const pauseItem = useCallback(async (id: string) => {
    const api = window.electronAPI
    if (!api) {
      return false
    }

    const result = await api.transcode.pauseItem(id)
    return result.success
  }, [])

  /** Возобновить элемент */
  const resumeItem = useCallback(async (id: string) => {
    const api = window.electronAPI
    if (!api) {
      return false
    }

    const result = await api.transcode.resumeItem(id)
    return result.success
  }, [])

  /** Отменить элемент */
  const cancelItem = useCallback(async (id: string) => {
    const api = window.electronAPI
    if (!api) {
      return false
    }

    const result = await api.transcode.cancelItem(id)
    return result.success
  }, [])

  /** Приостановить всю обработку */
  const pauseAll = useCallback(async () => {
    const api = window.electronAPI
    if (!api) {
      return false
    }

    const result = await api.transcode.pauseAll()
    return result.success
  }, [])

  /** Возобновить всю обработку */
  const resumeAll = useCallback(async () => {
    const api = window.electronAPI
    if (!api) {
      return false
    }

    const result = await api.transcode.resumeAll()
    return result.success
  }, [])

  /** Изменить порядок очереди */
  const reorderQueue = useCallback(async (orderedIds: string[]) => {
    const api = window.electronAPI
    if (!api) {
      return false
    }

    const result = await api.transcode.reorderQueue(orderedIds)
    return result.success
  }, [])

  /** Обновить настройки элемента */
  const updateSettings = useCallback(async (id: string, settings: PerFileTranscodeSettings) => {
    const api = window.electronAPI
    if (!api) {
      return false
    }

    const result = await api.transcode.updateSettings(id, settings)
    return result.success
  }, [])

  /** Анализировать элемент (после demux) */
  const analyzeItem = useCallback(async (id: string, demuxResult: DemuxResult) => {
    const api = window.electronAPI
    if (!api) {
      return false
    }

    const result = await api.transcode.analyzeItem(id, demuxResult)
    return result.success
  }, [])

  /** Установить путь к библиотеке */
  const setLibraryPath = useCallback(async (libraryPath: string) => {
    const api = window.electronAPI
    if (!api) {
      return false
    }

    const result = await api.transcode.setLibraryPath(libraryPath)
    if (result.success) {
      setState((prev) => ({ ...prev, libraryPath }))
    }
    return result.success
  }, [])

  /** Переместить элемент вверх */
  const moveItemUp = useCallback(
    async (id: string) => {
      const index = state.queue.findIndex((item) => item.id === id)
      if (index <= 0) {
        return false
      }

      const newOrder = [...state.queue]
      ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]

      return reorderQueue(newOrder.map((item) => item.id))
    },
    [state.queue, reorderQueue]
  )

  /** Переместить элемент вниз */
  const moveItemDown = useCallback(
    async (id: string) => {
      const index = state.queue.findIndex((item) => item.id === id)
      if (index < 0 || index >= state.queue.length - 1) {
        return false
      }

      const newOrder = [...state.queue]
      ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]

      return reorderQueue(newOrder.map((item) => item.id))
    },
    [state.queue, reorderQueue]
  )

  // === Вычисляемые значения ===

  /** Элементы в ожидании */
  const pendingItems = useMemo(
    () => state.queue.filter((item) => item.status === 'pending' || item.status === 'ready'),
    [state.queue]
  )

  /** Элементы в процессе */
  const activeItems = useMemo(
    () => state.queue.filter((item) => item.status === 'transcoding' || item.status === 'analyzing'),
    [state.queue]
  )

  /** Элементы на паузе */
  const pausedItems = useMemo(() => state.queue.filter((item) => item.status === 'paused'), [state.queue])

  /** Завершённые элементы */
  const completedItems = useMemo(() => state.queue.filter((item) => item.status === 'completed'), [state.queue])

  /** Элементы с ошибками */
  const errorItems = useMemo(() => state.queue.filter((item) => item.status === 'error'), [state.queue])

  /** Текущий обрабатываемый элемент */
  const currentItem = useMemo(
    () => state.queue.find((item) => item.status === 'transcoding' || item.status === 'analyzing'),
    [state.queue]
  )

  /** Общий прогресс (0-100) */
  const overallProgress = useMemo(() => {
    const total = state.queue.length
    if (total === 0) {
      return 0
    }

    const completed = completedItems.length
    const currentProgress = currentItem?.progress?.percent ?? 0

    // Каждый завершённый = 100%, текущий = его процент
    return Math.round(((completed * 100 + currentProgress) / (total * 100)) * 100)
  }, [state.queue, completedItems.length, currentItem?.progress?.percent])

  /** Есть ли элементы для обработки */
  const hasItemsToProcess = useMemo(
    () => pendingItems.length > 0 || pausedItems.length > 0,
    [pendingItems.length, pausedItems.length]
  )

  return {
    // Состояние
    ...state,

    // Вычисляемые
    pendingItems,
    activeItems,
    pausedItems,
    completedItems,
    errorItems,
    currentItem,
    overallProgress,
    hasItemsToProcess,

    // Методы
    addToQueue,
    addFilesToQueue,
    removeFromQueue,
    startProcessing,
    pauseItem,
    resumeItem,
    cancelItem,
    pauseAll,
    resumeAll,
    reorderQueue,
    updateSettings,
    analyzeItem,
    setLibraryPath,
    moveItemUp,
    moveItemDown,
  }
}
