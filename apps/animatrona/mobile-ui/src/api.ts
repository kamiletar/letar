/**
 * API клиент для Mobile Server
 */

import type {
  AnimeDetails,
  AnimeListItem,
  AudioTrack,
  Chapter,
  ChapterType,
  Episode,
  LastWatched,
  Season,
  ServerStatus,
  SubtitleTrack,
  WatchProgress,
  WatchStatus,
} from '@letar/animatrona-shared'

export type {
  AnimeDetails,
  AnimeListItem,
  AudioTrack,
  Chapter,
  ChapterType,
  Episode,
  LastWatched,
  Season,
  ServerStatus,
  SubtitleTrack,
  WatchProgress,
  WatchStatus,
}

// Базовый URL — в dev режиме проксируется через Vite, в prod — относительный
const API_BASE = '/api'

/** Получить статус сервера */
export async function getStatus(): Promise<ServerStatus> {
  const response = await fetch(`${API_BASE}/status`)
  if (!response.ok) {
    throw new Error('Failed to fetch status')
  }
  return response.json()
}

/** Получить список аниме */
export async function getLibrary(): Promise<AnimeListItem[]> {
  const response = await fetch(`${API_BASE}/library`)
  if (!response.ok) {
    throw new Error('Failed to fetch library')
  }
  return response.json()
}

/** Получить детали аниме */
export async function getAnimeDetails(animeId: string): Promise<AnimeDetails> {
  const response = await fetch(`${API_BASE}/library/${animeId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch anime details')
  }
  return response.json()
}

/** Получить URL постера */
export function getPosterUrl(animeId: string): string {
  return `${API_BASE}/poster/${animeId}`
}

/** Получить URL видео для стриминга (локальный файл) */
export function getMediaUrl(videoPath: string): string {
  return `${API_BASE}/media?path=${encodeURIComponent(videoPath)}`
}

/** Получить URL видео из IPFS CID */
export function getVideoCidUrl(cid: string): string {
  return `${API_BASE}/ipfs/${cid}`
}

/** Получить URL аудио из CID */
export function getAudioCidUrl(cid: string): string {
  return `${API_BASE}/ipfs/${cid}`
}

/** Получить URL видео эпизода (автоматически выбирает источник) */
export function getEpisodeVideoUrl(episode: { videoCid: string | null; videoPath: string | null }): string | null {
  if (episode.videoCid) {
    return getVideoCidUrl(episode.videoCid)
  }
  if (episode.videoPath) {
    return getMediaUrl(episode.videoPath)
  }
  return null
}

/** Получить URL субтитров (конвертируется в VTT) */
export function getSubtitlesUrl(subtitlePath: string): string {
  return `${API_BASE}/subtitles?path=${encodeURIComponent(subtitlePath)}`
}

/** Получить URL для IPFS контента (субтитры, шрифты) */
export function getIpfsUrl(cid: string): string {
  return `${API_BASE}/ipfs/${cid}`
}

/** Получить URL субтитров из CID */
export function getSubtitleUrlFromCid(track: SubtitleTrack): string | null {
  if (!track.fileCid) {
    return null
  }
  return getIpfsUrl(track.fileCid)
}

/**
 * Получить URL субтитров в VTT формате (конвертируется на сервере)
 * Для использования с нативным <track> элементом
 */
export function getSubtitleVttUrl(track: SubtitleTrack): string | null {
  if (!track.fileCid) {
    return null
  }
  return `${API_BASE}/subtitles/cid/${track.fileCid}?format=${track.format}`
}

/** Получить прогресс эпизода */
export async function getProgress(episodeId: string): Promise<WatchProgress | null> {
  const response = await fetch(`${API_BASE}/progress/${episodeId}`)
  if (!response.ok) {
    throw new Error('Failed to fetch progress')
  }
  return response.json()
}

/** Сохранить прогресс эпизода */
export async function saveProgress(
  episodeId: string,
  data: { currentTime: number; completed?: boolean }
): Promise<WatchProgress> {
  const response = await fetch(`${API_BASE}/progress/${episodeId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    throw new Error('Failed to save progress')
  }
  return response.json()
}

/** Получить последний просмотренный эпизод */
export async function getLastWatched(): Promise<LastWatched | null> {
  const response = await fetch(`${API_BASE}/last-watched`)
  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    throw new Error('Failed to fetch last watched')
  }
  return response.json()
}
