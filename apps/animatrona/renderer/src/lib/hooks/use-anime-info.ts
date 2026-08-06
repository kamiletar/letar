'use client'

/**
 * Хук для загрузки AnimeInfo из IPFS
 *
 * AnimeInfo содержит метаданные аниме (студии, персонал, жанры и т.д.).
 * Загружается по CID из AnimeManifest.animeInfoCid.
 *
 * Использование:
 * ```tsx
 * const { animeInfo, isLoading, error } = useAnimeInfo(manifest.animeInfoCid)
 * ```
 */

import { useQuery } from '@tanstack/react-query'

import type { AnimeInfo } from '../../../../shared/types/anime-info'

interface UseAnimeInfoOptions {
  /** Включить загрузку (по умолчанию true) */
  enabled?: boolean
  /** Кэшировать на указанное время (ms), по умолчанию 10 минут */
  staleTime?: number
}

interface UseAnimeInfoResult {
  /** Загруженный AnimeInfo */
  animeInfo: AnimeInfo | null
  /** Загрузка в процессе */
  isLoading: boolean
  /** Ошибка загрузки */
  error: Error | null
  /** Перезагрузить */
  refetch: () => void
}

/**
 * Загрузить AnimeInfo из IPFS по CID
 */
async function fetchAnimeInfo(animeInfoCid: string): Promise<AnimeInfo | null> {
  if (!window.electronAPI?.animeInfo) {
    console.warn('[useAnimeInfo] electronAPI.animeInfo недоступен')
    return null
  }

  const result = await window.electronAPI.animeInfo.get(animeInfoCid)

  if (!result.success) {
    throw new Error(result.error || 'Не удалось загрузить AnimeInfo')
  }

  return result.data ?? null
}

/**
 * Хук для загрузки AnimeInfo из IPFS
 *
 * @param animeInfoCid - CID AnimeInfo в IPFS (или null/undefined если нет)
 * @param options - Опции запроса
 * @returns AnimeInfo, состояние загрузки и ошибка
 */
export function useAnimeInfo(
  animeInfoCid: string | null | undefined,
  options: UseAnimeInfoOptions = {},
): UseAnimeInfoResult {
  const { enabled = true, staleTime = 10 * 60 * 1000 } = options

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['animeInfo', animeInfoCid],
    queryFn: () => fetchAnimeInfo(animeInfoCid!),
    enabled: enabled && !!animeInfoCid,
    staleTime,
    retry: false,
  })

  return {
    animeInfo: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
  }
}
