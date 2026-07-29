/**
 * Preload — Библиотека
 *
 * Управление путями и структурой папок библиотеки.
 */

import { ipcRenderer } from 'electron'

/** Библиотека — пути и структура папок */
export const libraryPreload = {
  /** Получить путь к библиотеке по умолчанию (Videos/Animatrona) */
  getDefaultPath: (): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('library:getDefaultPath'),

  /** Получить путь к папке эпизода */
  resolveOutputPath: (options: {
    libraryPath: string
    animeName: string
    seasonNumber: number
    episodeNumber: number
  }): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('library:resolveOutputPath', options),

  /** Создать структуру папок для эпизода */
  ensureEpisodeDirectory: (options: {
    libraryPath: string
    animeName: string
    seasonNumber: number
    episodeNumber: number
  }): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('library:ensureEpisodeDirectory', options),

  /** Создать папку для аниме (для постера и других общих файлов) */
  ensureAnimeDirectory: (
    libraryPath: string,
    animeName: string
  ): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('library:ensureAnimeDirectory', libraryPath, animeName),

  /** Проверить, есть ли аниме с таким shikimoriId в библиотеке */
  checkAnimeExists: (
    shikimoriId: number
  ): Promise<{
    success: boolean
    data?: {
      exists: boolean
      animeId?: string
      animeName?: string
      episodeCount?: number
      needsReupload?: boolean
    }
    error?: string
  }> => ipcRenderer.invoke('library:checkAnimeExists', shikimoriId),

  /** Синхронизировать эпизоды из IPFS (для онгоингов) */
  syncEpisodes: (
    animeId: string
  ): Promise<{ success: boolean; data?: { added: number; total: number }; error?: string }> =>
    ipcRenderer.invoke('library:syncEpisodes', animeId),
}
