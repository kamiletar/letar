/**
 * Загрузчик манифестов ВСЕХ эпизодов из IPFS для глубокого сравнения.
 *
 * Цепочка: manifestCid/directoryCid → AnimeManifest → episodesCid → EpisodesDocument
 *   → для каждого эпизода: episode.manifestCid → EpisodeManifest → сводка
 *
 * Все IPFS-запросы проходят через fetchIpfsJsonSafe (Redis-кеш 7 дней).
 */

import type {
  AnimeInfo,
  AnimeManifest,
  AnimeManifestEpisode,
  EpisodeManifest,
  EpisodesDocument,
} from '@letar/animatrona-types'

import type {
  AnimeInfoSummary,
  DeepDiffResponse,
  EpisodeFullSummary,
  ManifestTopLevelSummary,
} from '@/app/admin/_components/types'

import { getGateway, getIpfsUrl } from './ipfs'
import { fetchIpfsJsonSafe } from './ipfs-fetch'

/** Максимум параллельных IPFS-запросов (чтобы не перегрузить gateway) */
const CONCURRENCY = 5

/**
 * Загрузить полную сводку манифеста: верхнеуровневые поля + все эпизоды.
 *
 * @returns DeepDiffResponse или null при ошибке загрузки корневого манифеста
 */
export async function loadDeepDiffData(directoryCid: string): Promise<DeepDiffResponse | null> {
  try {
    const gateway = getGateway()

    // 1. Загружаем AnimeManifest
    const manifestUrl = `${gateway}/ipfs/${directoryCid}/manifest.json`
    const manifest = await fetchIpfsJsonSafe<AnimeManifest>(manifestUrl)
    if (!manifest) {
      return null
    }

    // 2. Получаем список эпизодов
    let episodes: AnimeManifestEpisode[] = []
    if (manifest.episodesCid) {
      const epsDoc = await fetchIpfsJsonSafe<EpisodesDocument>(getIpfsUrl(manifest.episodesCid))
      episodes = epsDoc?.episodes ?? []
    } else if (manifest.episodes) {
      episodes = manifest.episodes
    }

    // 3. Сводка верхнего уровня
    const manifestSummary: ManifestTopLevelSummary = {
      name: manifest.name,
      originalName: manifest.originalName,
      posterCid: manifest.posterCid,
      animeInfoCid: manifest.animeInfoCid,
      episodesCid: manifest.episodesCid,
      franchiseGraphCid: manifest.franchiseGraphCid,
      relationsCid: manifest.relationsCid,
      episodePreviewsCid: manifest.episodePreviewsCid,
      isBdRemux: manifest.isBdRemux,
      sourceUrl: manifest.source,
      directorySize: manifest.directorySize,
      directoryBlocks: manifest.directoryBlocks,
      updatedAt: manifest.updatedAt,
      episodeCount: episodes.length,
    }

    // 4. Загружаем AnimeInfo (если есть CID)
    if (manifest.animeInfoCid) {
      const info = await fetchIpfsJsonSafe<AnimeInfo>(getIpfsUrl(manifest.animeInfoCid))
      if (info) {
        manifestSummary.animeInfo = extractAnimeInfoSummary(info)
      }
    }

    // 5. Загружаем EpisodeManifest для каждого эпизода параллельно (с лимитом)
    //    Используем path-based URL через directoryCid (надёжнее, чем прямой CID)
    const sorted = [...episodes].sort((a, b) => a.number - b.number)
    const baseUrl = directoryCid ? `${gateway}/ipfs/${directoryCid}` : null
    const episodeSummaries = await parallelMap(sorted, (ep) => loadSingleEpisode(ep, baseUrl), CONCURRENCY)

    return { manifest: manifestSummary, episodes: episodeSummaries }
  } catch {
    return null
  }
}

/**
 * Загрузить сводку одного эпизода из его EpisodeManifest.
 *
 * Приоритет загрузки: path-based через directory CID → прямой CID.
 * Path-based надёжнее, т.к. gateway уже имеет блоки директории.
 */
async function loadSingleEpisode(
  ep: AnimeManifestEpisode,
  directoryBaseUrl: string | null
): Promise<EpisodeFullSummary> {
  // Базовая сводка без глубоких данных (если EpisodeManifest недоступен)
  const base: EpisodeFullSummary = {
    number: ep.number,
    name: ep.name,
    manifestCid: ep.manifestCid,
    manifestLoaded: false,
    videoCid: ep.videoCid,
    size: ep.size,
    durationMs: ep.durationMs,
    video: null,
    audioTracks: [],
    subtitleTracks: [],
    encoding: null,
    hasChapters: false,
    chaptersCount: 0,
    hasThumbnails: false,
    screenshotsCount: 0,
  }

  if (!ep.manifestCid) {
    return base
  }

  // Сначала пробуем path-based (надёжнее), потом прямой CID
  const padded = String(ep.number).padStart(2, '0')
  const pathUrl = directoryBaseUrl ? `${directoryBaseUrl}/episodes/${padded}/manifest.json` : null
  const cidUrl = getIpfsUrl(ep.manifestCid)

  let epManifest: EpisodeManifest | null = null
  if (pathUrl) {
    epManifest = await fetchIpfsJsonSafe<EpisodeManifest>(pathUrl)
  }
  if (!epManifest) {
    epManifest = await fetchIpfsJsonSafe<EpisodeManifest>(cidUrl)
  }

  if (!epManifest) {
    return base
  }

  // Главы: из chaptersCid или инлайн chapters
  const chaptersCount = epManifest.chapters?.length ?? 0
  const hasChapters = chaptersCount > 0 || !!epManifest.chaptersCid

  // Превью: thumbnailsCid или инлайн thumbnails
  const hasThumbnails = !!epManifest.thumbnailsCid || !!epManifest.thumbnails

  return {
    ...base,
    manifestLoaded: true,
    video: epManifest.video
      ? {
          width: epManifest.video.width,
          height: epManifest.video.height,
          codec: epManifest.video.codec,
          bitrate: epManifest.video.bitrate,
          size: epManifest.video.size,
          durationMs: epManifest.video.durationMs,
        }
      : null,
    audioTracks: (epManifest.audioTracks ?? []).map((t) => ({
      language: t.language,
      title: t.title,
      codec: t.codec,
      channels: t.channels,
      dubGroup: t.dubGroup,
    })),
    subtitleTracks: (epManifest.subtitleTracks ?? []).map((t) => ({
      language: t.language,
      title: t.title,
      format: t.format,
      dubGroup: t.dubGroup,
    })),
    encoding: epManifest.encoding
      ? {
          profileName: epManifest.encoding.profileName,
          codec: epManifest.encoding.codec,
          cq: epManifest.encoding.cq,
          preset: epManifest.encoding.preset,
          vmafScore: epManifest.encoding.vmafScore,
          encoderType: epManifest.encoding.encoderType,
        }
      : null,
    hasChapters,
    chaptersCount,
    hasThumbnails,
    screenshotsCount: epManifest.screenshotCids?.length ?? 0,
  }
}

/** Извлечь сводку из AnimeInfo документа */
function extractAnimeInfoSummary(info: AnimeInfo): AnimeInfoSummary {
  return {
    name: info.name,
    originalName: info.originalName,
    nameEn: info.nameEn,
    year: info.year,
    kind: info.kind,
    ageRating: info.ageRating,
    episodeCount: info.episodeCount,
    status: info.status,
    rating: info.rating,
    descriptionLength: info.description?.length ?? 0,
    genres: (info.genres ?? []).map((g) => g.nameRu || g.name),
    studios: (info.studios ?? []).map((s) => s.name),
    fandubbers: info.fandubbers ?? [],
    fansubbers: info.fansubbers ?? [],
  }
}

/** Promise.allSettled с ограничением параллелизма */
async function parallelMap<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = []
  let index = 0

  async function worker() {
    while (index < items.length) {
      const i = index++
      results[i] = await fn(items[i])
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}
