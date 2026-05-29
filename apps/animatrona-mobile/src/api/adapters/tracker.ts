/**
 * Tracker адаптер — маппит API animatrona-tracker в shared типы
 *
 * Tracker сервер (веб-платформа с IPFS каталогом):
 * - Авторизация через API Key (Bearer at_xxx)
 * - GET /api/anime (каталог), GET /api/anime/{id} (детали)
 * - POST /api/watch-progress (прогресс по animeId + episodeNumber)
 * - Видео только через IPFS (нет локальных файлов)
 */

import type {
  AnimeDetails,
  AnimeListItem,
  AnimeRelationInfo,
  ChapterType,
  Episode,
  LastWatched,
  SubtitleTrack,
  WatchProgress,
} from '@letar/animatrona-shared'

import type { ServerConfig } from '@/types/server'
import type { EpisodeVideoInfo, ServerAdapter } from './types'

/** Формат ответа каталога трекера */
interface TrackerAnimeItem {
  id: string
  title: string
  titleOriginal: string | null
  coverUrl: string | null
  directoryCid: string | null
  shikimoriId: number | null
  year: number | null
  studio: string | null
  genres: string[]
  episodeCount: number
  createdAt: string
  franchiseKey?: string | null
  /** Связи с другими аниме (из Tracker API, если доступны) */
  relations?: Array<{ targetShikimoriId: number; targetAnimeId: string | null; relationKind: string }>
}

/** Формат эпизода из трекера */
interface TrackerEpisode {
  id: string
  number: number
  title: string | null
  duration: number | null
  videoCid: string | null
}

/** Формат деталей аниме из трекера */
interface TrackerAnimeDetail {
  id: string
  title: string
  titleOriginal: string | null
  description: string | null
  coverUrl: string | null
  directoryCid: string | null
  shikimoriId: number | null
  year: number | null
  studio: string | null
  genres: string[]
  episodes: TrackerEpisode[]
}

/** IPFS манифест аниме (manifest.json в directoryCid) */
interface IpfsAnimeManifest {
  episodesCid: string
}

/** IPFS документ эпизодов */
interface IpfsEpisodesDocument {
  episodes: IpfsEpisodeEntry[]
}

/** Запись эпизода в IPFS документе */
interface IpfsEpisodeEntry {
  number: number
  manifestCid: string
  videoCid: string | null
}

/** IPFS манифест эпизода — содержит аудио/субтитры */
interface IpfsEpisodeManifest {
  audioTracks?: Array<{
    id: string
    language: string
    title: string | null
    codec: string
    channels: string
    isDefault: boolean
    cid: string
    dubGroup: string | null
  }>
  subtitleTracks?: Array<{
    id: string
    language: string
    title: string | null
    format: string
    isDefault: boolean
    cid: string
    dubGroup: string | null
  }>
  chapters?: Array<{
    title: string
    startMs: number
    endMs: number
  }>
}

/** Формат прогресса из трекера */
interface TrackerWatchProgress {
  episodeNumber: number
  currentTime: number
  duration: number
  completed: boolean
  updatedAt: string
}

/** Маппинг TrackerAnimeItem → AnimeListItem */
function mapAnimeItem(item: TrackerAnimeItem): AnimeListItem {
  return {
    id: item.id,
    name: item.title,
    originalName: item.titleOriginal,
    year: item.year,
    status: 'PUBLISHED',
    episodeCount: item.episodeCount,
    description: null,
    rating: null,
    posterPath: item.coverUrl,
    watchStatus: 'NOT_STARTED',
    watchedEpisodes: 0,
    lastWatchedEpisode: null,
    shikimoriId: item.shikimoriId,
    franchiseKey: item.franchiseKey ?? null,
    relations: item.relations?.map((r) => ({
      targetShikimoriId: r.targetShikimoriId,
      targetAnimeId: r.targetAnimeId,
      relationKind: r.relationKind,
    })),
  }
}

/** Маппинг TrackerEpisode → Episode */
function mapEpisode(ep: TrackerEpisode): Episode {
  return {
    id: ep.id,
    number: ep.number,
    name: ep.title,
    durationMs: ep.duration ? ep.duration * 1000 : null,
    seasonNumber: 1,
    seasonName: null,
    videoPath: null,
    videoCid: ep.videoCid,
    progress: null,
    audioTracks: [],
    subtitleTracks: [],
    chapters: [],
  }
}

/** Маппинг TrackerAnimeDetail → AnimeDetails */
function mapAnimeDetail(detail: TrackerAnimeDetail): AnimeDetails {
  return {
    id: detail.id,
    name: detail.title,
    originalName: detail.titleOriginal,
    year: detail.year,
    status: 'PUBLISHED',
    episodeCount: detail.episodes.length,
    description: detail.description,
    rating: null,
    posterPath: detail.coverUrl,
    watchStatus: 'NOT_STARTED',
    genres: detail.genres,
    seasons: [
      {
        number: 1,
        name: null,
        type: 'MAIN',
        episodeCount: detail.episodes.length,
      },
    ],
    episodes: detail.episodes.map(mapEpisode),
  }
}

/** Создать Tracker адаптер */
export function createTrackerAdapter(server: ServerConfig): ServerAdapter {
  const baseUrl = server.url.replace(/\/$/, '')

  /** Конвертирует ipfs:// URI в HTTP URL через proxy трекера */
  function resolveIpfsUrl(ipfsUri: string | null): string | null {
    if (!ipfsUri) return null
    if (ipfsUri.startsWith('ipfs://')) {
      return `${baseUrl}/api/ipfs/${ipfsUri.slice(7)}`
    }
    return ipfsUri
  }

  /** Загружает JSON из IPFS gateway */
  async function fetchIpfs<T>(cid: string): Promise<T> {
    const url = `${baseUrl}/api/ipfs/${cid}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`IPFS fetch failed: ${res.status}`)
    return res.json()
  }

  /**
   * Обогащает эпизоды аудиодорожками и субтитрами из IPFS манифестов.
   * Загружает manifest.json → episodesDocument → episode manifests.
   */
  async function enrichEpisodesFromIpfs(episodes: Episode[], directoryCid: string): Promise<void> {
    // 1. Загружаем анимe-манифест → episodesCid
    const manifest = await fetchIpfs<IpfsAnimeManifest>(`${directoryCid}/manifest.json`)
    if (!manifest.episodesCid) return

    // 2. Загружаем episodes document → массив записей с manifestCid
    const epsDoc = await fetchIpfs<IpfsEpisodesDocument>(manifest.episodesCid)
    if (!epsDoc.episodes?.length) return

    // Маппинг номер → manifestCid
    const manifestMap = new Map<number, string>()
    for (const entry of epsDoc.episodes) {
      if (entry.manifestCid) manifestMap.set(entry.number, entry.manifestCid)
    }

    // 3. Загружаем манифесты эпизодов параллельно
    const promises = episodes.map(async (episode) => {
      const manifestCid = manifestMap.get(episode.number)
      if (!manifestCid) return

      try {
        const epManifest = await fetchIpfs<IpfsEpisodeManifest>(manifestCid)

        // Маппим audioTracks
        if (epManifest.audioTracks?.length) {
          episode.audioTracks = epManifest.audioTracks.map((t) => ({
            id: t.id,
            language: t.language,
            title: t.title,
            name: t.title,
            dubGroup: t.dubGroup ?? null,
            codec: t.codec,
            channels: t.channels,
            isDefault: t.isDefault,
            audioCid: t.cid,
          }))
        }

        // Маппим subtitleTracks
        if (epManifest.subtitleTracks?.length) {
          episode.subtitleTracks = epManifest.subtitleTracks.map((t) => ({
            id: t.id,
            language: t.language,
            title: t.title,
            name: t.title,
            dubGroup: t.dubGroup ?? null,
            format: t.format as 'ass' | 'ssa' | 'srt' | 'vtt' | 'sub',
            isDefault: t.isDefault,
            fileCid: t.cid,
            fontCids: [],
          }))
        }

        // Маппим chapters
        if (epManifest.chapters?.length) {
          episode.chapters = epManifest.chapters.map((ch, i) => {
            const titleUpper = ch.title.toUpperCase()
            const type: ChapterType = titleUpper.includes('OP')
              ? 'OP'
              : titleUpper.includes('ED')
              ? 'ED'
              : titleUpper.includes('RECAP')
              ? 'RECAP'
              : titleUpper.includes('PREVIEW')
              ? 'PREVIEW'
              : 'CHAPTER'
            return {
              id: `ch-${i}`,
              title: ch.title,
              startMs: ch.startMs,
              endMs: ch.endMs,
              type,
              skippable: type === 'OP' || type === 'ED',
            }
          })
        }
      } catch {
        // Отдельный эпизод не загрузился — пропускаем
      }
    })

    await Promise.all(promises)
  }

  /** Заголовки с авторизацией */
  function getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
    if (server.apiKey) {
      headers['Authorization'] = `Bearer ${server.apiKey}`
    }
    return headers
  }

  /** Базовый fetch с авторизацией */
  async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${baseUrl}/api${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getHeaders(),
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    return response.json()
  }

  /** Маппинг episodeId → { animeId, episodeNumber } через кэш деталей */
  const episodeCache = new Map<string, { animeId: string; episodeNumber: number }>()

  /** Маппинг animeId → coverUrl (IPFS URL постера) */
  const posterCache = new Map<string, string>()

  return {
    fetchApi,
    getApiBase: () => `${baseUrl}/api`,

    async getLibrary(options?): Promise<AnimeListItem[]> {
      const result: AnimeListItem[] = []
      let page = 1
      const limit = 100
      const searchParam = options?.search ? `&search=${encodeURIComponent(options.search)}` : ''

      while (true) {
        const response = await fetchApi<{
          data: TrackerAnimeItem[]
          pagination: { totalPages: number }
        }>(`/anime?page=${page}&limit=${limit}${searchParam}`)

        for (const item of response.data) {
          const resolved = resolveIpfsUrl(item.coverUrl)
          if (resolved) posterCache.set(item.id, resolved)
        }
        result.push(
          ...response.data.map((item) => {
            const mapped = mapAnimeItem(item)
            mapped.posterPath = resolveIpfsUrl(mapped.posterPath)
            return mapped
          }),
        )

        if (page >= response.pagination.totalPages) break
        page++
      }

      // Загружаем сводку прогресса одним запросом для определения watchStatus
      if (server.apiKey) {
        try {
          const summary = await fetchApi<{
            data: Record<string, { watchedEpisodes: number; lastEpisode: number | null; lastEpisodeProgress: number }>
          }>('/watch-progress/summary')

          for (const item of result) {
            const progress = summary.data[item.id]
            if (progress) {
              item.watchedEpisodes = progress.watchedEpisodes
              item.lastWatchedEpisode = progress.lastEpisode
              if (progress.watchedEpisodes >= item.episodeCount && item.episodeCount > 0) {
                item.watchStatus = 'COMPLETED'
              } else if (progress.watchedEpisodes > 0 || progress.lastEpisode !== null) {
                item.watchStatus = 'WATCHING'
              }
            }
          }
        } catch {
          // Сводка необязательна — продолжаем без прогресса
        }
      }

      return result
    },

    async getAnimeDetails(animeId: string): Promise<AnimeDetails> {
      const response = await fetchApi<{ data: TrackerAnimeDetail }>(`/anime/${animeId}`)
      const detail = mapAnimeDetail(response.data)
      detail.posterPath = resolveIpfsUrl(detail.posterPath)

      // Кэшируем coverUrl (конвертированный в HTTP)
      const resolvedCover = resolveIpfsUrl(response.data.coverUrl)
      if (resolvedCover) posterCache.set(animeId, resolvedCover)

      // Кэшируем маппинг episodeId → { animeId, episodeNumber }
      for (const ep of detail.episodes) {
        episodeCache.set(ep.id, { animeId, episodeNumber: ep.number })
      }

      // Загружаем прогресс если есть API Key
      if (server.apiKey) {
        try {
          const progressResponse = await fetchApi<{ episodes: TrackerWatchProgress[] }>(
            `/watch-progress?animeId=${animeId}`,
          )
          const progressMap = new Map(progressResponse.episodes.map((p) => [p.episodeNumber, p]))

          for (const episode of detail.episodes) {
            const progress = progressMap.get(episode.number)
            if (progress) {
              episode.progress = {
                currentTime: progress.currentTime,
                completed: progress.completed,
                lastWatchedAt: progress.updatedAt,
              }
            }
          }

          // Обновляем watchStatus на основе прогресса
          const watchedCount = detail.episodes.filter((e) => e.progress?.completed).length
          if (watchedCount > 0) {
            detail.watchStatus = watchedCount >= detail.episodeCount ? 'COMPLETED' : 'WATCHING'
          }
        } catch {
          // Прогресс необязателен — продолжаем без него
        }
      }

      // Загружаем аудиодорожки и субтитры из IPFS манифестов эпизодов
      if (response.data.directoryCid) {
        try {
          await enrichEpisodesFromIpfs(detail.episodes, response.data.directoryCid)
        } catch {
          // IPFS необязателен — продолжаем без аудио/субтитров
        }
      }

      return detail
    },

    getPosterUrl(animeId: string): string {
      // Возвращаем IPFS URL постера из кэша (заполняется в getLibrary/getAnimeDetails)
      return posterCache.get(animeId) ?? ''
    },

    getEpisodeVideoUrl(episode: EpisodeVideoInfo): string | null {
      if (episode.videoCid) {
        return `${baseUrl}/api/ipfs/${episode.videoCid}`
      }
      return null
    },

    getAudioCidUrl(cid: string): string {
      return `${baseUrl}/api/ipfs/${cid}`
    },

    async getProgress(episodeId: string): Promise<WatchProgress | null> {
      if (!server.apiKey) return null

      const cached = episodeCache.get(episodeId)
      if (!cached) return null

      try {
        const response = await fetchApi<{ episodes: TrackerWatchProgress[] }>(
          `/watch-progress?animeId=${cached.animeId}`,
        )
        const progress = response.episodes.find((p) => p.episodeNumber === cached.episodeNumber)
        if (!progress) return null

        return {
          currentTime: progress.currentTime,
          completed: progress.completed,
          lastWatchedAt: progress.updatedAt,
        }
      } catch {
        return null
      }
    },

    async saveProgress(episodeId: string, data) {
      if (!server.apiKey) return

      const cached = episodeCache.get(episodeId)
      if (!cached) {
        throw new Error(`[tracker] episodeId не найден в кэше: ${episodeId}`)
      }

      return fetchApi('/watch-progress', {
        method: 'POST',
        body: JSON.stringify({
          animeId: cached.animeId,
          episodeNumber: cached.episodeNumber,
          currentTime: data.currentTime,
          duration: data.duration ?? 0,
          completed: data.completed,
        }),
      })
    },

    async getLastWatched(): Promise<LastWatched | null> {
      // Трекер не имеет отдельного endpoint для "последнего просмотренного"
      // Возвращаем null — UI покажет библиотеку без "Продолжить просмотр"
      return null
    },

    async checkStatus(): Promise<boolean> {
      try {
        await fetchApi<unknown>('/anime?limit=1')
        return true
      } catch {
        return false
      }
    },

    getIpfsUrl(cid: string): string {
      return `${baseUrl}/api/ipfs/${cid}`
    },

    getSubtitleVttUrl(_track: SubtitleTrack): string | null {
      // Трекер не имеет конвертации субтитров на сервере
      // Субтитры загружаются как raw файлы через IPFS
      return null
    },

    getSubtitleUrlFromCid(track: SubtitleTrack): string | null {
      if (!track.fileCid) return null
      return `${baseUrl}/api/ipfs/${track.fileCid}`
    },

    getMediaUrl(_videoPath: string): string {
      // Трекер не поддерживает локальные файлы
      return ''
    },
  }
}
