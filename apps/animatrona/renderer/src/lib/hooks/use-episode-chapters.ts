'use client'

/**
 * Хук для загрузки глав эпизода из IPFS манифеста
 */

import { useQuery } from '@tanstack/react-query'

import type { ManifestChapter } from '@/types/electron'

/**
 * Загружает главы из IPFS манифеста через IPC
 * Поддерживает как новый формат (chaptersCid), так и старый (инлайн chapters)
 */
export function useEpisodeChapters(manifestCid: string | null | undefined) {
  return useQuery<ManifestChapter[]>({
    queryKey: ['episodeChapters', manifestCid],
    queryFn: async () => {
      const result = await window.electronAPI!.manifest.getChapters(manifestCid!)
      if (!result.success) {
        throw new Error(result.error ?? 'Не удалось загрузить главы')
      }
      return result.data ?? []
    },
    enabled: !!manifestCid,
    staleTime: 5 * 60 * 1000, // 5 минут
  })
}
