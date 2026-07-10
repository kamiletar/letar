'use client'

/**
 * useImportQueue — React hook для Event-driven очереди импорта
 *
 * Подписывается на события от main process и предоставляет:
 * - Текущее состояние очереди
 * - Методы управления (добавление, старт, пауза, отмена)
 * - Автоматическое восстановление состояния при F5/навигации
 *
 * Main process — единственный источник правды.
 * Этот hook только отображает состояние и отправляет команды.
 *
 * Оптимизации памяти:
 * - Batch updates для onItemProgress (снижает re-renders)
 * - useMemo для вычисляемых значений
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type {
  ImportQueueAddData,
  ImportQueueDetailProgress,
  ImportQueueEntry,
  ImportQueueState,
  ImportQueueStatus,
  ImportQueueVmafProgress,
  ImportQueueVmafResult,
} from '../../../shared/types/import-queue'

/** Состояние hook'а */
interface UseImportQueueState {
  /** Список items в очереди */
  items: ImportQueueEntry[]
  /** ID текущего обрабатываемого item */
  currentId: string | null
  /** Очередь на паузе */
  isPaused: boolean
  /** Автозапуск при добавлении */
  autoStart: boolean
  /** Загрузка начального состояния */
  isLoading: boolean
  /** Ошибка загрузки */
  error: string | null
}

/** Результат hook'а */
interface UseImportQueueResult extends UseImportQueueState {
  // === Команды ===

  /** Добавить items в очередь */
  addItems: (items: ImportQueueAddData[]) => Promise<void>
  /** Начать обработку очереди */
  start: () => Promise<void>
  /** Приостановить очередь */
  pause: () => Promise<void>
  /** Возобновить очередь */
  resume: () => Promise<void>
  /** Отменить item */
  cancelItem: (itemId: string) => Promise<void>
  /** Удалить item из очереди */
  removeItem: (itemId: string) => Promise<void>
  /** Повторить обработку item с ошибкой */
  retryItem: (itemId: string, options?: { skipCompressionCheck?: boolean }) => Promise<void>
  /** Пометить completed item как failed */
  markItemFailed: (itemId: string) => Promise<void>
  /** Переделать недостающие эпизоды (опционально с pre-encode) */
  retryMissing: (
    itemId: string,
    preEncodeOptions?: { enabled: boolean; crf?: number; preset?: string }
  ) => Promise<void>
  /** Отменить всю очередь */
  cancelAll: () => Promise<void>
  /** Очистить завершённые items (опционально только успешные — error/cancelled не трогаем) */
  clearCompleted: (options?: { onlySuccess?: boolean }) => Promise<void>
  /** Установить автозапуск */
  setAutoStart: (enabled: boolean) => Promise<void>
  /** Изменить порядок элементов (drag & drop) */
  reorderItems: (activeId: string, overId: string) => Promise<void>
  /** Обновить данные item (профиль, параллельность, sync offset и т.д.) */
  updateItem: (itemId: string, data: Partial<ImportQueueAddData>) => Promise<void>

  // === Обновления статуса и прогресса ===

  /** Обновить статус item */
  updateStatus: (itemId: string, status: ImportQueueStatus, error?: string) => Promise<void>
  /** Обновить прогресс item */
  updateProgress: (
    itemId: string,
    progress: number,
    currentFileName?: string,
    currentStage?: string,
    detailProgress?: ImportQueueDetailProgress
  ) => Promise<void>
  /** Обновить VMAF прогресс */
  updateVmafProgress: (itemId: string, vmafProgress: ImportQueueVmafProgress) => Promise<void>
  /** Установить результат VMAF */
  setVmafResult: (itemId: string, result: ImportQueueVmafResult) => Promise<void>
  /** Установить результат импорта (animeId) */
  setImportResult: (itemId: string, animeId: string) => Promise<void>

  // === Вычисляемые значения ===

  /** Текущий обрабатываемый item */
  currentItem: ImportQueueEntry | null
  /** Количество pending items */
  pendingCount: number
  /** Количество завершённых items */
  completedCount: number
  /** Есть ли items в очереди */
  hasItems: boolean
  /** Идёт ли обработка */
  isProcessing: boolean
}

/**
 * Hook для управления очередью импорта
 *
 * @example
 * ```tsx
 * function ImportQueueView() {
 *   const { items, currentItem, isLoading, start, pause } = useImportQueue()
 *
 *   if (isLoading) return <Spinner />
 *
 *   return (
 *     <VStack>
 *       {items.map(item => (
 *         <ImportQueueItem key={item.id} item={item} isCurrent={item.id === currentItem?.id} />
 *       ))}
 *       <Button onClick={start}>Начать</Button>
 *     </VStack>
 *   )
 * }
 * ```
 */
export function useImportQueue(): UseImportQueueResult {
  const [state, setState] = useState<UseImportQueueState>({
    items: [],
    currentId: null,
    isPaused: false,
    autoStart: true,
    isLoading: true,
    error: null,
  })

  // === Batch updates для предотвращения утечки памяти ===
  // Вместо setState на каждое IPC событие, накапливаем обновления и flush'им периодически

  /** Тип данных для обновления прогресса */
  type ProgressUpdateData = {
    progress: number
    currentFileName?: string
    currentStage?: string
    detailProgress?: ImportQueueDetailProgress
    vmafProgress?: ImportQueueVmafProgress
  }

  /** Накопленные обновления прогресса (Map<itemId, data>) */
  const pendingProgressUpdates = useRef<Map<string, ProgressUpdateData>>(new Map())

  /** Ref для setTimeout, чтобы очищать при unmount */
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Интервал flush'а в мс — 10 раз/сек для плавного обновления прогресса */
  const FLUSH_INTERVAL = 100

  // === Загрузка начального состояния при mount ===
  useEffect(() => {
    const api = window.electronAPI
    if (!api?.importQueue) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'electronAPI.importQueue не доступен',
      }))
      return
    }

    // Получаем начальное состояние из main process
    api.importQueue.getState().then((result) => {
      if (result.success && result.data) {
        setState({
          items: result.data.items,
          currentId: result.data.currentId,
          isPaused: result.data.isPaused,
          autoStart: result.data.autoStart,
          isLoading: false,
          error: null,
        })
        console.warn('[useImportQueue] Initial state loaded:', result.data.items.length, 'items')
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Не удалось загрузить состояние очереди',
        }))
      }
    })
  }, [])

  // === Подписка на события от main process ===
  useEffect(() => {
    const api = window.electronAPI
    if (!api?.importQueue) {
      return
    }

    // Полное обновление состояния
    const unsubStateChanged = api.importQueue.onStateChanged((newState: ImportQueueState) => {
      setState((prev) => ({
        ...prev,
        items: newState.items,
        currentId: newState.currentId,
        isPaused: newState.isPaused,
        autoStart: newState.autoStart,
      }))
    })

    // Обновление статуса одного item
    const unsubItemStatus = api.importQueue.onItemStatus(
      ({ itemId, status, error }: { itemId: string; status: ImportQueueStatus; error?: string }) => {
        setState((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === itemId ? { ...item, status, error: error || item.error } : item
          ),
        }))
      }
    )

    // === Batch updates для onItemProgress ===
    // Накапливаем обновления и flush'им раз в FLUSH_INTERVAL мс

    const flushProgressUpdates = () => {
      if (pendingProgressUpdates.current.size === 0) {
        return
      }

      // Копируем и очищаем pending updates
      const updates = new Map(pendingProgressUpdates.current)
      pendingProgressUpdates.current.clear()

      setState((prev) => ({
        ...prev,
        items: prev.items.map((item) => {
          const update = updates.get(item.id)
          if (!update) {
            return item
          }
          return {
            ...item,
            progress: update.progress,
            currentFileName: update.currentFileName ?? item.currentFileName,
            currentStage: update.currentStage ?? item.currentStage,
            detailProgress: update.detailProgress ?? item.detailProgress,
            vmafProgress: update.vmafProgress ?? item.vmafProgress,
          }
        }),
      }))
    }

    const scheduleFlush = () => {
      if (flushTimeoutRef.current !== null) {
        return
      } // Уже запланирован

      flushTimeoutRef.current = setTimeout(() => {
        flushTimeoutRef.current = null
        flushProgressUpdates()
      }, FLUSH_INTERVAL)
    }

    // Обновление прогресса одного item — через batch
    const unsubItemProgress = api.importQueue.onItemProgress(
      (data: {
        itemId: string
        progress: number
        currentFileName?: string
        currentStage?: string
        detailProgress?: ImportQueueDetailProgress
        vmafProgress?: ImportQueueVmafProgress
      }) => {
        // Накапливаем обновление (последнее перезаписывает предыдущее для того же itemId)
        pendingProgressUpdates.current.set(data.itemId, {
          progress: data.progress,
          currentFileName: data.currentFileName,
          currentStage: data.currentStage,
          detailProgress: data.detailProgress,
          vmafProgress: data.vmafProgress,
        })

        // Планируем flush если ещё не запланирован
        scheduleFlush()
      }
    )

    // Cleanup при unmount
    return () => {
      unsubStateChanged()
      unsubItemStatus()
      unsubItemProgress()

      // Очищаем timeout при unmount
      if (flushTimeoutRef.current !== null) {
        clearTimeout(flushTimeoutRef.current)
        flushTimeoutRef.current = null
      }

      // Flush оставшиеся обновления перед unmount
      flushProgressUpdates()
    }
  }, [])

  // === Команды ===

  const addItems = useCallback(async (items: ImportQueueAddData[]) => {
    const api = window.electronAPI
    if (!api?.importQueue) {
      return
    }

    const result = await api.importQueue.addItems(items)
    if (!result.success) {
      console.error('[useImportQueue] addItems error:', result.error)
    }
  }, [])

  const start = useCallback(async () => {
    const api = window.electronAPI
    if (!api?.importQueue) {
      return
    }

    const result = await api.importQueue.start()
    if (!result.success) {
      console.error('[useImportQueue] start error:', result.error)
    }
  }, [])

  const pause = useCallback(async () => {
    const api = window.electronAPI
    if (!api?.importQueue) {
      return
    }

    const result = await api.importQueue.pause()
    if (!result.success) {
      console.error('[useImportQueue] pause error:', result.error)
    }
  }, [])

  const resume = useCallback(async () => {
    const api = window.electronAPI
    if (!api?.importQueue) {
      return
    }

    const result = await api.importQueue.resume()
    if (!result.success) {
      console.error('[useImportQueue] resume error:', result.error)
    }
  }, [])

  const cancelItem = useCallback(async (itemId: string) => {
    const api = window.electronAPI
    if (!api?.importQueue) {
      return
    }

    const result = await api.importQueue.cancelItem(itemId)
    if (!result.success) {
      console.error('[useImportQueue] cancelItem error:', result.error)
    }
  }, [])

  const removeItem = useCallback(async (itemId: string) => {
    const api = window.electronAPI
    if (!api?.importQueue) {
      return
    }

    const result = await api.importQueue.removeItem(itemId)
    if (!result.success) {
      console.error('[useImportQueue] removeItem error:', result.error)
    }
  }, [])

  const retryItem = useCallback(async (itemId: string, options?: { skipCompressionCheck?: boolean }) => {
    const api = window.electronAPI
    if (!api?.importQueue) {
      return
    }

    const result = await api.importQueue.retryItem(itemId, options)
    if (!result.success) {
      console.error('[useImportQueue] retryItem error:', result.error)
    }
  }, [])

  const markItemFailed = useCallback(async (itemId: string) => {
    const api = window.electronAPI
    if (!api?.importQueue) {
      return
    }

    const result = await api.importQueue.markItemFailed(itemId)
    if (!result.success) {
      console.error('[useImportQueue] markItemFailed error:', result.error)
    }
  }, [])

  const retryMissing = useCallback(
    async (itemId: string, preEncodeOptions?: { enabled: boolean; crf?: number; preset?: string }) => {
      const api = window.electronAPI
      if (!api?.importQueue) {
        return
      }

      const result = await api.importQueue.retryMissing(itemId, preEncodeOptions)
      if (!result.success) {
        console.error('[useImportQueue] retryMissing error:', result.error)
        alert(`Ошибка: ${result.error ?? 'Неизвестная ошибка'}`)
      }
    },
    []
  )

  const cancelAll = useCallback(async () => {
    const api = window.electronAPI
    if (!api?.importQueue) {
      return
    }

    const result = await api.importQueue.cancelAll()
    if (!result.success) {
      console.error('[useImportQueue] cancelAll error:', result.error)
    }
  }, [])

  const clearCompleted = useCallback(async (options?: { onlySuccess?: boolean }) => {
    const api = window.electronAPI
    if (!api?.importQueue) {
      return
    }

    const result = await api.importQueue.clearCompleted(options)
    if (!result.success) {
      console.error('[useImportQueue] clearCompleted error:', result.error)
    }
  }, [])

  const setAutoStart = useCallback(async (enabled: boolean) => {
    const api = window.electronAPI
    if (!api?.importQueue) {
      return
    }

    const result = await api.importQueue.setAutoStart(enabled)
    if (!result.success) {
      console.error('[useImportQueue] setAutoStart error:', result.error)
    }
  }, [])

  const reorderItems = useCallback(async (activeId: string, overId: string) => {
    const api = window.electronAPI
    if (!api?.importQueue) {
      return
    }

    const result = await api.importQueue.reorderItems(activeId, overId)
    if (!result.success) {
      console.error('[useImportQueue] reorderItems error:', result.error)
    }
  }, [])

  const updateItem = useCallback(async (itemId: string, data: Partial<ImportQueueAddData>) => {
    const api = window.electronAPI
    if (!api?.importQueue) {
      return
    }

    const result = await api.importQueue.updateItem(itemId, data)
    if (!result.success) {
      console.error('[useImportQueue] updateItem error:', result.error)
    }
  }, [])

  // === Обновления (для ImportProcessor) ===

  const updateStatus = useCallback(async (itemId: string, status: ImportQueueStatus, error?: string) => {
    const api = window.electronAPI
    if (!api?.importQueue) {
      return
    }

    const result = await api.importQueue.updateStatus(itemId, status, error)
    if (!result.success) {
      console.error('[useImportQueue] updateStatus error:', result.error)
    }
  }, [])

  const updateProgress = useCallback(
    async (
      itemId: string,
      progress: number,
      currentFileName?: string,
      currentStage?: string,
      detailProgress?: ImportQueueDetailProgress
    ) => {
      const api = window.electronAPI
      if (!api?.importQueue) {
        return
      }

      const result = await api.importQueue.updateProgress(
        itemId,
        progress,
        currentFileName,
        currentStage,
        detailProgress
      )
      if (!result.success) {
        console.error('[useImportQueue] updateProgress error:', result.error)
      }
    },
    []
  )

  const updateVmafProgress = useCallback(async (itemId: string, vmafProgress: ImportQueueVmafProgress) => {
    const api = window.electronAPI
    if (!api?.importQueue) {
      return
    }

    const result = await api.importQueue.updateVmafProgress(itemId, vmafProgress)
    if (!result.success) {
      console.error('[useImportQueue] updateVmafProgress error:', result.error)
    }
  }, [])

  const setVmafResult = useCallback(async (itemId: string, result: ImportQueueVmafResult) => {
    const api = window.electronAPI
    if (!api?.importQueue) {
      return
    }

    const res = await api.importQueue.setVmafResult(itemId, result)
    if (!res.success) {
      console.error('[useImportQueue] setVmafResult error:', res.error)
    }
  }, [])

  const setImportResult = useCallback(async (itemId: string, animeId: string) => {
    const api = window.electronAPI
    if (!api?.importQueue) {
      return
    }

    const result = await api.importQueue.setImportResult(itemId, animeId)
    if (!result.success) {
      console.error('[useImportQueue] setImportResult error:', result.error)
    }
  }, [])

  // === Вычисляемые значения (мемоизированы для предотвращения лишних перерисовок) ===

  const currentItem = useMemo(
    () => state.items.find((item) => item.id === state.currentId) || null,
    [state.items, state.currentId]
  )

  const pendingCount = useMemo(() => state.items.filter((item) => item.status === 'pending').length, [state.items])

  const completedCount = useMemo(
    () =>
      state.items.filter(
        (item) => item.status === 'completed' || item.status === 'error' || item.status === 'cancelled'
      ).length,
    [state.items]
  )

  const hasItems = useMemo(() => state.items.length > 0, [state.items])

  const isProcessing = useMemo(() => state.currentId !== null && !state.isPaused, [state.currentId, state.isPaused])

  return {
    // State
    ...state,

    // Команды
    addItems,
    start,
    pause,
    resume,
    cancelItem,
    removeItem,
    retryItem,
    markItemFailed,
    retryMissing,
    cancelAll,
    clearCompleted,
    setAutoStart,
    reorderItems,
    updateItem,

    // Обновления
    updateStatus,
    updateProgress,
    updateVmafProgress,
    setVmafResult,
    setImportResult,

    // Вычисляемые
    currentItem,
    pendingCount,
    completedCount,
    hasItems,
    isProcessing,
  }
}
