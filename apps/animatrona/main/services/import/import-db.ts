/**
 * ImportDbService — прямые Prisma вызовы для import-service
 *
 * Заменяет 13 TanStack Query мутаций из renderer.
 * Работает в main process через singleton Prisma client.
 */

import type { Prisma } from '../../../renderer/src/generated/prisma'
import { prisma } from '../../utils/db'
import { createModuleLogger } from '../../utils/logger'

const log = createModuleLogger('ImportDB')

// === Anime ===

export async function upsertAnime(data: {
  name: string
  originalName?: string | null
  nameEn?: string | null
  year?: number | null
  status: string
  shikimoriId: number
  posterId?: string
  folderPath: string
  episodeCount: number
  rating?: number | null
  isBdRemux?: boolean
  rutrackerUrl?: string | null
  synonyms?: string | null
}) {
  return prisma.anime.upsert({
    where: { shikimoriId: data.shikimoriId },
    create: {
      name: data.name,
      originalName: data.originalName ?? null,
      nameEn: data.nameEn ?? null,
      year: data.year ?? null,
      status: data.status as Prisma.AnimeCreateInput['status'],
      shikimoriId: data.shikimoriId,
      posterId: data.posterId ?? null,
      folderPath: data.folderPath,
      episodeCount: data.episodeCount,
      rating: data.rating ?? null,
      isBdRemux: data.isBdRemux ?? false,
      rutrackerUrl: data.rutrackerUrl ?? null,
      synonyms: data.synonyms ?? null,
    },
    update: {
      name: data.name,
      originalName: data.originalName ?? undefined,
      nameEn: data.nameEn ?? undefined,
      year: data.year ?? undefined,
      status: data.status as Prisma.AnimeUpdateInput['status'],
      posterId: data.posterId ?? undefined,
      folderPath: data.folderPath,
      episodeCount: data.episodeCount,
      rating: data.rating ?? undefined,
      isBdRemux: data.isBdRemux ?? undefined,
      rutrackerUrl: data.rutrackerUrl ?? undefined,
      synonyms: data.synonyms ?? undefined,
    },
  })
}

export async function updateAnime(id: string, data: Prisma.AnimeUpdateInput) {
  return prisma.anime.update({ where: { id }, data })
}

export async function deleteAnime(id: string) {
  return prisma.anime.delete({ where: { id } })
}

// === Season ===

export async function upsertSeason(data: { animeId: string; number: number; name: string; type: string }) {
  return prisma.season.upsert({
    where: {
      animeId_number: { animeId: data.animeId, number: data.number },
    },
    create: {
      animeId: data.animeId,
      number: data.number,
      name: data.name,
      type: data.type as Prisma.SeasonCreateInput['type'],
    },
    update: {
      name: data.name,
      type: data.type as Prisma.SeasonUpdateInput['type'],
    },
  })
}

// === Episode ===

export async function upsertEpisode(data: {
  animeId: string
  seasonId?: string | null
  number: number
  name?: string
  folderPath?: string
  durationMs?: number
  videoWidth?: number
  videoHeight?: number
  videoBitDepth?: number
}) {
  return prisma.episode.upsert({
    where: {
      animeId_number: {
        animeId: data.animeId,
        number: data.number,
      },
    },
    create: {
      animeId: data.animeId,
      seasonId: data.seasonId ?? null,
      number: data.number,
      name: data.name ?? null,
      folderPath: data.folderPath ?? null,
      durationMs: data.durationMs ?? null,
      videoWidth: data.videoWidth ?? null,
      videoHeight: data.videoHeight ?? null,
      videoBitDepth: data.videoBitDepth ?? null,
    },
    update: {
      name: data.name ?? undefined,
      folderPath: data.folderPath ?? undefined,
      durationMs: data.durationMs ?? undefined,
      videoWidth: data.videoWidth ?? undefined,
      videoHeight: data.videoHeight ?? undefined,
      videoBitDepth: data.videoBitDepth ?? undefined,
    },
  })
}

export async function updateEpisode(id: string, data: Prisma.EpisodeUpdateInput) {
  return prisma.episode.update({ where: { id }, data })
}

/** Найти эпизод по номеру в аниме (использует compound unique index) */
export async function findEpisodeByNumber(animeId: string, number: number) {
  return prisma.episode.findUnique({ where: { animeId_number: { animeId, number } } })
}

/** Удалить все треки эпизода (аудио + субтитры с каскадом шрифтов) */
export async function deleteEpisodeTracks(episodeId: string) {
  await prisma.audioTrack.deleteMany({ where: { episodeId } })
  await prisma.subtitleTrack.deleteMany({ where: { episodeId } })
}

/** Найти первый сезон аниме */
export async function findFirstSeason(animeId: string) {
  return prisma.season.findFirst({ where: { animeId } })
}

/** Найти аниме по shikimoriId (использует unique index) */
export async function findAnimeByShikimoriId(shikimoriId: number) {
  return prisma.anime.findUnique({
    where: { shikimoriId },
    select: { posterId: true, posterCid: true, poster: { select: { id: true, cid: true } } },
  })
}

// === AudioTrack ===

export async function createAudioTrack(data: {
  episodeId: string
  streamIndex: number
  language: string
  title?: string
  codec: string
  channels: string
  bitrate?: number | null
  isDefault: boolean
  dubGroup?: string
}) {
  return prisma.audioTrack.create({
    data: {
      episodeId: data.episodeId,
      streamIndex: data.streamIndex,
      language: data.language,
      title: data.title ?? null,
      codec: data.codec,
      channels: data.channels,
      bitrate: data.bitrate ?? null,
      isDefault: data.isDefault,
      dubGroup: data.dubGroup ?? null,
    },
  })
}

export async function updateAudioTrack(id: string, data: Prisma.AudioTrackUpdateInput) {
  return prisma.audioTrack.update({ where: { id }, data })
}

// === SubtitleTrack ===

export async function createSubtitleTrack(data: {
  episodeId: string
  streamIndex: number
  language: string
  title?: string
  format: string
  isDefault: boolean
  fileCid?: string
  ipfsSize?: number
  dubGroup?: string
  subtitleType?: string
}) {
  return prisma.subtitleTrack.create({
    data: {
      episodeId: data.episodeId,
      streamIndex: data.streamIndex,
      language: data.language,
      title: data.title ?? null,
      format: data.format,
      isDefault: data.isDefault,
      fileCid: data.fileCid ?? null,
      ipfsSize: data.ipfsSize ?? null,
      dubGroup: data.dubGroup ?? null,
      subtitleType: data.subtitleType ?? 'full',
    },
  })
}

// === SubtitleFont ===

export async function createSubtitleFont(data: {
  subtitleTrackId: string
  fontName: string
  fileExt: string
  fileCid?: string
  ipfsSize?: number
}) {
  return prisma.subtitleFont.create({
    data: {
      subtitleTrackId: data.subtitleTrackId,
      fontName: data.fontName,
      fileExt: data.fileExt,
      fileCid: data.fileCid ?? null,
      ipfsSize: data.ipfsSize ?? null,
    },
  })
}

// === Franchise ===

export async function upsertFranchise(rootShikimoriId: number, name: string) {
  return prisma.franchise.upsert({
    where: { rootShikimoriId },
    create: { rootShikimoriId, name },
    update: { name },
  })
}

// === File (постеры, обложки) ===

export async function upsertFile(data: {
  filename: string
  mimeType: string
  size: number
  width?: number | null
  height?: number | null
  blurDataURL?: string | null
  category: string
  source: string
  cid?: string
}) {
  // Если CID уже существует — обновляем запись (повторный импорт того же файла)
  if (data.cid) {
    return prisma.file.upsert({
      where: { cid: data.cid },
      create: {
        filename: data.filename,
        mimeType: data.mimeType,
        size: data.size,
        width: data.width ?? null,
        height: data.height ?? null,
        blurDataURL: data.blurDataURL ?? null,
        category: data.category as Prisma.FileCreateInput['category'],
        source: data.source,
        cid: data.cid,
      },
      update: {
        filename: data.filename,
        size: data.size,
        width: data.width ?? null,
        height: data.height ?? null,
        blurDataURL: data.blurDataURL ?? null,
      },
    })
  }

  return prisma.file.create({
    data: {
      filename: data.filename,
      mimeType: data.mimeType,
      size: data.size,
      width: data.width ?? null,
      height: data.height ?? null,
      blurDataURL: data.blurDataURL ?? null,
      category: data.category as Prisma.FileCreateInput['category'],
      source: data.source,
      cid: null,
    },
  })
}

// === Запросы ===

export async function findManyAudioTracks(episodeId: string) {
  return prisma.audioTrack.findMany({
    where: { episodeId },
    select: { streamIndex: true, codec: true, channels: true, transcodedCid: true, ipfsSize: true },
  })
}

/** Полные данные аудиодорожек для rebuildManifestTracksFromFile */
export async function findAudioTracksForManifest(episodeId: string) {
  return prisma.audioTrack.findMany({
    where: { episodeId },
    select: {
      streamIndex: true,
      language: true,
      title: true,
      codec: true,
      channels: true,
      bitrate: true,
      isDefault: true,
      dubGroup: true,
      transcodedCid: true,
      ipfsSize: true,
    },
  })
}

export async function findManySubtitleTracks(episodeId: string) {
  return prisma.subtitleTrack.findMany({
    where: { episodeId },
    select: { streamIndex: true, fileCid: true, ipfsSize: true },
  })
}

/** Полные данные субтитров для rebuildManifestTracksFromFile */
export async function findSubtitleTracksForManifest(episodeId: string) {
  return prisma.subtitleTrack.findMany({
    where: { episodeId },
    select: {
      streamIndex: true,
      language: true,
      title: true,
      format: true,
      isDefault: true,
      dubGroup: true,
      fileCid: true,
      ipfsSize: true,
      fonts: {
        select: {
          fontName: true,
          fileCid: true,
          fileExt: true,
          ipfsSize: true,
        },
      },
    },
  })
}

export async function findManyEpisodes(animeId: string) {
  return prisma.episode.findMany({
    where: { animeId },
    orderBy: { number: 'asc' },
    select: { id: true, number: true, manifestCid: true },
  })
}

export async function findEncodingProfile(profileId: string) {
  return prisma.encodingProfile.findUnique({ where: { id: profileId } })
}

export async function getDefaultEncodingProfile() {
  return prisma.encodingProfile.findFirst({ where: { isDefault: true } })
}

/**
 * Сохранить жанры и темы для аниме
 */
export async function saveGenresAndThemes(
  animeId: string,
  genres: Array<{ id: string; name: string; russian: string; kind: 'genre' | 'theme' }>
) {
  // Разделяем на жанры и темы
  const genreItems = genres.filter((g) => g.kind === 'genre')
  const themeItems = genres.filter((g) => g.kind === 'theme')

  // Upsert жанры
  for (const g of genreItems) {
    const genre = await prisma.genre.upsert({
      where: { name: g.name },
      create: { name: g.name, russian: g.russian },
      update: { russian: g.russian },
    })
    await prisma.genreOnAnime.upsert({
      where: { animeId_genreId: { animeId, genreId: genre.id } },
      create: { animeId, genreId: genre.id },
      update: {},
    })
  }

  // Upsert темы
  for (const t of themeItems) {
    const theme = await prisma.theme.upsert({
      where: { name: t.name },
      create: { name: t.name, russian: t.russian },
      update: { russian: t.russian },
    })
    await prisma.themeOnAnime.upsert({
      where: { animeId_themeId: { animeId, themeId: theme.id } },
      create: { animeId, themeId: theme.id },
      update: {},
    })
  }

  log.info('Жанры и темы сохранены', { animeId, genres: genreItems.length, themes: themeItems.length })
}

/**
 * Синхронизировать связи аниме (франшизы, сиквелы)
 */
export async function syncAnimeRelations(
  animeId: string,
  relations: Array<{ targetShikimoriId: number; relationKind: string }>
) {
  for (const rel of relations) {
    // Ищем целевое аниме по shikimoriId
    const targetAnime = await prisma.anime.findUnique({
      where: { shikimoriId: rel.targetShikimoriId },
      select: { id: true },
    })

    if (targetAnime) {
      await prisma.animeRelation.upsert({
        where: {
          sourceAnimeId_targetAnimeId: {
            sourceAnimeId: animeId,
            targetAnimeId: targetAnime.id,
          },
        },
        create: {
          sourceAnimeId: animeId,
          targetAnimeId: targetAnime.id,
          kind: rel.relationKind as Prisma.AnimeRelationCreateInput['kind'],
        },
        update: {
          kind: rel.relationKind as Prisma.AnimeRelationUpdateInput['kind'],
        },
      })
    }
  }

  log.info('Связи синхронизированы', { animeId, count: relations.length })
}
