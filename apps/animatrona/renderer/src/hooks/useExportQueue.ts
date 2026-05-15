/**
 * useExportQueue — хук для управления очередью экспорта
 */

import { useCallback, useEffect, useState } from 'react'

import type {
  ExportQueueSettings,
  ExportTask,
  ExportTaskCreateData,
  QueueEpisodeExportData,
  QueueExportConfig,
} from '../../../shared/types/export-queue'

// Реэкспорт типов для использования в компонентах
export type { ExportTask, ExportTaskCreateData, QueueEpisodeExportData, QueueExportConfig }

export interface UseExportQueueReturn {
  /** Список задач */
  tasks: ExportTask[]
  /** Настройки очереди */
  settings: ExportQueueSettings | null
  /** Загрузка */
  isLoading: boolean
  /** Количество активных задач */
  activeCount: number
  /** Количество pending задач */
  pendingCount: number

  /** Добавить задачу */
  addTask: (data: ExportTaskCreateData) => Promise<ExportTask | null>
  /** Отменить задачу */
  cancelTask: (taskId: string) => Promise<boolean>
  /** Приостановить задачу */
  pauseTask: (taskId: string) => Promise<boolean>
  /** Возобновить задачу */
  resumeTask: (taskId: string) => Promise<boolean>
  /** Повторить неудавшуюся задачу */
  retryTask: (taskId: string) => Promise<boolean>
  /** Очистить завершённые задачи */
  clearCompleted: () => Promise<number>
  /** Обновить настройки */
  updateSettings: (settings: Partial<ExportQueueSettings>) => Promise<boolean>
  /** Обновить список задач */
  refresh: () => Promise<void>
}

const DEFAULT_SETTINGS: ExportQueueSettings = {
  maxConcurrent: 2,
  autoRetry: true,
  maxRetries: 3,
  showNotifications: true,
}

/**
 * Хук для управления очередью экспорта
 */
export function useExportQueue(): UseExportQueueReturn {
  const [tasks, setTasks] = useState<ExportTask[]>([])
  const [settings, setSettings] = useState<ExportQueueSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Вычисляемые значения
  const activeCount = tasks.filter((t) => t.status === 'fetching' || t.status === 'encoding').length
  const pendingCount = tasks.filter((t) => t.status === 'pending').length

  // Загрузка начального состояния
  const refresh = useCallback(async () => {
    try {
      const api = window.electronAPI?.exportQueue
      if (!api) {
        return
      }

      const [tasksResult, settingsResult] = await Promise.all([api.list(), api.getSettings()])

      if (tasksResult.success && tasksResult.data) {
        setTasks(tasksResult.data)
      }

      if (settingsResult.success && settingsResult.data) {
        setSettings(settingsResult.data)
      }
    } catch (error) {
      console.error('[useExportQueue] Refresh error:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Подписка на события
  useEffect(() => {
    const api = window.electronAPI?.exportQueue
    if (!api) {
      return
    }

    // Загрузить начальное состояние
    refresh()

    // Подписки на события
    const unsubProgress = api.onProgress((task) => {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
    })

    const unsubCompleted = api.onCompleted((task) => {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
    })

    const unsubFailed = api.onFailed((task) => {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
    })

    const unsubUpdated = api.onUpdated((newTasks) => {
      setTasks(newTasks)
    })

    return () => {
      unsubProgress()
      unsubCompleted()
      unsubFailed()
      unsubUpdated()
    }
  }, [refresh])

  // Добавить задачу
  const addTask = useCallback(async (data: ExportTaskCreateData): Promise<ExportTask | null> => {
    try {
      const api = window.electronAPI?.exportQueue
      if (!api) {
        return null
      }

      const result = await api.add(data)
      return result.success ? (result.data ?? null) : null
    } catch (error) {
      console.error('[useExportQueue] Add task error:', error)
      return null
    }
  }, [])

  // Отменить задачу
  const cancelTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const api = window.electronAPI?.exportQueue
      if (!api) {
        return false
      }

      const result = await api.cancel(taskId)
      return result.success
    } catch (error) {
      console.error('[useExportQueue] Cancel task error:', error)
      return false
    }
  }, [])

  // Приостановить задачу
  const pauseTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const api = window.electronAPI?.exportQueue
      if (!api) {
        return false
      }

      const result = await api.pause(taskId)
      return result.success
    } catch (error) {
      console.error('[useExportQueue] Pause task error:', error)
      return false
    }
  }, [])

  // Возобновить задачу
  const resumeTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const api = window.electronAPI?.exportQueue
      if (!api) {
        return false
      }

      const result = await api.resume(taskId)
      return result.success
    } catch (error) {
      console.error('[useExportQueue] Resume task error:', error)
      return false
    }
  }, [])

  // Повторить задачу
  const retryTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const api = window.electronAPI?.exportQueue
      if (!api) {
        return false
      }

      const result = await api.retry(taskId)
      return result.success
    } catch (error) {
      console.error('[useExportQueue] Retry task error:', error)
      return false
    }
  }, [])

  // Очистить завершённые
  const clearCompleted = useCallback(async (): Promise<number> => {
    try {
      const api = window.electronAPI?.exportQueue
      if (!api) {
        return 0
      }

      const result = await api.clear()
      return result.success ? (result.data ?? 0) : 0
    } catch (error) {
      console.error('[useExportQueue] Clear completed error:', error)
      return 0
    }
  }, [])

  // Обновить настройки
  const updateSettings = useCallback(async (newSettings: Partial<ExportQueueSettings>): Promise<boolean> => {
    try {
      const api = window.electronAPI?.exportQueue
      if (!api) {
        return false
      }

      const result = await api.updateSettings(newSettings)
      if (result.success) {
        setSettings((prev) => (prev ? { ...prev, ...newSettings } : { ...DEFAULT_SETTINGS, ...newSettings }))
      }
      return result.success
    } catch (error) {
      console.error('[useExportQueue] Update settings error:', error)
      return false
    }
  }, [])

  return {
    tasks,
    settings,
    isLoading,
    activeCount,
    pendingCount,
    addTask,
    cancelTask,
    pauseTask,
    resumeTask,
    retryTask,
    clearCompleted,
    updateSettings,
    refresh,
  }
}
