/**
 * Фабрика API клиента для Animatrona Server
 *
 * Базовые API функции + URL хелперы.
 * Mobile расширяет cache/offline логикой, TV использует напрямую.
 */

import type { ConnectionData } from '../store/connection'
import type {
  AnimeDetails,
  AnimeListItem,
  Episode,
  LastWatched,
  ServerStatus,
  SubtitleTrack,
  WatchProgress,
} from './types'

/** Тип функции для получения текущего состояния подключения */
export type GetConnectionStore = () => { connection: ConnectionData | null }

/**
 * Создать API клиент с инъекцией connection store
 *
 * @param getStore — функция для получения текущего состояния подключения
 */
export function createApiClient(getStore: GetConnectionStore) {
  /** Получить базовый URL API */
  function getApiBase(): string {
    const { connection } = getStore()
    if (!connection) {
      throw new Error('Нет подключения к серверу')
    }
    return `${connection.serverUrl}/api`
  }

  /** Получить базовый URL сервера */
  function getServerUrl(): string {
    const { connection } = getStore()
    if (!connection) {
      return ''
    }
    return connection.serverUrl
  }

  /** Обёртка для fetch с обработкой ошибок */
  async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const apiBase = getApiBase()
    const url = `${apiBase}${endpoint}`

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...options?.headers,
        },
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      return response.json()
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Network request failed')) {
          throw new Error('Нет соединения с сервером')
        }
        throw error
      }
      throw new Error('Неизвестная ошибка')
    }
  }

  /** Получить статус сервера */
  async function getStatus(): Promise<ServerStatus> {
    return fetchApi<ServerStatus>('/status')
  }

  /** Получить список аниме */
  async function getLibrary(): Promise<AnimeListItem[]> {
    return fetchApi<AnimeListItem[]>('/library')
  }

  /** Получить детали аниме */
  async function getAnimeDetails(animeId: string): Promise<AnimeDetails> {
    return fetchApi<AnimeDetails>(`/library/${animeId}`)
  }

  /** Получить URL постера */
  function getPosterUrl(animeId: string): string {
    const serverUrl = getServerUrl()
    if (!serverUrl) {
      return ''
    }
    return `${serverUrl}/api/poster/${animeId}`
  }

  /** Получить URL видео для стриминга (локальный файл) */
  function getMediaUrl(videoPath: string): string {
    const serverUrl = getServerUrl()
    if (!serverUrl) {
      return ''
    }
    return `${serverUrl}/api/media?path=${encodeURIComponent(videoPath)}`
  }

  /** Получить URL видео из IPFS CID */
  function getVideoCidUrl(cid: string): string {
    const serverUrl = getServerUrl()
    if (!serverUrl) {
      return ''
    }
    return `${serverUrl}/api/ipfs/${cid}`
  }

  /** Получить URL аудио из CID */
  function getAudioCidUrl(cid: string): string {
    const serverUrl = getServerUrl()
    if (!serverUrl) {
      return ''
    }
    return `${serverUrl}/api/ipfs/${cid}`
  }

  /**
   * Получить URL видео эпизода (автоматически выбирает источник)
   *
   * Приоритет: IPFS CID → локальный файл сервера
   */
  function getEpisodeVideoUrl(episode: { videoCid: string | null; videoPath: string | null }): string | null {
    if (episode.videoCid) {
      return getVideoCidUrl(episode.videoCid)
    }
    if (episode.videoPath) {
      return getMediaUrl(episode.videoPath)
    }
    return null
  }

  /** Получить URL для IPFS контента (субтитры, шрифты) */
  function getIpfsUrl(cid: string): string {
    const serverUrl = getServerUrl()
    if (!serverUrl) {
      console.warn('[getIpfsUrl] No connection!')
      return ''
    }
    return `${serverUrl}/api/ipfs/${cid}`
  }

  /** Получить URL субтитров из CID */
  function getSubtitleUrlFromCid(track: SubtitleTrack): string | null {
    if (!track.fileCid) {
      console.warn('[getSubtitleUrlFromCid] No fileCid!')
      return null
    }
    return getIpfsUrl(track.fileCid)
  }

  /**
   * Получить URL субтитров в VTT формате (конвертируется на сервере)
   * Для использования с нативным TextTrack
   */
  function getSubtitleVttUrl(track: SubtitleTrack): string | null {
    if (!track.fileCid) {
      return null
    }
    const serverUrl = getServerUrl()
    if (!serverUrl) {
      return null
    }
    return `${serverUrl}/api/subtitles/cid/${track.fileCid}?format=${track.format}`
  }

  /** Получить прогресс эпизода */
  async function getProgress(episodeId: string): Promise<WatchProgress | null> {
    return fetchApi<WatchProgress | null>(`/progress/${episodeId}`)
  }

  /** Сохранить прогресс эпизода */
  async function saveProgress(
    episodeId: string,
    data: { currentTime: number; completed?: boolean }
  ): Promise<WatchProgress> {
    return fetchApi<WatchProgress>(`/progress/${episodeId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /** Получить последний просмотренный эпизод */
  async function getLastWatched(): Promise<LastWatched | null> {
    try {
      return await fetchApi<LastWatched>('/last-watched')
    } catch {
      return null
    }
  }

  /** Получить эпизод по ID */
  async function getEpisode(animeId: string, episodeId: string): Promise<Episode | null> {
    const anime = await getAnimeDetails(animeId)
    return anime.episodes.find((ep) => ep.id === episodeId) ?? null
  }

  return {
    // Утилиты (экспортируем для расширения в mobile)
    fetchApi,
    getApiBase,
    getServerUrl,
    // Запросы
    getStatus,
    getLibrary,
    getAnimeDetails,
    getLastWatched,
    getEpisode,
    getProgress,
    saveProgress,
    // URL хелперы
    getPosterUrl,
    getMediaUrl,
    getVideoCidUrl,
    getAudioCidUrl,
    getEpisodeVideoUrl,
    getIpfsUrl,
    getSubtitleUrlFromCid,
    getSubtitleVttUrl,
  }
}

/** Тип возвращаемого значения createApiClient */
export type ApiClient = ReturnType<typeof createApiClient>
