/**
 * IPFS Resolver — загрузка и парсинг данных аниме из IPFS
 *
 * По directoryCid загружает:
 * 1. manifest.json → AnimeManifest
 * 2. AnimeInfo (по animeInfoCid из манифеста)
 * 3. EpisodesDocument (по episodesCid из манифеста)
 *
 * Используется при публикации: Desktop отправляет только directoryCid,
 * трекер сам резолвит все метаданные через IPFS gateway.
 */

import type {
  AnimeInfo,
  AnimeManifest,
  AnimeManifestEpisode,
  EpisodesDocument,
  FranchiseGraphDocument,
} from '@letar/animatrona-types'
import { findWorkingGateway, getGateway, getIpfsUrl } from './ipfs'
import { fetchIpfsJson, fetchIpfsJsonSafe } from './ipfs-fetch'

/** Результат резолва аниме из IPFS-директории */
export interface ResolvedAnime {
  /** Распарсенный AnimeManifest */
  manifest: AnimeManifest
  /** AnimeInfo с метаданными (null для v1 манифестов без animeInfoCid) */
  animeInfo: AnimeInfo | null
  /** Список эпизодов */
  episodes: AnimeManifestEpisode[]
  /** CID постера (если есть) */
  posterCid?: string
}

/**
 * Загрузить и распарсить данные аниме из IPFS-директории
 *
 * @param directoryCid - CID корневой IPFS-директории аниме
 * @returns Распарсенные данные аниме
 * @throws Error если не удалось загрузить или распарсить данные
 *
 * @example
 * const resolved = await resolveAnimeFromDirectory('bafybeigdyrzt...')
 * console.log(resolved.animeInfo?.name) // "Наруто"
 * console.log(resolved.episodes.length) // 220
 */
export async function resolveAnimeFromDirectory(directoryCid: string): Promise<ResolvedAnime> {
  // Первая попытка — дефолтный gateway
  try {
    return await resolveWithGateway(directoryCid, getGateway())
  } catch (firstError) {
    // Вторая попытка — ищем рабочий gateway
    const workingGateway = await findWorkingGateway()
    if (!workingGateway) {
      throw new Error(
        `Не удалось загрузить данные из IPFS. Первая попытка: ${
          firstError instanceof Error ? firstError.message : String(firstError)
        }`,
        { cause: firstError },
      )
    }

    try {
      return await resolveWithGateway(directoryCid, workingGateway)
    } catch (secondError) {
      throw new Error(
        `Не удалось загрузить данные из IPFS после двух попыток. `
          + `Gateway 1: ${firstError instanceof Error ? firstError.message : String(firstError)}. `
          + `Gateway 2: ${secondError instanceof Error ? secondError.message : String(secondError)}`,
        { cause: secondError },
      )
    }
  }
}

/**
 * Резолв аниме через конкретный gateway
 */
async function resolveWithGateway(directoryCid: string, gateway: string): Promise<ResolvedAnime> {
  // 1. Загружаем manifest.json из директории
  const manifestUrl = `${gateway}/ipfs/${directoryCid}/manifest.json`
  const manifest = await fetchIpfsJson<AnimeManifest>(manifestUrl)

  if (!manifest.name) {
    throw new Error('Невалидный манифест: отсутствует поле name')
  }

  // 2. Загружаем AnimeInfo (если есть animeInfoCid — v2 формат)
  let animeInfo: AnimeInfo | null = null
  if (manifest.animeInfoCid) {
    const infoUrl = getIpfsUrl(manifest.animeInfoCid)
    animeInfo = await fetchIpfsJson<AnimeInfo>(infoUrl)
  }

  // 3. Загружаем эпизоды
  let episodes: AnimeManifestEpisode[] = []

  if (manifest.episodesCid) {
    // v2 формат: эпизоды в отдельном документе
    const epsDoc = await fetchIpfsJson<EpisodesDocument>(getIpfsUrl(manifest.episodesCid))
    episodes = epsDoc.episodes ?? []
  } else if (manifest.episodes) {
    // v1 legacy: эпизоды inline в манифесте
    episodes = manifest.episodes
  }

  return {
    manifest,
    animeInfo,
    episodes,
    posterCid: manifest.posterCid,
  }
}

/**
 * Извлечь метаданные аниме для сохранения в БД
 *
 * @param resolved - Результат resolveAnimeFromDirectory
 * @returns Объект с полями для Anime модели
 */
export function extractAnimeMetadata(resolved: ResolvedAnime) {
  const { manifest, animeInfo, episodes } = resolved

  return {
    // Название: приоритет AnimeInfo → manifest
    title: animeInfo?.name ?? manifest.name,
    titleOriginal: animeInfo?.originalName ?? manifest.originalName,
    description: animeInfo?.description ?? manifest.description,
    coverUrl: manifest.posterCid ? `ipfs://${manifest.posterCid}` : undefined,
    year: animeInfo?.year ?? manifest.year,
    // Первая студия
    studio: (animeInfo?.studios ?? manifest.studios)?.[0]?.name,
    // Жанры: приоритет русские названия
    genres: (animeInfo?.genres ?? manifest.genres)
      ?.map((g: { nameRu?: string; name: string }) => g.nameRu || g.name)
      .filter(Boolean) ?? [],
    // Внешние ID из externalIds (AnimeInfo приоритетнее manifest)
    shikimoriId: animeInfo?.externalIds?.shikimori ?? manifest.externalIds?.shikimori ?? null,
    malId: animeInfo?.externalIds?.mal ?? manifest.externalIds?.mal ?? null,
    anilistId: animeInfo?.externalIds?.anilist ?? manifest.externalIds?.anilist ?? null,
    // Возрастной рейтинг (из AnimeInfo → manifest → null)
    ageRating: animeInfo?.ageRating ?? manifest.ageRating ?? null,
    // Размер директории из manifest (двухпроходная сборка десктопа)
    directoryBlocks: manifest.directoryBlocks,
    directorySize: manifest.directorySize,
    // Эпизоды для создания в БД
    episodes: episodes.map((ep) => ({
      number: ep.number,
      title: ep.name,
      duration: ep.durationMs ? Math.round(ep.durationMs / 1000) : undefined,
      videoCid: ep.videoCid || ep.manifestCid,
    })),
  }
}

/**
 * Загрузить franchise graph из IPFS и вернуть rootShikimoriId как franchiseKey.
 * Возвращает null если franchiseGraphCid отсутствует или загрузка не удалась.
 */
export async function resolveFranchiseKey(manifest: AnimeManifest): Promise<string | null> {
  if (!manifest.franchiseGraphCid) {
    return null
  }
  const graph = await fetchIpfsJsonSafe<FranchiseGraphDocument>(getIpfsUrl(manifest.franchiseGraphCid))
  return graph?.rootShikimoriId ? String(graph.rootShikimoriId) : null
}

/** Связь из franchise graph */
export interface ResolvedRelation {
  targetShikimoriId: number
  relationKind: string
}

/**
 * Извлечь связи аниме из FranchiseGraphDocument в IPFS.
 * Возвращает массив связей где sourceId === shikimoriId текущего аниме.
 */
export async function resolveRelations(
  manifest: AnimeManifest,
  shikimoriId: number | null | undefined,
): Promise<ResolvedRelation[]> {
  if (!manifest.franchiseGraphCid || !shikimoriId) {
    return []
  }

  const graph = await fetchIpfsJsonSafe<FranchiseGraphDocument>(getIpfsUrl(manifest.franchiseGraphCid))
  if (!graph?.links) {
    return []
  }

  return graph.links
    .filter((link) => link.source_id === shikimoriId)
    .map((link) => ({
      targetShikimoriId: link.target_id,
      relationKind: link.relation ?? 'OTHER',
    }))
}
