'use client'

/**
 * Хук для загрузки AnimeManifest из IPFS
 *
 * v0.28.0: Расширенные метаданные (студии, персонал, видео и т.д.)
 * теперь хранятся в AnimeManifest (IPFS) вместо БД.
 *
 * Использование:
 * ```tsx
 * const { manifest, isLoading, error } = useAnimeManifest(anime.directoryCid)
 * ```
 */

import { useQuery } from '@tanstack/react-query'

import type { AnimeManifest } from '../../../../shared/types/anime-manifest'

interface UseAnimeManifestOptions {
  /** Включить загрузку (по умолчанию true) */
  enabled?: boolean
  /** Кэшировать на указанное время (ms), по умолчанию 5 минут */
  staleTime?: number
}

interface UseAnimeManifestResult {
  /** Загруженный манифест */
  manifest: AnimeManifest | null
  /** Загрузка в процессе */
  isLoading: boolean
  /** Ошибка загрузки */
  error: Error | null
  /** Перезагрузить манифест */
  refetch: () => void
}

/**
 * Загрузить AnimeManifest из IPFS по CID манифеста
 */
async function fetchManifest(manifestCid: string): Promise<AnimeManifest | null> {
  if (!window.electronAPI?.animeManifest) {
    console.warn('[useAnimeManifest] electronAPI.animeManifest недоступен')
    return null
  }

  const result = await window.electronAPI.animeManifest.get(manifestCid)

  if (!result.success) {
    throw new Error(result.error || 'Не удалось загрузить манифест')
  }

  return result.data ?? null
}

/**
 * Загрузить AnimeManifest из IPFS через directoryCid/manifest.json
 */
async function fetchManifestFromDirectory(directoryCid: string): Promise<AnimeManifest | null> {
  return fetchManifest(`${directoryCid}/manifest.json`)
}

/**
 * Хук для загрузки AnimeManifest из IPFS
 *
 * Приоритет: directoryCid (через directoryCid/manifest.json) → manifestCid (fallback)
 *
 * @param directoryCid - CID директории аниме в IPFS (primary)
 * @param manifestCid - CID манифеста в IPFS (fallback, deprecated)
 * @param options - Опции запроса
 * @returns Манифест, состояние загрузки и ошибка
 */
export function useAnimeManifest(
  directoryCid: string | null | undefined,
  options?: UseAnimeManifestOptions & {
    /** @deprecated TODO: удалить после миграции всех клиентов на directoryCid */
    fallbackManifestCid?: string | null
  }
): UseAnimeManifestResult {
  const { enabled = true, staleTime = 5 * 60 * 1000, fallbackManifestCid } = options ?? {}

  // Primary: загрузка через directoryCid/manifest.json
  // TODO: удалить fallback по manifestCid после миграции всех клиентов на directoryCid
  const effectiveCid = directoryCid || fallbackManifestCid

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['animeManifest', effectiveCid],
    queryFn: () => (directoryCid ? fetchManifestFromDirectory(directoryCid) : fetchManifest(fallbackManifestCid!)),
    enabled: enabled && !!effectiveCid,
    staleTime,
    // Не ретраить при ошибке — манифест может быть недоступен оффлайн
    retry: false,
  })

  return {
    manifest: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
  }
}
