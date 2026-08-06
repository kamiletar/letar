/**
 * Хелперы для создания/обновления аниме и эпизодов.
 *
 * Извлечены из POST /api/anime для устранения дублирования логики
 * update metadata + пересоздание эпизодов.
 */

import type { extractAnimeMetadata } from './ipfs-resolver'

type AnimeMetadata = ReturnType<typeof extractAnimeMetadata>

/** Общие поля метаданных для update/create аниме */
export function buildAnimeMetadataFields(
  metadata: AnimeMetadata,
  payload: { directoryBlocks?: number; directorySize?: number },
) {
  return {
    title: metadata.title,
    titleOriginal: metadata.titleOriginal,
    description: metadata.description,
    coverUrl: metadata.coverUrl,
    year: metadata.year,
    studio: metadata.studio,
    genres: metadata.genres,
    shikimoriId: metadata.shikimoriId,
    malId: metadata.malId,
    anilistId: metadata.anilistId,
    ageRating: metadata.ageRating,
    directoryBlocks: metadata.directoryBlocks ?? payload.directoryBlocks,
    directorySize: metadata.directorySize
      ? BigInt(metadata.directorySize)
      : payload.directorySize !== undefined
      ? BigInt(payload.directorySize)
      : undefined,
  }
}

/** Пересоздать эпизоды аниме (deleteMany + createMany) */

export async function recreateEpisodes(db: any, animeId: string, episodes: AnimeMetadata['episodes']) {
  await db.animeEpisode.deleteMany({ where: { animeId } })
  await db.animeEpisode.createMany({
    data: episodes.map((ep: Record<string, unknown>) => ({ ...ep, animeId })),
  })
}
