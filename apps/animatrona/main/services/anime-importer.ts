/**
 * Anime Importer — Импорт аниме из IPFS манифеста
 *
 * Создаёт минимальные записи в БД для списка библиотеки.
 * Эпизоды создаются без локальных файлов — для стриминга из IPFS.
 */

import type { AnimeManifest, AnimeManifestEpisode } from '../../shared/types/anime-manifest'
import type { EpisodeManifest } from '../../shared/types/manifest'
import { prisma } from '../utils/db'
import { createModuleLogger } from '../utils/logger'
import {
  getAnimeInfoFromIpfs,
  getAnimeManifestFromIpfs,
  getEpisodePreviewsDocFromIpfs,
  getEpisodesDocFromIpfs,
  getFranchiseGraphDocFromIpfs,
  getRelationsDocFromIpfs,
} from './ipfs-document-reader'
import { cat } from './ipfs/unixfs-service'
import { upsertAnimeRelations } from './utils/anime-relation-upsert'

const log = createModuleLogger('AnimeImporter')

/** Создаёт эпизоды + аудио/субтитры/шрифты из EpisodesDocument для указанного аниме */
async function createEpisodesForAnime(animeId: string, episodes: AnimeManifestEpisode[]): Promise<void> {
  await prisma.episode.createMany({
    data: episodes.map((ep) => ({
      animeId,
      number: ep.number,
      manifestCid: ep.manifestCid,
      transcodedCid: ep.videoCid,
    })),
  })
  log.info('Эпизоды созданы', { animeId, count: episodes.length })

  const createdEpisodes = await prisma.episode.findMany({
    where: { animeId },
    select: { id: true, number: true, manifestCid: true },
  })

  for (const ep of createdEpisodes) {
    if (!ep.manifestCid) {
      continue
    }
    try {
      const manifestBuf = await cat(ep.manifestCid)
      const epManifest: EpisodeManifest = JSON.parse(manifestBuf.toString('utf-8'))

      const sortedAudio = [...epManifest.audioTracks].sort((a, b) => a.streamIndex - b.streamIndex)
      for (const track of sortedAudio) {
        if (!track.cid) {
          continue
        }
        await prisma.audioTrack.create({
          data: {
            episodeId: ep.id,
            streamIndex: track.streamIndex,
            language: track.language || 'und',
            title: track.title || null,
            dubGroup: track.dubGroup || null,
            codec: track.codec,
            channels: track.channels,
            bitrate: track.bitrate ?? null,
            isDefault: track.isDefault,
            transcodedCid: track.cid,
            ipfsSize: track.size ?? null,
          },
        })
      }

      const sortedSubs = [...epManifest.subtitleTracks].sort((a, b) => a.streamIndex - b.streamIndex)
      for (const sub of sortedSubs) {
        if (!sub.cid) {
          continue
        }
        const subtitleTrack = await prisma.subtitleTrack.create({
          data: {
            episodeId: ep.id,
            streamIndex: sub.streamIndex,
            language: sub.language || 'und',
            title: sub.title || null,
            dubGroup: sub.dubGroup || null,
            format: sub.format,
            isDefault: sub.isDefault,
            fileCid: sub.cid,
            ipfsSize: sub.size ?? null,
          },
        })
        if (sub.fonts?.length) {
          for (const font of sub.fonts) {
            await prisma.subtitleFont.create({
              data: {
                subtitleTrackId: subtitleTrack.id,
                fontName: font.name,
                fileExt: font.fileExt || 'ttf',
                fileCid: font.cid || null,
                ipfsSize: font.size ?? null,
              },
            })
          }
        }
      }

      if (epManifest.screenshotCids && epManifest.screenshotCids.length > 0) {
        await prisma.episode.update({
          where: { id: ep.id },
          data: { screenshotCids: JSON.stringify(epManifest.screenshotCids) },
        })
      }

      log.info('Дорожки созданы из манифеста', {
        episodeNumber: ep.number,
        audioTracks: epManifest.audioTracks.filter((t) => t.cid).length,
        subtitleTracks: epManifest.subtitleTracks.filter((t) => t.cid).length,
      })
    } catch (err) {
      log.warn('Не удалось создать дорожки из манифеста', {
        episodeId: ep.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

/**
 * Синхронизировать эпизоды аниме из IPFS манифеста
 *
 * Добавляет только новые эпизоды (которых нет в БД), не трогая существующие.
 * Используется для онгоингов и повторного импорта после неудачи.
 *
 * @param animeId - ID аниме в БД
 * @param directoryCid - Directory CID в IPFS (откуда читать manifest.json)
 * @returns { added, total } — добавлено новых, всего в манифесте
 */
export async function syncAnimeEpisodes(
  animeId: string,
  directoryCid: string
): Promise<{ added: number; total: number }> {
  log.info('Синхронизация эпизодов из IPFS', { animeId, directoryCid })

  // Получаем manifest.json из директории
  const { cat: catFn } = await import('./ipfs/unixfs-service')
  const manifestBuf = await catFn(`${directoryCid}/manifest.json`)
  const manifest = JSON.parse(manifestBuf.toString('utf-8')) as AnimeManifest

  if (!manifest.episodesCid) {
    log.warn('У манифеста нет episodesCid', { directoryCid })
    return { added: 0, total: 0 }
  }

  let episodes: AnimeManifestEpisode[] = []
  try {
    const episodesDoc = await getEpisodesDocFromIpfs(manifest.episodesCid)
    episodes = episodesDoc?.episodes ?? []
  } catch (err) {
    log.warn('Не удалось загрузить EpisodesDocument', {
      episodesCid: manifest.episodesCid,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  if (episodes.length === 0) {
    return { added: 0, total: 0 }
  }

  // Находим номера уже существующих эпизодов
  const existingEpisodes = await prisma.episode.findMany({
    where: { animeId },
    select: { number: true },
  })
  const existingNumbers = new Set(existingEpisodes.map((ep) => ep.number))

  const newEpisodes = episodes.filter((ep) => !existingNumbers.has(ep.number))

  if (newEpisodes.length === 0) {
    log.info('Новых эпизодов нет', { animeId, total: episodes.length })
    return { added: 0, total: episodes.length }
  }

  await createEpisodesForAnime(animeId, newEpisodes)

  // Обновляем episodeCount до актуального значения из манифеста
  await prisma.anime.update({
    where: { id: animeId },
    data: { episodeCount: episodes.length },
  })

  // Перепиним новый контент если аниме было запинено
  const anime = await prisma.anime.findUnique({ where: { id: animeId }, select: { pinnedLocally: true } })
  if (anime?.pinnedLocally) {
    try {
      const { repinAnimeContent } = await import('./content-deletion')
      await repinAnimeContent(animeId)
    } catch (pinErr) {
      log.warn('Не удалось закрепить новый контент', { error: pinErr })
    }
  }

  log.info('Синхронизация завершена', { animeId, added: newEpisodes.length, total: episodes.length })
  return { added: newEpisodes.length, total: episodes.length }
}

/**
 * Импортировать аниме из IPFS-директории
 *
 * Создаёт минимальные записи в БД для списка библиотеки.
 * Эпизоды создаются без локальных файлов — для стриминга из IPFS.
 *
 * @param inputCid - Directory CID в IPFS
 * @param options - Опции импорта
 * @param options.pin - Закрепить контент локально (скачать с пиров). По умолчанию false (облако)
 * @returns Результат импорта
 */
export async function importAnimeFromManifest(
  inputCid: string,
  options?: { pin?: boolean }
): Promise<{ success: boolean; animeId?: string; animeName?: string; episodeCount?: number; error?: string }> {
  const pin = options?.pin ?? false
  try {
    log.info('Импорт аниме из CID', { inputCid })

    const directoryCid = inputCid

    // 1. Получаем манифест из директории
    const manifest = await getAnimeManifestFromIpfs(`${directoryCid}/manifest.json`)
    if (!manifest) {
      return { success: false, error: 'Не удалось загрузить манифест из IPFS' }
    }

    // 2. Загружаем AnimeInfo и EpisodesDocument до проверки дублей — нужны для создания эпизодов
    const animeInfo = await getAnimeInfoFromIpfs(manifest.animeInfoCid)
    if (!animeInfo) {
      return { success: false, error: 'Не удалось загрузить AnimeInfo из IPFS' }
    }

    let episodes: AnimeManifestEpisode[] = []
    try {
      const episodesDoc = await getEpisodesDocFromIpfs(manifest.episodesCid)
      episodes = episodesDoc?.episodes ?? []
    } catch (err) {
      // Продолжаем без эпизодов — IPFS мог не отдать документ (ongoing-сериал, пиры не подключились)
      log.warn('Не удалось загрузить EpisodesDocument, эпизоды будут пустыми', {
        episodesCid: manifest.episodesCid,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    // 3. Проверяем нет ли уже такого аниме по directoryCid
    const existingByManifest = await prisma.anime.findFirst({
      where: { directoryCid },
      select: { id: true, name: true },
    })

    if (existingByManifest) {
      // Если в манифесте появились эпизоды, а в БД их нет — создаём (retry после неудачного первого импорта)
      if (episodes.length > 0) {
        const existingCount = await prisma.episode.count({ where: { animeId: existingByManifest.id } })
        if (existingCount === 0) {
          log.info('Аниме уже в БД, но эпизоды отсутствуют — добавляем', {
            animeId: existingByManifest.id,
            episodeCount: episodes.length,
          })
          await createEpisodesForAnime(existingByManifest.id, episodes)

          if (pin) {
            await prisma.anime.update({
              where: { id: existingByManifest.id },
              data: { pinnedLocally: true, episodeCount: episodes.length },
            })
            try {
              const { repinAnimeContent } = await import('./content-deletion')
              await repinAnimeContent(existingByManifest.id)
            } catch (pinErr) {
              log.warn('Не удалось закрепить контент', { error: pinErr })
            }
          } else {
            await prisma.anime.update({
              where: { id: existingByManifest.id },
              data: { episodeCount: episodes.length },
            })
          }

          return {
            success: true,
            animeId: existingByManifest.id,
            animeName: existingByManifest.name,
            episodeCount: episodes.length,
          }
        }
      }
      return {
        success: false,
        error: `Аниме уже импортировано: ${existingByManifest.name}`,
        animeId: existingByManifest.id,
      }
    }

    let animeId!: string
    let animeName!: string
    let isExisting = false

    // 4. Проверяем по shikimoriId — аниме могло быть импортировано с другим CID
    if (animeInfo.externalIds?.shikimori) {
      const existingByShikimori = await prisma.anime.findUnique({
        where: { shikimoriId: animeInfo.externalIds.shikimori },
        select: { id: true, name: true },
      })

      if (existingByShikimori) {
        await prisma.anime.update({
          where: { id: existingByShikimori.id },
          data: {
            directoryCid,
            animeInfoCid: manifest.animeInfoCid,
            pinnedLocally: pin,
            ...(animeInfo.ageRating && { ageRating: animeInfo.ageRating }),
            ...(manifest.posterCid && { posterCid: manifest.posterCid }),
            ...(episodes.length > 0 && { episodeCount: episodes.length }),
          },
        })
        log.info('Обновлён manifestCid у существующего аниме', {
          animeId: existingByShikimori.id,
          animeName: existingByShikimori.name,
        })
        animeId = existingByShikimori.id
        animeName = existingByShikimori.name
        isExisting = true

        // Создаём эпизоды если их нет (первый import мог пройти без эпизодов)
        if (episodes.length > 0) {
          const existingCount = await prisma.episode.count({ where: { animeId } })
          if (existingCount === 0) {
            await createEpisodesForAnime(animeId, episodes)
          }
        }
      }
    }

    // 5. Создаём аниме если не существует
    if (!isExisting) {
      const anime = await prisma.anime.create({
        data: {
          name: animeInfo.name,
          originalName: animeInfo.originalName,
          nameEn: animeInfo.nameEn,
          synonyms: animeInfo.synonyms ? JSON.stringify(animeInfo.synonyms) : null,
          year: animeInfo.year,
          status: (animeInfo.status as 'ONGOING' | 'COMPLETED' | 'ANNOUNCED') || 'COMPLETED',
          episodeCount: animeInfo.episodeCount || episodes.length,
          rating: animeInfo.rating,
          posterCid: manifest.posterCid,
          animeInfoCid: manifest.animeInfoCid,
          directoryCid,
          shikimoriId: animeInfo.externalIds?.shikimori,
          isBdRemux: manifest.isBdRemux,
          ageRating: animeInfo.ageRating,
          pinnedLocally: pin,
        },
      })

      animeId = anime.id
      animeName = anime.name

      log.info('Аниме создано', { animeId, animeName })

      if (manifest.posterCid) {
        cat(manifest.posterCid)
          .then(() => log.info('Постер предзагружен', { posterCid: manifest.posterCid }))
          .catch((err: unknown) => log.warn('Не удалось предзагрузить постер', { error: err }))
      }

      // Жанры
      if (animeInfo.genres && animeInfo.genres.length > 0) {
        for (const g of animeInfo.genres) {
          const genreSlug = g.slug ?? g.name
          const genre = await prisma.genre.upsert({
            where: { slug: genreSlug },
            update: { nameRu: g.nameRu ?? undefined },
            create: {
              name: g.nameRu ?? g.name,
              slug: genreSlug,
              nameRu: g.nameRu,
            },
          })
          await prisma.genreOnAnime.create({
            data: { animeId, genreId: genre.id },
          })
        }
      }

      // Темы
      if (animeInfo.themes && animeInfo.themes.length > 0) {
        for (const t of animeInfo.themes) {
          const theme = await prisma.theme.upsert({
            where: { name: t.name },
            update: { nameRu: t.nameRu ?? undefined },
            create: { name: t.name, nameRu: t.nameRu },
          })
          await prisma.themeOnAnime.create({
            data: { animeId, themeId: theme.id },
          })
        }
      }

      // Эпизоды
      if (episodes.length > 0) {
        await createEpisodesForAnime(animeId, episodes)
      }
    }

    // 6. Превью эпизодов (для обоих случаев)
    if (manifest.episodePreviewsCid) {
      try {
        const previewsDoc = await getEpisodePreviewsDocFromIpfs(manifest.episodePreviewsCid)
        if (previewsDoc && previewsDoc.previews.length > 0) {
          for (const preview of previewsDoc.previews) {
            await prisma.episode.updateMany({
              where: { animeId, number: preview.number },
              data: {
                thumbnailCids: JSON.stringify(preview.thumbnailCids),
                screenshotCids: JSON.stringify(preview.screenshotCids),
              },
            })
          }
          log.info('Превью эпизодов импортированы', { count: previewsDoc.previews.length })
        }
      } catch (error) {
        log.warn('Не удалось импортировать превью эпизодов', {
          episodePreviewsCid: manifest.episodePreviewsCid,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // 7. Франшиза
    if (manifest.franchiseGraphCid) {
      try {
        const franchiseDoc = await getFranchiseGraphDocFromIpfs(manifest.franchiseGraphCid)
        if (franchiseDoc) {
          const franchiseId = `franchise-${franchiseDoc.rootShikimoriId}`
          await prisma.franchise.upsert({
            where: { rootShikimoriId: franchiseDoc.rootShikimoriId },
            update: {
              graphCid: manifest.franchiseGraphCid,
              graphUpdatedAt: new Date(),
            },
            create: {
              id: franchiseId,
              name: franchiseDoc.name,
              rootShikimoriId: franchiseDoc.rootShikimoriId,
              graphCid: manifest.franchiseGraphCid,
              graphUpdatedAt: new Date(),
            },
          })

          await prisma.anime.update({
            where: { id: animeId },
            data: { franchiseId },
          })

          log.info('Франшиза импортирована', {
            franchiseId,
            name: franchiseDoc.name,
            nodeCount: franchiseDoc.nodes.length,
          })
        }
      } catch (error) {
        log.warn('Не удалось импортировать франшизу', {
          franchiseGraphCid: manifest.franchiseGraphCid,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // 8. Связи
    if (manifest.relationsCid) {
      try {
        const relationsDoc = await getRelationsDocFromIpfs(manifest.relationsCid)
        if (relationsDoc && relationsDoc.relations.length > 0) {
          await upsertAnimeRelations(prisma, animeId, relationsDoc.relations)
          log.info('Связи импортированы', { count: relationsDoc.relations.length })
        }
      } catch (error) {
        log.warn('Не удалось импортировать связи', {
          relationsCid: manifest.relationsCid,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Пиннинг контента если запрошено
    if (pin && animeId) {
      try {
        const { repinAnimeContent } = await import('./content-deletion')
        const pinResult = await repinAnimeContent(animeId)
        log.info('Контент закреплён после импорта', { animeId, pinnedCids: pinResult.pinnedCids })
      } catch (pinError) {
        log.warn('Не удалось закрепить контент после импорта', {
          animeId,
          error: pinError instanceof Error ? pinError.message : String(pinError),
        })
      }
    }

    log.info('Импорт завершён', {
      animeId,
      animeName,
      episodeCount: episodes.length,
      pinnedLocally: pin,
    })

    return {
      success: true,
      animeId,
      animeName,
      episodeCount: episodes.length,
    }
  } catch (error) {
    log.error('Ошибка импорта из манифеста', {
      inputCid,
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
