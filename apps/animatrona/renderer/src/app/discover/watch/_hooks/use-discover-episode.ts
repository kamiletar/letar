'use client'

/**
 * Хук для загрузки EpisodeManifest из IPFS для просмотра из каталога
 *
 * Цепочка загрузки:
 *   directoryCid/manifest.json → AnimeManifest
 *   → episodesCid → EpisodesDocument → episodes[N].manifestCid
 *   → EpisodeManifest (аудио/субтитры/главы/превью)
 *
 * Не требует трекера или БД — всё из IPFS.
 */

import type {
  AnimeManifest,
  AnimeManifestEpisode,
  EpisodeManifest,
  EpisodesDocument,
  ManifestAudioTrack,
  ManifestChapter,
  ManifestSubtitleTrack,
} from '@letar/animatrona-types'
import { parseSpriteCues, type SpriteCue } from '@letar/video-player-react'
import { useQuery } from '@tanstack/react-query'

import type { AudioTrackInfo, Chapter } from '@/components/player'
import type { TrackInfo } from '@/components/player/TrackSelector'
import { getGatewayBaseUrl, toPlayableUrl } from '@/lib/media-url'

/** Результат загрузки манифеста эпизода для discover */
export interface DiscoverEpisodeData {
  /** URL видео для плеера */
  videoSrc: string
  /** Аудиодорожки для VideoPlayer */
  audioTracksForPlayer: AudioTrackInfo[]
  /** Аудиодорожки для TrackSelector */
  audioTracksForSelector: TrackInfo[]
  /** Субтитры для TrackSelector */
  subtitleTracksForSelector: TrackInfo[]
  /** Субтитры из манифеста (для доступа к fonts/cid) */
  subtitleTracks: ManifestSubtitleTrack[]
  /** Главы в формате плеера */
  chapters: Chapter[]
  /** VTT cues для hover preview */
  spriteCues: SpriteCue[]
  /** URL спрайт-изображения */
  spriteUrl: string | null
  /** Длительность видео в секундах */
  durationSec: number
}

/** Конвертировать ManifestChapter → Chapter (формат плеера) */
function toPlayerChapter(ch: ManifestChapter, index: number): Chapter {
  const typeMap: Record<string, 'OP' | 'ED' | 'RECAP' | 'PREVIEW' | 'CHAPTER'> = {
    op: 'OP',
    ed: 'ED',
    recap: 'RECAP',
    preview: 'PREVIEW',
    chapter: 'CHAPTER',
  }
  const type = typeMap[ch.type] ?? 'CHAPTER'
  return {
    id: `ch-${index}`,
    title: ch.title || type,
    startTime: ch.startMs / 1000,
    endTime: ch.endMs / 1000,
    type,
  }
}

/** Конвертировать ManifestAudioTrack → AudioTrackInfo */
function toAudioTrackInfo(track: ManifestAudioTrack): AudioTrackInfo {
  return {
    id: track.id,
    language: track.language,
    title: track.title || undefined,
    codec: track.codec,
    channels: track.channels,
    isDefault: track.isDefault,
    transcodedCid: track.cid || undefined,
  }
}

/** Конвертировать ManifestAudioTrack → TrackInfo для TrackSelector */
function toAudioSelectorTrack(track: ManifestAudioTrack): TrackInfo {
  return {
    id: track.id,
    label: track.title || undefined,
    language: track.language,
    codec: track.codec,
    isDefault: track.isDefault,
    dubGroup: track.dubGroup || undefined,
    transcodedCid: track.cid || undefined,
  }
}

/** Конвертировать ManifestSubtitleTrack → TrackInfo для TrackSelector */
function toSubtitleSelectorTrack(track: ManifestSubtitleTrack): TrackInfo {
  return {
    id: track.id,
    label: track.title || undefined,
    language: track.language,
    codec: track.format,
    isDefault: track.isDefault,
    dubGroup: track.dubGroup || undefined,
  }
}

/** Загрузить JSON из IPFS gateway */
async function fetchIpfsJson<T>(cid: string): Promise<T> {
  const url = `${getGatewayBaseUrl()}/ipfs/${cid}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30_000)

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`IPFS fetch failed: ${response.status} (${url})`)
    }
    return (await response.json()) as T
  } finally {
    clearTimeout(timeoutId)
  }
}

/** Загрузить JSON по пути внутри IPFS-директории */
async function fetchIpfsPath<T>(dirCid: string, path: string): Promise<T> {
  const url = `${getGatewayBaseUrl()}/ipfs/${dirCid}/${path}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30_000)

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`IPFS fetch failed: ${response.status} (${url})`)
    }
    return (await response.json()) as T
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Резолвить manifestCid эпизода из IPFS-директории аниме
 *
 * directoryCid/manifest.json → episodesCid → episodes[N].manifestCid
 */
async function resolveEpisodeManifestCid(
  directoryCid: string,
  episodeNumber: number
): Promise<{ manifestCid: string; videoCid?: string } | null> {
  // 1. Загружаем AnimeManifest
  const animeManifest = await fetchIpfsPath<AnimeManifest>(directoryCid, 'manifest.json')

  // 2. Загружаем список эпизодов
  let episodes: AnimeManifestEpisode[] = []
  if (animeManifest.episodesCid) {
    const epsDoc = await fetchIpfsJson<EpisodesDocument>(animeManifest.episodesCid)
    episodes = epsDoc.episodes ?? []
  } else if (animeManifest.episodes) {
    // v1 legacy
    episodes = animeManifest.episodes
  }

  // 3. Ищем нужный эпизод
  const episode = episodes.find((ep) => ep.number === episodeNumber)
  if (!episode) {
    return null
  }

  return {
    manifestCid: episode.manifestCid,
    videoCid: episode.videoCid,
  }
}

/** Загрузить и распарсить EpisodeManifest */
async function loadEpisodeData(manifestCid: string): Promise<DiscoverEpisodeData | null> {
  const manifest = await fetchIpfsJson<EpisodeManifest>(manifestCid)

  // Видео URL
  const videoSrc = toPlayableUrl({ cid: manifest.video.cid })
  if (!videoSrc) {
    return null
  }

  // Аудиодорожки
  const audioTracksForPlayer = manifest.audioTracks.map(toAudioTrackInfo)
  const audioTracksForSelector = manifest.audioTracks.map(toAudioSelectorTrack)

  // Субтитры
  const subtitleTracksForSelector = manifest.subtitleTracks.map(toSubtitleSelectorTrack)

  // Главы — из chaptersCid (новый формат) или inline chapters
  let chapters: Chapter[] = []
  if (manifest.chaptersCid) {
    try {
      const chaptersDoc = await fetchIpfsJson<{ chapters: ManifestChapter[] }>(manifest.chaptersCid)
      chapters = chaptersDoc.chapters.map(toPlayerChapter)
    } catch {
      // Fallback на inline chapters
      if (manifest.chapters?.length) {
        chapters = manifest.chapters.map(toPlayerChapter)
      }
    }
  } else if (manifest.chapters?.length) {
    chapters = manifest.chapters.map(toPlayerChapter)
  }

  // Sprite thumbnails — из thumbnailsCid (новый формат) или inline
  let spriteCues: SpriteCue[] = []
  let spriteUrl: string | null = null
  const thumbnails = manifest.thumbnailsCid
    ? await fetchIpfsJson<{ thumbnails: { vttCid: string; spriteCid: string } }>(manifest.thumbnailsCid)
        .then((d) => d.thumbnails)
        .catch(() => manifest.thumbnails)
    : manifest.thumbnails

  if (thumbnails?.vttCid && thumbnails?.spriteCid) {
    try {
      const vttUrl = toPlayableUrl({ cid: thumbnails.vttCid })
      if (vttUrl) {
        const vttResponse = await fetch(vttUrl)
        if (vttResponse.ok) {
          const vttText = await vttResponse.text()
          spriteCues = parseSpriteCues(vttText)
          spriteUrl = toPlayableUrl({ cid: thumbnails.spriteCid })
        }
      }
    } catch {
      // Превью недоступны — не критично
    }
  }

  return {
    videoSrc,
    audioTracksForPlayer,
    audioTracksForSelector,
    subtitleTracksForSelector,
    subtitleTracks: manifest.subtitleTracks,
    chapters,
    spriteCues,
    spriteUrl,
    durationSec: manifest.video.durationMs / 1000,
  }
}

/**
 * Хук для загрузки данных эпизода из IPFS
 *
 * Резолвит manifestCid из directoryCid через IPFS цепочку:
 *   directoryCid/manifest.json → episodesCid → episodes[N].manifestCid → EpisodeManifest
 *
 * @param directoryCid - CID директории аниме в IPFS
 * @param episodeNumber - Номер эпизода
 * @param videoCidFallback - CID видео (fallback если манифест не найден)
 */
export function useDiscoverEpisode(
  directoryCid: string | null | undefined,
  episodeNumber: number | null | undefined,
  videoCidFallback: string | null | undefined
) {
  return useQuery<DiscoverEpisodeData | null>({
    queryKey: ['discoverEpisode', directoryCid, episodeNumber, videoCidFallback],
    queryFn: async () => {
      // Если есть directoryCid — резолвим manifestCid через IPFS
      if (directoryCid && episodeNumber != null) {
        try {
          const resolved = await resolveEpisodeManifestCid(directoryCid, episodeNumber)
          if (resolved?.manifestCid) {
            return await loadEpisodeData(resolved.manifestCid)
          }
          // Нет manifestCid — fallback на videoCid из IPFS или из search params
          const fallbackCid = resolved?.videoCid || videoCidFallback
          if (fallbackCid) {
            const videoUrl = toPlayableUrl({ cid: fallbackCid })
            if (videoUrl) {
              return {
                videoSrc: videoUrl,
                audioTracksForPlayer: [],
                audioTracksForSelector: [],
                subtitleTracksForSelector: [],
                subtitleTracks: [],
                chapters: [],
                spriteCues: [],
                spriteUrl: null,
                durationSec: 0,
              }
            }
          }
        } catch (err) {
          console.error('[useDiscoverEpisode] Ошибка загрузки из IPFS:', err)
          // Fallback на videoCid
        }
      }

      // Fallback: только видео без манифеста
      if (!videoCidFallback) {
        return null
      }
      const videoUrl = toPlayableUrl({ cid: videoCidFallback })
      if (!videoUrl) {
        return null
      }
      return {
        videoSrc: videoUrl,
        audioTracksForPlayer: [],
        audioTracksForSelector: [],
        subtitleTracksForSelector: [],
        subtitleTracks: [],
        chapters: [],
        spriteCues: [],
        spriteUrl: null,
        durationSec: 0,
      }
    },
    enabled: !!(directoryCid || videoCidFallback),
    staleTime: 10 * 60 * 1000, // 10 минут — манифест не меняется
  })
}
