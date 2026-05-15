'use client'

/**
 * Синхронизация прогресса просмотра с мобильного устройства
 *
 * Подписывается на IPC событие 'mobile:progress-saved' от main process
 * и инвалидирует TanStack Query кэш, чтобы десктопный UI обновился
 * без перезагрузки страницы (F5).
 */

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

export function MobileProgressSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsub = window.electronAPI?.mobileServer?.onProgressSaved?.((data) => {
      // Инвалидируем кэш прогресса конкретного эпизода
      void queryClient.invalidateQueries({ queryKey: ['watchProgress', data.animeId, data.episodeId] })
      // Инвалидируем список аниме (useFindManyAnime → queryKey: ['animes', ...])
      void queryClient.invalidateQueries({ queryKey: ['animes'] })
      // Инвалидируем детали конкретного аниме (useFindUniqueAnime → queryKey: ['anime', id, ...])
      void queryClient.invalidateQueries({ queryKey: ['anime', data.animeId] })
      // Инвалидируем фасетные счётчики (watchStatus counts в фильтрах)
      void queryClient.invalidateQueries({ queryKey: ['filterCounts'] })
    })

    return () => {
      unsub?.()
    }
  }, [queryClient])

  return null
}
