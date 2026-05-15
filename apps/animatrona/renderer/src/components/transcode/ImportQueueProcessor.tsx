'use client'
/* eslint-disable no-console */

/**
 * ImportQueueProcessor — слушатель событий импорта от main process
 *
 * Вся обработка (демукс, транскодирование, постпроцессинг) выполняется
 * в main process через ImportQueueController → ImportService.
 *
 * Этот компонент только:
 * 1. Инвалидирует TanStack Query кэш при завершении импорта
 * 2. Логирует жизненный цикл
 */

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

export function ImportQueueProcessor() {
  const queryClient = useQueryClient()

  // === Кэш инвалидация от main process (ImportService) ===
  useEffect(() => {
    const api = window.electronAPI
    if (!api) {
      return
    }
    const importQueue = api.importQueue as typeof api.importQueue & {
      onCacheInvalidate?: (callback: (queryKeys: string[]) => void) => () => void
    }
    if (!importQueue?.onCacheInvalidate) {
      return
    }

    const unsub = importQueue.onCacheInvalidate((queryKeys: string[]) => {
      console.warn('[ImportQueueProcessor] Cache invalidate from main:', queryKeys)
      for (const key of queryKeys) {
        queryClient.invalidateQueries({ queryKey: [key] })
      }
    })

    return unsub
  }, [queryClient])

  // === Логирование жизненного цикла ===
  useEffect(() => {
    console.log('[ImportQueueProcessor] 🟢 MOUNTED (main-process driven)')
    return () => {
      console.log('[ImportQueueProcessor] 🔴 UNMOUNTED')
    }
  }, [])

  // Компонент не рендерит UI
  return null
}
