'use client'

/**
 * Хуки для работы с Shikimori API
 */

import { useCallback, useState } from 'react'

import type { ShikimoriAnimeDetails, ShikimoriAnimePreview, ShikimoriSearchOptions } from '@/types/electron'

/** Состояние поиска */
export interface UseSearchAnimeState {
  isLoading: boolean
  data: ShikimoriAnimePreview[] | null
  error: string | null
}

/** Хук для поиска аниме */
export function useSearchAnime() {
  const [state, setState] = useState<UseSearchAnimeState>({
    isLoading: false,
    data: null,
    error: null,
  })

  const search = useCallback(async (options: ShikimoriSearchOptions) => {
    if (!window.electronAPI) {
      setState({ isLoading: false, data: null, error: 'Electron API недоступен' })
      return
    }

    setState({ isLoading: true, data: null, error: null })

    try {
      const result = await window.electronAPI.shikimori.search(options)
      if (result.success) {
        setState({ isLoading: false, data: result.data ?? [], error: null })
      } else {
        setState({ isLoading: false, data: null, error: result.error ?? 'Ошибка поиска' })
      }
    } catch (error) {
      setState({
        isLoading: false,
        data: null,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      })
    }
  }, [])

  const reset = useCallback(() => {
    setState({ isLoading: false, data: null, error: null })
  }, [])

  return {
    ...state,
    search,
    reset,
  }
}

/** Состояние получения деталей */
export interface UseAnimeDetailsState {
  isLoading: boolean
  data: ShikimoriAnimeDetails | null
  error: string | null
}

/** Хук для получения деталей аниме */
export function useAnimeDetails() {
  const [state, setState] = useState<UseAnimeDetailsState>({
    isLoading: false,
    data: null,
    error: null,
  })

  const fetchDetails = useCallback(async (shikimoriId: number) => {
    if (!window.electronAPI) {
      setState({ isLoading: false, data: null, error: 'Electron API недоступен' })
      return null
    }

    setState({ isLoading: true, data: null, error: null })

    try {
      const result = await window.electronAPI.shikimori.getDetails(shikimoriId)
      if (result.success && result.data) {
        setState({ isLoading: false, data: result.data, error: null })
        return result.data
      } else {
        setState({ isLoading: false, data: null, error: result.error ?? 'Аниме не найдено' })
        return null
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Неизвестная ошибка'
      setState({ isLoading: false, data: null, error: errorMsg })
      return null
    }
  }, [])

  const reset = useCallback(() => {
    setState({ isLoading: false, data: null, error: null })
  }, [])

  return {
    ...state,
    fetchDetails,
    reset,
  }
}

/** Хук для скачивания постера */
export function useDownloadPoster() {
  const [isLoading, setIsLoading] = useState(false)

  const download = useCallback(async (posterUrl: string, animeId: string): Promise<string | null> => {
    if (!window.electronAPI) {
      return null
    }

    setIsLoading(true)
    try {
      const result = await window.electronAPI.shikimori.downloadPoster(posterUrl, animeId)
      if (result.success && result.localPath) {
        return result.localPath
      }
      return null
    } catch {
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { download, isLoading }
}
