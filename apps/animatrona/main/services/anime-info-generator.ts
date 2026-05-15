/**
 * AnimeInfo Generator — Генерация и публикация AnimeInfo в IPFS
 *
 * AnimeInfo — неизменяемые метаданные аниме (название, жанры, студии, персонал).
 * CID AnimeInfo = каноничный идентификатор аниме.
 */

import type { ANIME_INFO_VERSION, AnimeInfo, GenerateAnimeInfoResult } from '../../shared/types/anime-info'
import type { AnimeManifestExternalIds, AnimeManifestGenre } from '../../shared/types/anime-manifest'
import { prisma } from '../utils/db'
import { createModuleLogger } from '../utils/logger'
import { addBytes } from './ipfs/unixfs-service'
import { getAnimeExtended, getAnimeRestData } from './shikimori'
import {
  extractExternalIds,
  mapCharacters,
  mapExternalLinks,
  mapStaff,
  mapStudios,
  mapVideos,
} from './shikimori-mapper'
import type { ShikimoriAnimeExtended } from './shikimori/types'

const log = createModuleLogger('AnimeInfoGenerator')

/**
 * Собрать объект AnimeInfo из загруженных данных
 *
 * Используется как в generateAnimeInfo() (standalone),
 * так и в generateAnimeManifest() (inline).
 */
export async function buildAnimeInfo(params: {
  name: string
  originalName?: string
  nameEn?: string
  synonyms?: string[]
  year?: number
  episodeCount?: number
  status?: string
  rating?: number
  licensor?: string
  nextEpisodeAt?: string
  genres: AnimeManifestGenre[]
  themes: AnimeManifestGenre[]
  externalIds: AnimeManifestExternalIds
  shikimoriData: ShikimoriAnimeExtended | null
  restSource: string | null
}): Promise<AnimeInfo> {
  const {
    name,
    originalName,
    nameEn,
    synonyms,
    year,
    episodeCount,
    status,
    rating,
    genres,
    themes,
    externalIds,
    shikimoriData,
    restSource,
  } = params

  const fandubbers = shikimoriData?.fandubbers?.length ? shikimoriData.fandubbers : undefined
  const fansubbers = shikimoriData?.fansubbers?.length ? shikimoriData.fansubbers : undefined

  return {
    version: 1 as typeof ANIME_INFO_VERSION,

    // Идентификация
    name,
    originalName,
    nameEn,
    synonyms: synonyms?.length ? synonyms : undefined,
    year,

    // Классификация
    kind: shikimoriData?.kind?.toUpperCase() ?? undefined,
    ageRating: shikimoriData?.rating ?? undefined,
    duration: shikimoriData?.duration ?? undefined,
    source: restSource?.toUpperCase() ?? undefined,
    genres:
      genres.length > 0
        ? genres
        : (shikimoriData?.genres
            ?.filter((g) => g.kind === 'genre')
            .map((g) => ({ name: g.name, nameRu: g.russian, id: parseInt(g.id, 10), slug: g.name })) ?? undefined),
    themes:
      themes.length > 0
        ? themes
        : (shikimoriData?.genres
            ?.filter((g) => g.kind === 'theme')
            .map((g) => ({ name: g.name, nameRu: g.russian, id: parseInt(g.id, 10) })) ?? undefined),

    // Статус и параметры
    episodeCount,
    status,
    rating,
    licensor:
      shikimoriData?.licenseNameRu ?? (shikimoriData?.licensors?.length ? shikimoriData.licensors[0] : undefined),
    nextEpisodeAt: shikimoriData?.nextEpisodeAt ?? undefined,

    // Описание
    description: shikimoriData?.description ?? undefined,

    // Производство
    studios: shikimoriData ? await mapStudios(shikimoriData) : undefined,
    staff: shikimoriData ? await mapStaff(shikimoriData) : undefined,
    characters: shikimoriData ? await mapCharacters(shikimoriData) : undefined,

    // Озвучка
    fandubbers,
    fansubbers,

    // Внешние ID
    externalIds,
    externalLinks: shikimoriData ? mapExternalLinks(shikimoriData) : undefined,

    // Видео материалы
    videos: shikimoriData ? mapVideos(shikimoriData) : undefined,
  }
}

/**
 * Генерировать AnimeInfo и опубликовать в IPFS
 *
 * AnimeInfo содержит неизменяемые метаданные аниме.
 * CID AnimeInfo = каноничный идентификатор аниме.
 *
 * @param animeId - ID аниме в БД
 * @returns Результат с CID AnimeInfo
 */
export async function generateAnimeInfo(animeId: string): Promise<GenerateAnimeInfoResult> {
  try {
    log.info('Генерация AnimeInfo', { animeId })

    // Загружаем данные аниме из БД
    const anime = await prisma.anime.findUnique({
      where: { id: animeId },
      include: {
        genres: { include: { genre: true } },
        themes: { include: { theme: true } },
      },
    })

    if (!anime) {
      return { success: false, error: 'Аниме не найдено' }
    }

    // Запрашиваем расширенные данные из Shikimori GraphQL API
    let shikimoriData: ShikimoriAnimeExtended | null = null
    if (anime.shikimoriId) {
      try {
        shikimoriData = await getAnimeExtended(anime.shikimoriId)
      } catch (error) {
        log.warn('Не удалось получить данные из Shikimori для AnimeInfo', {
          shikimoriId: anime.shikimoriId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Запрашиваем source через REST API
    let restSource: string | null = null
    if (anime.shikimoriId) {
      try {
        const restData = await getAnimeRestData(anime.shikimoriId)
        restSource = restData?.source ?? null
      } catch (error) {
        log.warn('Не удалось получить source из REST API', {
          shikimoriId: anime.shikimoriId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Собираем жанры и темы из БД
    const genres: AnimeManifestGenre[] = anime.genres.map((g) => ({
      name: g.genre.slug,
      nameRu: g.genre.name,
      id: g.genre.shikimoriId ?? undefined,
      slug: g.genre.slug,
    }))

    const themes: AnimeManifestGenre[] = anime.themes.map((t) => ({
      name: t.theme.name,
      nameRu: t.theme.nameRu ?? undefined,
      id: t.theme.shikimoriId ?? undefined,
    }))

    const externalIds = extractExternalIds(anime.shikimoriId, shikimoriData?.externalLinks)

    // Собираем AnimeInfo
    const animeInfo = await buildAnimeInfo({
      name: anime.name,
      originalName: anime.originalName ?? undefined,
      nameEn: anime.nameEn ?? undefined,
      synonyms: anime.synonyms ? JSON.parse(anime.synonyms) : undefined,
      year: anime.year ?? undefined,
      genres,
      themes,
      externalIds,
      shikimoriData,
      restSource,
    })

    // Публикуем в IPFS
    const animeInfoJson = JSON.stringify(animeInfo, null, 2)
    const animeInfoBuffer = Buffer.from(animeInfoJson, 'utf-8')
    // pin: false — animeInfoCid попадёт в directoryCid и будет защищён через indirect pin
    const animeInfoCid = await addBytes(animeInfoBuffer, { pin: false })

    log.info('AnimeInfo опубликован', {
      animeId,
      animeName: anime.name,
      animeInfoCid,
      kind: animeInfo.kind,
      source: animeInfo.source,
    })

    return { success: true, animeInfoCid, animeInfo }
  } catch (error) {
    log.error('Ошибка генерации AnimeInfo', {
      animeId,
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
