/**
 * Загрузчик манифестов из IPFS для страницы аниме.
 *
 * Серверная загрузка: AnimeManifest, RelationsDocument,
 * FranchiseGraphDocument, EpisodePreviewsDocument.
 * Использует Gateway URL для fetch запросов.
 */

import type {
  AnimeManifest,
  AnimeManifestRelation,
  EpisodePreviewsDocument,
  EpisodesDocument,
  FranchiseGraphDocument,
  RelationsDocument,
} from '@letar/animatrona-types'
import { getGateway, getIpfsUrl } from './ipfs'
import { fetchIpfsJson, fetchIpfsJsonSafe } from './ipfs-fetch'

// ─── Результат загрузки для страницы аниме ──────────────────────────

/** Данные превью одного эпизода */
export interface EpisodePreviewData {
  /** CID'ы thumbnails (320px WebP) для hover cycling */
  thumbnailCids: string[]
  /** CID'ы скриншотов (1280px) для лайтбокса */
  screenshotCids: string[]
}

/** Все данные манифеста для детальной страницы */
export interface AnimeManifestData {
  /** Основной манифест */
  manifest: AnimeManifest
  /** Связи с другими аниме (если есть) */
  relations: AnimeManifestRelation[]
  /** Граф франшизы (если есть) */
  franchiseGraph: FranchiseGraphDocument | null
  /** Превью эпизодов: Map<episodeNumber, EpisodePreviewData> */
  previewMap: Map<number, EpisodePreviewData>
}

// ─── Публичные функции ──────────────────────────────────────────────

/**
 * Загрузить манифест аниме из директории по directoryCid.
 */
export async function loadAnimeManifest(directoryCid: string): Promise<AnimeManifest> {
  const gateway = getGateway()
  return fetchIpfsJson<AnimeManifest>(`${gateway}/ipfs/${directoryCid}/manifest.json`)
}

/**
 * Загрузить все данные манифеста для детальной страницы аниме.
 * Параллельная загрузка: manifest, relations, franchise, previews.
 */
export async function loadAnimeManifestData(directoryCid: string): Promise<AnimeManifestData> {
  // Шаг 1: загрузить основной манифест
  const manifest = await loadAnimeManifest(directoryCid)

  // Шаг 2: параллельная загрузка вложенных документов
  const [relationsDoc, franchiseGraph, previewsDoc] = await Promise.all([
    manifest.relationsCid ? fetchIpfsJsonSafe<RelationsDocument>(getIpfsUrl(manifest.relationsCid)) : null,
    manifest.franchiseGraphCid
      ? fetchIpfsJsonSafe<FranchiseGraphDocument>(getIpfsUrl(manifest.franchiseGraphCid))
      : null,
    manifest.episodePreviewsCid
      ? fetchIpfsJsonSafe<EpisodePreviewsDocument>(getIpfsUrl(manifest.episodePreviewsCid))
      : null,
  ])

  // Превью: все thumbnails и screenshots каждого эпизода
  const previewMap = new Map<number, EpisodePreviewData>()
  if (previewsDoc?.previews) {
    for (const ep of previewsDoc.previews) {
      if (ep.thumbnailCids.length > 0 || ep.screenshotCids?.length > 0) {
        previewMap.set(ep.number, {
          thumbnailCids: ep.thumbnailCids,
          screenshotCids: ep.screenshotCids ?? [],
        })
      }
    }
  }

  return {
    manifest,
    relations: relationsDoc?.relations ?? [],
    franchiseGraph: franchiseGraph ?? null,
    previewMap,
  }
}

/**
 * Загрузить эпизоды из манифеста (v2: episodesCid, v1: inline).
 */
export async function loadEpisodes(manifest: AnimeManifest) {
  if (manifest.episodesCid) {
    const doc = await fetchIpfsJsonSafe<EpisodesDocument>(getIpfsUrl(manifest.episodesCid))
    return doc?.episodes ?? []
  }
  return manifest.episodes ?? []
}
