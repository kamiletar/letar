/**
 * Хук для работы с шаблонами импорта
 *
 * Предоставляет CRUD операции для управления шаблонами
 * кодирования, которые можно применять к новым импортам.
 */

import { useCallback, useEffect, useState } from 'react'
import type {
  ImportTemplate,
  ImportTemplateCreateData,
  ImportTemplateUpdateData,
} from '../../../shared/types/import-template'

interface UseTemplatesReturn {
  /** Список всех шаблонов */
  templates: ImportTemplate[]
  /** Загружаются ли шаблоны */
  isLoading: boolean
  /** Ошибка загрузки */
  error: string | null
  /** Создать новый шаблон */
  createTemplate: (data: ImportTemplateCreateData) => Promise<ImportTemplate | null>
  /** Обновить шаблон */
  updateTemplate: (id: string, data: ImportTemplateUpdateData) => Promise<ImportTemplate | null>
  /** Удалить шаблон */
  deleteTemplate: (id: string) => Promise<boolean>
  /** Отметить шаблон как использованный */
  markAsUsed: (id: string) => Promise<boolean>
  /** Перезагрузить список шаблонов */
  refetch: () => Promise<void>
  /** Получить шаблон по ID */
  getById: (id: string) => ImportTemplate | undefined
}

/**
 * Хук для работы с шаблонами импорта
 */
export function useTemplates(): UseTemplatesReturn {
  const [templates, setTemplates] = useState<ImportTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Загрузить все шаблоны
   */
  const loadTemplates = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await window.electronAPI?.templates.getAll()
      if (result?.success && result.data) {
        // Сортируем по дате последнего использования (недавние первыми)
        const sorted = [...result.data].sort((a, b) => {
          if (a.lastUsedAt && b.lastUsedAt) {
            return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
          }
          if (a.lastUsedAt) {
            return -1
          }
          if (b.lastUsedAt) {
            return 1
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
        setTemplates(sorted)
      } else if (result?.error) {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить шаблоны')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Загружаем шаблоны при монтировании
  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  /**
   * Создать новый шаблон
   */
  const createTemplate = useCallback(async (data: ImportTemplateCreateData): Promise<ImportTemplate | null> => {
    try {
      const result = await window.electronAPI?.templates.create(data)
      if (result?.success && result.data) {
        const newTemplate = result.data
        // Добавляем в начало списка
        setTemplates((prev) => [newTemplate, ...prev])
        return newTemplate
      }
      if (result?.error) {
        setError(result.error)
      }
      return null
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать шаблон')
      return null
    }
  }, [])

  /**
   * Обновить шаблон
   */
  const updateTemplate = useCallback(
    async (id: string, data: ImportTemplateUpdateData): Promise<ImportTemplate | null> => {
      try {
        const result = await window.electronAPI?.templates.update(id, data)
        if (result?.success && result.data) {
          const updatedTemplate = result.data
          setTemplates((prev) => prev.map((t) => (t.id === id ? updatedTemplate : t)))
          return updatedTemplate
        }
        if (result?.error) {
          setError(result.error)
        }
        return null
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось обновить шаблон')
        return null
      }
    },
    []
  )

  /**
   * Удалить шаблон
   */
  const deleteTemplate = useCallback(async (id: string): Promise<boolean> => {
    try {
      const result = await window.electronAPI?.templates.delete(id)
      if (result?.success) {
        setTemplates((prev) => prev.filter((t) => t.id !== id))
        return true
      }
      if (result?.error) {
        setError(result.error)
      }
      return false
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить шаблон')
      return false
    }
  }, [])

  /**
   * Отметить шаблон как использованный
   */
  const markAsUsed = useCallback(async (id: string): Promise<boolean> => {
    try {
      const result = await window.electronAPI?.templates.markAsUsed(id)
      if (result?.success) {
        // Обновляем lastUsedAt локально
        const now = new Date().toISOString()
        setTemplates((prev) => {
          const updated = prev.map((t) => (t.id === id ? { ...t, lastUsedAt: now } : t))
          // Перемещаем использованный шаблон в начало
          return updated.sort((a, b) => {
            if (a.id === id) {
              return -1
            }
            if (b.id === id) {
              return 1
            }
            return 0
          })
        })
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  /**
   * Получить шаблон по ID
   */
  const getById = useCallback(
    (id: string): ImportTemplate | undefined => {
      return templates.find((t) => t.id === id)
    },
    [templates]
  )

  return {
    templates,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    markAsUsed,
    refetch: loadTemplates,
    getById,
  }
}
