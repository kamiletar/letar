'use client'

/**
 * Инвалидация кеша при фоновой синхронизации с трекером
 *
 * Подписывается на IPC событие 'tracker:syncCompleted' от main process
 * и инвалидирует TanStack Query кэш, чтобы UI отражал изменения
 * (watchStatus, userRating, watchProgress), полученные с трекера.
 */

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

export function TrackerSyncListener() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsub = window.electronAPI?.tracker?.onSyncCompleted?.((data) => {
      // Если сервер вернул изменённые элементы — инвалидируем кэш
      if (data.serverItems > 0) {
        void queryClient.invalidateQueries({ queryKey: ['animes'] })
        void queryClient.invalidateQueries({ queryKey: ['anime'] })
        void queryClient.invalidateQueries({ queryKey: ['watchProgress'] })
        void queryClient.invalidateQueries({ queryKey: ['filterCounts'] })
      }
    })

    return () => {
      unsub?.()
    }
  }, [queryClient])

  return null
}
