/**
 * API клиент для Animatrona Mobile
 *
 * Роутит запросы через адаптер активного сервера:
 * - Desktop: shared createApiClient (локальные файлы + IPFS)
 * - Tracker: маппинг Tracker API в shared типы (только IPFS)
 *
 * Обеспечивает кэш-фоллбэк для offline режима.
 */

import { isNetworkError } from '@letar/animatrona-shared'

import {
  getCachedAnimeDetails,
  getCachedLastWatched,
  getCachedLibrary,
  setCachedAnimeDetails,
  setCachedLastWatched,
  setCachedLibrary,
} from '@/services/cache'
import { useDownloadsStore } from '@/store/downloads'
import { useOfflineStore } from '@/store/offline'
import { useServersStore } from '@/store/servers'

import type { AnimeDetails, AnimeListItem, LastWatched, SubtitleTrack } from '@letar/animatrona-shared'
import { createAdapter, type LibraryOptions, type ProgressSaveData, type ServerAdapter } from './adapters'

// --- Адаптер для активного сервера ---

/** Получить текущий адаптер (пересоздаётся при смене сервера) */
let cachedAdapter: ServerAdapter | null = null
let cachedServerId: string | null = null

function getAdapter(): ServerAdapter {
  const state = useServersStore.getState()
  const server = state.servers.find((s) => s.id === state.activeServerId)

  if (!server) {
    throw new Error('Нет подключения к серверу')
  }

  // Кэшируем адаптер пока не сменится сервер
  if (cachedServerId !== server.id || !cachedAdapter) {
    cachedAdapter = createAdapter(server)
    cachedServerId = server.id
  }

  return cachedAdapter
}

/** Получить ID активного сервера (для кэша) */
function getActiveServerId(): string {
  return useServersStore.getState().activeServerId ?? 'unknown'
}

// --- Реэкспорт базовых функций ---

/** Получить статус сервера */
export async function getStatus() {
  return getAdapter().checkStatus()
}

/** Получить прогресс эпизода */
export async function getProgress(episodeId: string) {
  return getAdapter().getProgress(episodeId)
}

/** Получить URL медиафайла */
export function getMediaUrl(videoPath: string): string {
  return getAdapter().getMediaUrl(videoPath)
}

/** Получить URL видео из CID */
export function getVideoCidUrl(cid: string): string {
  return getAdapter().getIpfsUrl(cid)
}

/** Получить URL аудио из CID */
export function getAudioCidUrl(cid: string): string {
  return getAdapter().getAudioCidUrl(cid)
}

/** Получить URL IPFS контента */
export function getIpfsUrl(cid: string): string {
  return getAdapter().getIpfsUrl(cid)
}

/** Получить URL субтитров из CID */
export function getSubtitleUrlFromCid(track: SubtitleTrack): string | null {
  return getAdapter().getSubtitleUrlFromCid(track)
}

/** Получить URL субтитров в VTT формате */
export function getSubtitleVttUrl(track: SubtitleTrack): string | null {
  return getAdapter().getSubtitleVttUrl(track)
}

/** Получить эпизод по ID */
export async function getEpisode(animeId: string, episodeId: string) {
  const anime = await getAdapter().getAnimeDetails(animeId)
  return anime.episodes.find((ep) => ep.id === episodeId) ?? null
}

// Экспортируем fetchApi и getApiBase для использования в других модулях
export function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return getAdapter().fetchApi<T>(endpoint, options)
}

export function getApiBase(): string {
  return getAdapter().getApiBase()
}

// --- Функции с кэш-фоллбэком ---

/**
 * Обёртка с кэш-фоллбэком
 *
 * 1. Пытается получить данные с сервера через адаптер
 * 2. Успех → обновляет кэш, отмечает сервер доступным
 * 3. Ошибка сети → отмечает сервер недоступным, возвращает кэш
 */
async function withCacheFallback<T>(
  fetcher: () => Promise<T>,
  getCached: () => Promise<T | null>,
  setCache: (data: T) => Promise<void>
): Promise<T> {
  try {
    const data = await fetcher()
    useOfflineStore.getState().setServerReachable()
    // Асинхронно обновляем кэш
    setCache(data).catch(() => undefined)
    return data
  } catch (error) {
    const isNetwork = isNetworkError(error)
    if (isNetwork) {
      useOfflineStore.getState().setServerUnreachable()
    }
    // Пробуем кэш при ЛЮБОЙ ошибке
    const cached = await getCached()
    if (cached !== null) {
      console.warn('[api] Используем кэш')
      return cached
    }
    throw error
  }
}

/** Получить серверный URL постера */
export function getPosterUrl(animeId: string): string {
  return getAdapter().getPosterUrl(animeId)
}

/** Сохранить прогресс эпизода */
export async function saveProgress(episodeId: string, data: ProgressSaveData) {
  try {
    const result = await getAdapter().saveProgress(episodeId, data)
    useOfflineStore.getState().setServerReachable()
    return result
  } catch (error) {
    if (isNetworkError(error)) {
      useOfflineStore.getState().setServerUnreachable()
    }
    throw error
  }
}

/** Получить список аниме (с кэш-фоллбэком) */
export async function getLibrary(options?: LibraryOptions): Promise<AnimeListItem[]> {
  const sid = getActiveServerId()
  // При серверном поиске не используем кэш (результаты зависят от запроса)
  if (options?.search) {
    return getAdapter().getLibrary(options)
  }
  return withCacheFallback(
    () => getAdapter().getLibrary(options),
    () => getCachedLibrary(sid),
    (data) => setCachedLibrary(sid, data)
  )
}

/** Получить детали аниме (с кэш-фоллбэком) */
export async function getAnimeDetails(animeId: string): Promise<AnimeDetails> {
  const sid = getActiveServerId()
  return withCacheFallback(
    () => getAdapter().getAnimeDetails(animeId),
    () => getCachedAnimeDetails(sid, animeId),
    (data) => setCachedAnimeDetails(sid, animeId, data)
  )
}

/**
 * Получить URL постера с поддержкой оффлайн кэша
 */
export function getPosterUrlCached(animeId: string, posterMap: Record<string, string>): string {
  const entry = posterMap[animeId]
  if (entry) {
    const sepIndex = entry.lastIndexOf('|')
    if (sepIndex !== -1) {
      const path = entry.substring(0, sepIndex)
      const version = entry.substring(sepIndex + 1)
      return `file://${path}?v=${version}`
    }
    return `file://${entry}`
  }
  return getPosterUrl(animeId)
}

/**
 * Получить URL видео эпизода (автоматически выбирает источник)
 *
 * Приоритет: скачанный файл → адаптер (IPFS CID или локальный файл)
 */
export function getEpisodeVideoUrl(episode: {
  id?: string
  videoCid: string | null
  videoPath: string | null
}): string | null {
  // Проверяем скачанный файл первым
  if (episode.id) {
    const downloads = useDownloadsStore.getState()
    const downloaded = downloads.downloaded[episode.id]
    if (downloaded) {
      return `file://${downloaded.videoFilePath}`
    }
  }

  return getAdapter().getEpisodeVideoUrl(episode)
}

/**
 * Получить URL аудио эпизода
 *
 * Приоритет: скачанный файл → серверный IPFS
 */
export function getEpisodeAudioUrl(episodeId: string, trackId: string, audioCid: string | null): string | null {
  const downloads = useDownloadsStore.getState()
  const downloaded = downloads.downloaded[episodeId]
  if (downloaded?.audioFilePaths[trackId]) {
    return `file://${downloaded.audioFilePaths[trackId]}`
  }

  if (audioCid) {
    return getAdapter().getAudioCidUrl(audioCid)
  }
  return null
}

/** Получить путь к папке со скачанными шрифтами эпизода */
export function getDownloadedFontDir(episodeId: string): string | null {
  const downloads = useDownloadsStore.getState()
  const downloaded = downloads.downloaded[episodeId]
  if (!downloaded) return null

  const fontPaths = Object.values(downloaded.fontFilePaths)
  if (fontPaths.length === 0) return null

  const firstPath = fontPaths[0]
  return firstPath.substring(0, firstPath.lastIndexOf('/'))
}

/** Получить путь к скачанным субтитрам эпизода */
export function getDownloadedSubtitlePaths(episodeId: string): Record<string, string> {
  const downloads = useDownloadsStore.getState()
  const downloaded = downloads.downloaded[episodeId]
  if (!downloaded) return {}

  const result: Record<string, string> = {}
  for (const [trackId, path] of Object.entries(downloaded.subtitleFilePaths)) {
    result[trackId] = `file://${path}`
  }
  return result
}

/** Получить последний просмотренный эпизод (с кэш-фоллбэком) */
export async function getLastWatched(): Promise<LastWatched | null> {
  const sid = getActiveServerId()
  try {
    const data = await getAdapter().getLastWatched()
    if (data) {
      useOfflineStore.getState().setServerReachable()
      setCachedLastWatched(sid, data).catch(() => undefined)
    }
    return data
  } catch (error) {
    if (isNetworkError(error)) {
      useOfflineStore.getState().setServerUnreachable()
      return getCachedLastWatched(sid)
    }
    return null
  }
}
