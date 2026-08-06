'use client'

/**
 * Единый хук для загрузки данных аниме из IPFS
 *
 * Загружает:
 * 1. AnimeManifest → CID'ы вложенных документов
 * 2. AnimeInfo → videos, description
 * 3. EpisodePreviewsDocument → thumbnails/screenshots для карточек
 * 4. RelationsDocument → связанные аниме
 * 5. Первый EpisodeManifest → обзор дорожек (аудио/субтитры)
 *
 * Используется на странице каталога (discover), где данные БД недоступны.
 */

import type {
  AnimeInfo,
  AnimeManifest,
  AnimeManifestRelation,
  EpisodeManifest,
  EpisodePreviewsDocument,
  EpisodesDocument,
  RelationsDocument,
} from '@letar/animatrona-types'
import { useQuery } from '@tanstack/react-query'

import { getGatewayBaseUrl } from '@/lib/media-url'

/** Превью одного эпизода */
export interface EpisodePreviewData {
  /** JSON строка с CID thumbnail'ов (для EpisodeCard) */
  thumbnailCids: string | null
  /** JSON строка с CID скриншотов (для EpisodeCard) */
  screenshotCids: string | null
}

/** Сводка по видео (из первого EpisodeManifest — обычно одинаково для всех серий) */
export interface VideoSummary {
  /** Кодек (av1, hevc, h264) */
  codec: string
  /** Высота кадра (1080, 720, etc.) */
  height: number
  /** Ширина кадра */
  width: number
  /** Битность (8, 10) — из encoding.force10Bit или encoding.sourceBitDepth */
  bitDepth?: number
}

/** Обзор дорожек (аудио/субтитры) из EpisodeManifest'ов */
export interface TracksSummary {
  /** Уникальные аудиодорожки (язык + dubGroup + codec + channels) */
  audioTracks: Array<{
    language: string
    dubGroup: string | undefined
    codec: string
    channels: string
  }>
  /** Уникальные субтитры (язык + dubGroup + format) */
  subtitleTracks: Array<{
    language: string
    dubGroup: string | undefined
    format: string
  }>
}

/** Результат загрузки данных из IPFS */
export interface AnimeIpfsData {
  /** AnimeInfo (описание, видео, студии и т.д.) */
  animeInfo: AnimeInfo | null
  /** Превью эпизодов (thumbnails + screenshots) */
  episodePreviews: Map<number, EpisodePreviewData>
  /** ManifestCid каждого эпизода (номер → CID) */
  episodeManifestCids: Map<number, string>
  /** MetadataCid каждого эпизода (номер → CID metadata.json исходника) */
  episodeMetadataCids: Map<number, string>
  /** Сводка по видео (кодек, разрешение, битность) */
  videoSummary: VideoSummary | null
  /** Связанные аниме */
  relations: AnimeManifestRelation[]
  /** Обзор дорожек */
  tracksSummary: TracksSummary | null
  /** Загрузка основных данных */
  loading: boolean
}

/** Загрузить JSON из IPFS gateway */
async function fetchIpfsJson<T>(cid: string): Promise<T | null> {
  const gateway = getGatewayBaseUrl()
  const res = await fetch(`${gateway}/ipfs/${cid}`)
  if (!res.ok) {
    return null
  }
  return res.json()
}

/** Загрузить AnimeManifest из директории */
async function fetchManifest(directoryCid: string): Promise<AnimeManifest | null> {
  const gateway = getGatewayBaseUrl()
  const res = await fetch(`${gateway}/ipfs/${directoryCid}/manifest.json`)
  if (!res.ok) {
    return null
  }
  return res.json()
}

/** Собрать уникальные дорожки из EpisodeManifest */
function extractTracksSummary(episodeManifest: EpisodeManifest): TracksSummary {
  const audioSet = new Map<string, TracksSummary['audioTracks'][number]>()
  const subSet = new Map<string, TracksSummary['subtitleTracks'][number]>()

  for (const track of episodeManifest.audioTracks) {
    const key = `${track.language}|${track.dubGroup ?? ''}|${track.codec}|${track.channels}`
    if (!audioSet.has(key)) {
      audioSet.set(key, {
        language: track.language,
        dubGroup: track.dubGroup,
        codec: track.codec,
        channels: track.channels,
      })
    }
  }

  for (const track of episodeManifest.subtitleTracks) {
    const key = `${track.language}|${track.dubGroup ?? ''}|${track.format}`
    if (!subSet.has(key)) {
      subSet.set(key, {
        language: track.language,
        dubGroup: track.dubGroup,
        format: track.format,
      })
    }
  }

  return {
    audioTracks: [...audioSet.values()],
    subtitleTracks: [...subSet.values()],
  }
}

/** Основная функция загрузки всех данных из IPFS */
async function loadAnimeIpfsData(directoryCid: string): Promise<{
  animeInfo: AnimeInfo | null
  episodePreviews: Map<number, EpisodePreviewData>
  episodeManifestCids: Map<number, string>
  episodeMetadataCids: Map<number, string>
  videoSummary: VideoSummary | null
  relations: AnimeManifestRelation[]
  tracksSummary: TracksSummary | null
}> {
  // Шаг 1: загрузить манифест
  const manifest = await fetchManifest(directoryCid)
  if (!manifest) {
    return {
      animeInfo: null,
      episodePreviews: new Map(),
      episodeManifestCids: new Map(),
      episodeMetadataCids: new Map(),
      videoSummary: null,
      relations: [],
      tracksSummary: null,
    }
  }

  // Шаг 2: параллельно загружаем все вложенные документы
  const [animeInfo, previewsDoc, relationsDoc, episodesDoc] = await Promise.all([
    manifest.animeInfoCid ? fetchIpfsJson<AnimeInfo>(manifest.animeInfoCid) : Promise.resolve(null),
    manifest.episodePreviewsCid
      ? fetchIpfsJson<EpisodePreviewsDocument>(manifest.episodePreviewsCid)
      : Promise.resolve(null),
    manifest.relationsCid ? fetchIpfsJson<RelationsDocument>(manifest.relationsCid) : Promise.resolve(null),
    manifest.episodesCid ? fetchIpfsJson<EpisodesDocument>(manifest.episodesCid) : Promise.resolve(null),
  ])

  // Шаг 3: собрать превью эпизодов
  const episodePreviews = new Map<number, EpisodePreviewData>()
  if (previewsDoc?.previews) {
    for (const ep of previewsDoc.previews) {
      episodePreviews.set(ep.number, {
        thumbnailCids: ep.thumbnailCids?.length > 0 ? JSON.stringify(ep.thumbnailCids) : null,
        screenshotCids: ep.screenshotCids?.length > 0 ? JSON.stringify(ep.screenshotCids) : null,
      })
    }
  }

  // Шаг 4: связи
  const relations = relationsDoc?.relations ?? []

  // Шаг 5: собрать manifestCid каждого эпизода
  const episodeManifestCids = new Map<number, string>()
  if (episodesDoc?.episodes) {
    for (const ep of episodesDoc.episodes) {
      if (ep.manifestCid) {
        episodeManifestCids.set(ep.number, ep.manifestCid)
      }
    }
  }

  // Шаг 5.1: собрать metadataCid из episode manifests (lazy — загружаем все)
  const episodeMetadataCids = new Map<number, string>()

  // Шаг 6: загрузить EpisodeManifest'ы для обзора дорожек, видео-сводки и metadataCid
  let tracksSummary: TracksSummary | null = null
  let videoSummary: VideoSummary | null = null

  // Загружаем все EpisodeManifest'ы параллельно (они маленькие JSON'ы)
  const manifestEntries = [...episodeManifestCids.entries()]
  if (manifestEntries.length > 0) {
    const loadedManifests = await Promise.all(
      manifestEntries.map(async ([number, cid]) => {
        const manifest = await fetchIpfsJson<EpisodeManifest>(cid)
        return { number, manifest }
      }),
    )

    for (const { number, manifest } of loadedManifests) {
      if (!manifest) {
        continue
      }

      // Собираем metadataCid
      if (manifest.metadataCid) {
        episodeMetadataCids.set(number, manifest.metadataCid)
      }

      // Первый манифест — для сводки по видео и дорожкам
      if (!videoSummary) {
        tracksSummary = extractTracksSummary(manifest)
        const { video, encoding } = manifest
        videoSummary = {
          codec: video.codec,
          height: video.height,
          width: video.width,
          bitDepth: encoding?.force10Bit ? 10 : encoding?.sourceBitDepth,
        }
      }
    }
  }

  return {
    animeInfo,
    episodePreviews,
    episodeManifestCids,
    episodeMetadataCids,
    videoSummary,
    relations,
    tracksSummary,
  }
}

/**
 * Единый хук загрузки данных аниме из IPFS
 *
 * @param directoryCid - CID IPFS-директории аниме
 * @returns Данные из IPFS (AnimeInfo, превью, связи, дорожки)
 */
export function useAnimeIpfsData(directoryCid: string | null | undefined): AnimeIpfsData {
  const { data, isLoading } = useQuery({
    queryKey: ['animeIpfsData', directoryCid],
    queryFn: () => loadAnimeIpfsData(directoryCid!),
    enabled: !!directoryCid,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  return {
    animeInfo: data?.animeInfo ?? null,
    episodePreviews: data?.episodePreviews ?? new Map(),
    episodeManifestCids: data?.episodeManifestCids ?? new Map(),
    episodeMetadataCids: data?.episodeMetadataCids ?? new Map(),
    videoSummary: data?.videoSummary ?? null,
    relations: data?.relations ?? [],
    tracksSummary: data?.tracksSummary ?? null,
    loading: isLoading,
  }
}
