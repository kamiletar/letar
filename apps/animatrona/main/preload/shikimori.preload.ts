/**
 * Preload — Shikimori API и франшизы
 *
 * Поиск аниме, детали, постеры, связанные аниме.
 */

import { ipcRenderer } from 'electron'
import type { RelatedAnimeData } from '../ipc/franchise.handlers'
import type {
  ShikimoriAnimeDetails,
  ShikimoriAnimeExtended,
  ShikimoriAnimePreview,
  ShikimoriAnimeWithRelated,
  ShikimoriFranchiseGraph,
} from '../services/shikimori'

/** Shikimori API */
export const shikimoriPreload = {
  /** Поиск аниме по названию */
  search: (options: {
    search: string
    limit?: number
    kind?: string
  }): Promise<{
    success: boolean
    data?: ShikimoriAnimePreview[]
    error?: string
  }> => ipcRenderer.invoke('shikimori:search', options),

  /** Получить детали аниме по Shikimori ID */
  getDetails: (
    shikimoriId: number,
  ): Promise<{
    success: boolean
    data?: ShikimoriAnimeDetails
    error?: string
  }> => ipcRenderer.invoke('shikimori:getDetails', shikimoriId),

  /** Скачать постер и сохранить локально */
  downloadPoster: async (
    posterUrl: string,
    animeId: string,
    options?: { fileName?: string; savePath?: string },
  ): Promise<{
    success: boolean
    localPath?: string
    /** Имя файла */
    filename?: string
    /** MIME-тип */
    mimeType?: string
    /** Размер файла в байтах */
    size?: number
    /** Ширина изображения */
    width?: number
    /** Высота изображения */
    height?: number
    /** Base64 blur placeholder для next/image */
    blurDataURL?: string
    error?: string
  }> => {
    const result = await ipcRenderer.invoke('shikimori:downloadPoster', posterUrl, animeId, options)
    // Разворачиваем data из createHandler
    // PosterDownloadResult уже содержит success, поэтому берём из data
    if (result.success && result.data) {
      return result.data
    }
    return { success: false, error: result.error }
  },

  /** Получить аниме со связанными */
  getWithRelated: (
    shikimoriId: number,
  ): Promise<{
    success: boolean
    data?: ShikimoriAnimeWithRelated
    error?: string
  }> => ipcRenderer.invoke('shikimori:getWithRelated', shikimoriId),

  /** Получить расширенные метаданные (v0.5.1) */
  getExtended: (
    shikimoriId: number,
  ): Promise<{
    success: boolean
    data?: ShikimoriAnimeExtended
    error?: string
  }> => ipcRenderer.invoke('shikimori:getExtended', shikimoriId),
}

/** Франшизы */
export const franchisePreload = {
  /** Получить связанные аниме из Shikimori (GraphQL) */
  fetchRelated: (
    shikimoriId: number,
  ): Promise<{
    success: boolean
    data?: {
      sourceAnime: { shikimoriId: number; name: string }
      relatedAnimes: RelatedAnimeData[]
    }
    error?: string
  }> => ipcRenderer.invoke('franchise:fetchRelated', shikimoriId),

  /** Получить граф франшизы из REST API Shikimori */
  fetchGraph: (
    shikimoriId: number,
  ): Promise<{
    success: boolean
    data?: {
      graph: ShikimoriFranchiseGraph
      rootShikimoriId: number
      franchiseName: string
    } | null
    message?: string
    error?: string
  }> => ipcRenderer.invoke('franchise:fetchGraph', shikimoriId),

  /** Очистить кэш графов франшиз */
  clearCache: (): Promise<{
    success: boolean
    error?: string
  }> => ipcRenderer.invoke('franchise:clearCache'),
}
