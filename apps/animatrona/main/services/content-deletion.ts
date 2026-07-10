/**
 * Content Deletion — Удаление контента аниме из IPFS
 *
 * Собирает все CID аниме, проверяет переиспользование и удаляет из IPFS.
 */

import { CID } from 'multiformats/cid'

import type { EpisodeManifest } from '../../shared/types/manifest'
import { prisma } from '../utils/db'
import { createModuleLogger } from '../utils/logger'
import { isSafeToUnpinLocally } from './ipfs/pin-status-service'
import { cat } from './ipfs/unixfs-service'
import { getKuboService } from './kubo'

const log = createModuleLogger('ContentDeletion')

/**
 * Результат удаления контента аниме из IPFS
 */
export interface DeleteAnimeContentResult {
  /** Количество удалённых CID */
  deletedCids: number
  /** Список CID которые были удалены */
  cids: string[]
  /** CID пропущенные (используются другими аниме или ещё не на пинерах) */
  skippedCids: number
  /** CID пропущенные из-за того что не запинены на удалённых пинерах */
  unsafeCids?: number
}

/**
 * Опции для deleteAnimeContent
 */
export interface DeleteAnimeContentOptions {
  /**
   * Требовать подтверждения удалённого пинирования перед локальным unpin.
   * true  = пропускать CID со статусом LOCAL_ONLY/PIN_QUEUED (безопасно для разгрузки диска)
   * false = удалять всё (при полном удалении аниме из библиотеки)
   * По умолчанию: false
   */
  requireRemotePin?: boolean
}

/**
 * Удалить контент конкретного аниме из IPFS
 *
 * Собирает ВСЕ CID аниме (видео, аудио, субтитры, шрифты, скриншоты, thumbnails, постер).
 * Перед удалением проверяет — не используется ли CID другими аниме (особенно важно для шрифтов).
 * Вызывать ПЕРЕД удалением аниме из БД!
 *
 * @param animeId ID аниме
 * @param options Опции удаления
 */
export async function deleteAnimeContent(
  animeId: string,
  options: DeleteAnimeContentOptions = {}
): Promise<DeleteAnimeContentResult> {
  log.info('Удаление контента аниме из IPFS', { animeId })

  // Получаем ВСЕ CID аниме из БД
  const anime = await prisma.anime.findUnique({
    where: { id: animeId },
    select: {
      name: true,
      animeInfoCid: true,
      directoryCid: true,
      poster: {
        select: { cid: true },
      },
      episodes: {
        select: {
          id: true,
          transcodedCid: true,
          manifestCid: true,
          thumbnailCids: true,
          screenshotCids: true,
          audioTracks: {
            select: { transcodedCid: true },
          },
          subtitleTracks: {
            select: {
              fileCid: true,
              fonts: {
                select: { fileCid: true },
              },
            },
          },
        },
      },
    },
  })

  if (!anime) {
    log.warn('Аниме не найдено', { animeId })
    return { deletedCids: 0, cids: [], skippedCids: 0 }
  }

  // Собираем все CID
  const allCids: string[] = []

  // CID аниме верхнего уровня
  if (anime.animeInfoCid) {
    allCids.push(anime.animeInfoCid)
  }
  if (anime.directoryCid) {
    allCids.push(anime.directoryCid)
  }

  // CID постера
  if (anime.poster?.cid) {
    allCids.push(anime.poster.cid)
  }

  // CID эпизодов и связанного контента
  for (const ep of anime.episodes) {
    // Видео
    if (ep.transcodedCid) {
      allCids.push(ep.transcodedCid)
    }
    if (ep.manifestCid) {
      allCids.push(ep.manifestCid)

      // Читаем манифест из IPFS для извлечения CID вложенных документов
      try {
        const manifestBuf = await cat(ep.manifestCid)
        const manifest: EpisodeManifest = JSON.parse(manifestBuf.toString('utf-8'))
        if (manifest.chaptersCid) {
          allCids.push(manifest.chaptersCid)
        }
        if (manifest.encodingCid) {
          allCids.push(manifest.encodingCid)
        }
        if (manifest.thumbnailsCid) {
          allCids.push(manifest.thumbnailsCid)
        }
      } catch {
        log.warn('Не удалось прочитать манифест для извлечения вложенных CID', { episodeId: ep.id })
      }
    }

    // Thumbnails (JSON массив)
    if (ep.thumbnailCids) {
      try {
        const thumbs = JSON.parse(ep.thumbnailCids) as string[]
        allCids.push(...thumbs)
      } catch {
        /* игнорируем ошибки парсинга */
      }
    }

    // Screenshots (JSON массив)
    if (ep.screenshotCids) {
      try {
        const screens = JSON.parse(ep.screenshotCids) as string[]
        allCids.push(...screens)
      } catch {
        /* игнорируем ошибки парсинга */
      }
    }

    // Аудиодорожки
    for (const audio of ep.audioTracks) {
      if (audio.transcodedCid) {
        allCids.push(audio.transcodedCid)
      }
    }

    // Субтитры и шрифты
    for (const sub of ep.subtitleTracks) {
      if (sub.fileCid) {
        allCids.push(sub.fileCid)
      }
      for (const font of sub.fonts) {
        if (font.fileCid) {
          allCids.push(font.fileCid)
        }
      }
    }
  }

  // Дополнительно: обходим directoryCid рекурсивно для сбора CID «на лету»
  // (например updatedManifestCid из двухпроходной сборки buildAnimeDirectory,
  // который не хранится в БД напрямую)
  if (anime.directoryCid) {
    const dirCids = await collectDirectoryCids(anime.directoryCid)
    allCids.push(...dirCids)
    log.debug('CID из directoryCid (ls)', { count: dirCids.length })
  }

  // Убираем дубликаты
  const uniqueCids = [...new Set(allCids)]

  if (uniqueCids.length === 0) {
    log.info('Нет CID для удаления', { animeId, animeName: anime.name })
    return { deletedCids: 0, cids: [], skippedCids: 0 }
  }

  log.info('Собрано CID для проверки', { animeId, animeName: anime.name, count: uniqueCids.length })

  // Проверяем каждый CID — используется ли в других аниме и безопасно ли удалять
  const cidsToDelete: string[] = []
  let skippedCids = 0
  let unsafeCids = 0

  for (const cid of uniqueCids) {
    const isUsedElsewhere = await isCidUsedByOtherAnime(cid, animeId)
    if (isUsedElsewhere) {
      log.debug('CID используется другим аниме, пропускаем', { cid })
      skippedCids++
      continue
    }

    // Если требуется подтверждение удалённого пина — проверяем статус
    if (options.requireRemotePin) {
      const safe = await isSafeToUnpinLocally(cid)
      if (!safe) {
        log.debug('CID ещё не на удалённых пинерах, пропускаем', { cid })
        unsafeCids++
        continue
      }
    }

    cidsToDelete.push(cid)
  }

  if (cidsToDelete.length === 0) {
    log.info('Нет CID для удаления', { animeId, animeName: anime.name, skippedCids, unsafeCids })
    return { deletedCids: 0, cids: [], skippedCids, unsafeCids }
  }

  log.info('CID для удаления', { count: cidsToDelete.length, skipped: skippedCids })

  // Открепляем из Kubo напрямую (быстрее чем через PinManager по одному)
  const { CID } = await import('multiformats/cid')
  const client = getKuboService().getClientOrNull()

  if (client) {
    for (const cidStr of cidsToDelete) {
      try {
        await client.pin.rm(CID.parse(cidStr))
      } catch {
        // "not pinned" — не ошибка
      }
    }
    log.debug('CID откреплены из Kubo', { count: cidsToDelete.length })
  }

  // Также чистим PinManager JSON (если там что-то было)
  try {
    const { getPinManager } = await import('./ipfs')
    const pinManager = getPinManager()
    for (const cidStr of cidsToDelete) {
      pinManager['pins'].delete(cidStr)
    }
    await pinManager['save']()
  } catch {
    // Не критично
  }

  log.info('Контент аниме удалён из IPFS', {
    animeId,
    animeName: anime.name,
    deletedCids: cidsToDelete.length,
    skippedCids,
  })

  return { deletedCids: cidsToDelete.length, cids: cidsToDelete, skippedCids, unsafeCids }
}

/**
 * Обойти IPFS-директорию рекурсивно и собрать все CID внутри
 *
 * Используется для гарантированного аспина всего содержимого directoryCid,
 * включая CID созданные «на лету» (например, updatedManifestCid из двухпроходной
 * сборки buildAnimeDirectory), которые не хранятся в БД напрямую.
 */
async function collectDirectoryCids(dirCid: string): Promise<string[]> {
  const client = getKuboService().getClientOrNull()
  if (!client) {
    return []
  }

  const cids: string[] = []

  async function walk(cid: string): Promise<void> {
    cids.push(cid)
    try {
      for await (const entry of client.ls(CID.parse(cid))) {
        if (entry.type === 'dir') {
          await walk(entry.cid.toString())
        } else {
          cids.push(entry.cid.toString())
        }
      }
    } catch {
      // Не директория или недоступна — пропускаем
    }
  }

  await walk(dirCid)
  return cids
}

/**
 * Проверить, используется ли CID в других аниме (кроме указанного)
 *
 * Проверяет все таблицы с CID: Anime (posterCid), Episode, AudioTrack, SubtitleTrack, SubtitleFont
 */
async function isCidUsedByOtherAnime(cid: string, excludeAnimeId: string): Promise<boolean> {
  // Проверяем Anime (постеры)
  const posterUsage = await prisma.anime.count({
    where: {
      posterCid: cid,
      id: { not: excludeAnimeId },
    },
  })
  if (posterUsage > 0) {
    return true
  }

  // Проверяем Episode (видео, манифест)
  const episodeUsage = await prisma.episode.count({
    where: {
      OR: [
        { transcodedCid: cid },
        { manifestCid: cid },
        { thumbnailCids: { contains: cid } },
        { screenshotCids: { contains: cid } },
      ],
      anime: { id: { not: excludeAnimeId } },
    },
  })
  if (episodeUsage > 0) {
    return true
  }

  // Проверяем AudioTrack
  const audioUsage = await prisma.audioTrack.count({
    where: {
      transcodedCid: cid,
      episode: { anime: { id: { not: excludeAnimeId } } },
    },
  })
  if (audioUsage > 0) {
    return true
  }

  // Проверяем SubtitleTrack
  const subtitleUsage = await prisma.subtitleTrack.count({
    where: {
      fileCid: cid,
      episode: { anime: { id: { not: excludeAnimeId } } },
    },
  })
  if (subtitleUsage > 0) {
    return true
  }

  // Проверяем SubtitleFont (самое важное — шрифты часто переиспользуются)
  const fontUsage = await prisma.subtitleFont.count({
    where: {
      fileCid: cid,
      subtitleTrack: { episode: { anime: { id: { not: excludeAnimeId } } } },
    },
  })
  if (fontUsage > 0) {
    return true
  }

  return false
}

/**
 * Открепить контент аниме из локального Kubo (не удаляя из БД)
 *
 * Используется для «освобождения места» — аниме остаётся в библиотеке,
 * но помечается как pinnedLocally = false. Контент доступен через удалённые пиры.
 *
 * @param animeId ID аниме
 */
export async function unpinAnimeContent(animeId: string): Promise<DeleteAnimeContentResult> {
  log.info('Открепление контента аниме (Cloud Library)', { animeId })

  // requireRemotePin: true — не трогаем CID которые ещё не на удалённых пинерах.
  // Только PINNED_REMOTE CID будут откреплены локально — они доступны с пинеров.
  const result = await deleteAnimeContent(animeId, { requireRemotePin: true })

  if (result.unsafeCids && result.unsafeCids > 0) {
    log.warn('Часть CID не откреплена — ещё не на удалённых пинерах', {
      animeId,
      unsafeCids: result.unsafeCids,
    })
  }

  // Помечаем аниме как не закреплённое локально
  await prisma.anime.update({
    where: { id: animeId },
    data: { pinnedLocally: false },
  })

  log.info('Контент аниме откреплён', { animeId, deletedCids: result.deletedCids })
  return result
}

/**
 * Закрепить контент аниме в локальном Kubo (скачать с удалённых пиров)
 *
 * Обратная операция к unpinAnimeContent — собирает все CID аниме
 * и пинит их через getPinManager().pin(), затем ставит pinnedLocally = true.
 *
 * @param animeId ID аниме
 */
export async function repinAnimeContent(animeId: string): Promise<{ pinnedCids: number }> {
  log.info('Закрепление контента аниме (скачивание с пиров)', { animeId })

  // Получаем ВСЕ CID аниме из БД (тот же SELECT что в deleteAnimeContent)
  const anime = await prisma.anime.findUnique({
    where: { id: animeId },
    select: {
      name: true,
      animeInfoCid: true,
      directoryCid: true,
      poster: {
        select: { cid: true },
      },
      episodes: {
        select: {
          id: true,
          transcodedCid: true,
          manifestCid: true,
          thumbnailCids: true,
          screenshotCids: true,
          audioTracks: {
            select: { transcodedCid: true },
          },
          subtitleTracks: {
            select: {
              fileCid: true,
              fonts: {
                select: { fileCid: true },
              },
            },
          },
        },
      },
    },
  })

  if (!anime) {
    log.warn('Аниме не найдено', { animeId })
    return { pinnedCids: 0 }
  }

  // Собираем все CID (аналогично deleteAnimeContent)
  const allCids: string[] = []

  if (anime.animeInfoCid) {
    allCids.push(anime.animeInfoCid)
  }
  if (anime.directoryCid) {
    allCids.push(anime.directoryCid)
  }
  if (anime.poster?.cid) {
    allCids.push(anime.poster.cid)
  }

  for (const ep of anime.episodes) {
    if (ep.transcodedCid) {
      allCids.push(ep.transcodedCid)
    }
    if (ep.manifestCid) {
      allCids.push(ep.manifestCid)
      try {
        const manifestBuf = await cat(ep.manifestCid)
        const manifest: EpisodeManifest = JSON.parse(manifestBuf.toString('utf-8'))
        if (manifest.chaptersCid) {
          allCids.push(manifest.chaptersCid)
        }
        if (manifest.encodingCid) {
          allCids.push(manifest.encodingCid)
        }
        if (manifest.thumbnailsCid) {
          allCids.push(manifest.thumbnailsCid)
        }
      } catch {
        log.warn('Не удалось прочитать манифест для извлечения вложенных CID', { episodeId: ep.id })
      }
    }
    if (ep.thumbnailCids) {
      try {
        allCids.push(...(JSON.parse(ep.thumbnailCids) as string[]))
      } catch {
        /* ignore */
      }
    }
    if (ep.screenshotCids) {
      try {
        allCids.push(...(JSON.parse(ep.screenshotCids) as string[]))
      } catch {
        /* ignore */
      }
    }
    for (const audio of ep.audioTracks) {
      if (audio.transcodedCid) {
        allCids.push(audio.transcodedCid)
      }
    }
    for (const sub of ep.subtitleTracks) {
      if (sub.fileCid) {
        allCids.push(sub.fileCid)
      }
      for (const font of sub.fonts) {
        if (font.fileCid) {
          allCids.push(font.fileCid)
        }
      }
    }
  }

  // Дополнительно: обходим directoryCid рекурсивно — пинируем все вложенные CID
  if (anime.directoryCid) {
    const dirCids = await collectDirectoryCids(anime.directoryCid)
    allCids.push(...dirCids)
  }

  const uniqueCids = [...new Set(allCids)]

  if (uniqueCids.length === 0) {
    log.info('Нет CID для закрепления', { animeId, animeName: anime.name })
    await prisma.anime.update({ where: { id: animeId }, data: { pinnedLocally: true } })
    return { pinnedCids: 0 }
  }

  log.info('Закрепление CID', { animeId, animeName: anime.name, count: uniqueCids.length })

  // Пиним через PinManager
  const { getPinManager } = await import('./ipfs')
  const pinManager = getPinManager()
  let pinned = 0

  for (const cid of uniqueCids) {
    try {
      await pinManager.pin(cid, anime.name ?? undefined)
      pinned++
    } catch (error) {
      log.warn('Не удалось запинить CID', { cid, error: String(error) })
    }
  }

  // Помечаем аниме как закреплённое локально
  await prisma.anime.update({
    where: { id: animeId },
    data: { pinnedLocally: true },
  })

  log.info('Контент аниме закреплён', { animeId, pinnedCids: pinned, total: uniqueCids.length })
  return { pinnedCids: pinned }
}

/**
 * Очистить библиотеку — удалить все аниме из БД и контент из IPFS
 *
 * ВНИМАНИЕ: Удаляет ВСЕ данные из БД (аниме, эпизоды, треки, прогресс)
 * и ВСЕ данные из IPFS blockstore. Файлы на диске НЕ удаляются.
 */
export async function clearLibrary(): Promise<{ deletedCount: number; deletedBytes: number }> {
  log.warn('Очистка библиотеки — удаление всех аниме из БД и IPFS')

  // Считаем количество аниме перед удалением
  const count = await prisma.anime.count()

  // Удаляем все аниме (каскадно удалит episodes, tracks, etc.)
  await prisma.anime.deleteMany({})

  // Очищаем IPFS blockstore и PinManager
  const deletedBytes = 0
  try {
    const { getPinManager } = await import('./ipfs')
    const pinManager = getPinManager()
    await pinManager.clear()
    log.info('PinManager очищен')

    // После unpin блоки будут удалены Kubo через garbage collection
    // Для форсированной очистки можно вызвать: kuboService.getClient().repo.gc()
    const kuboService = getKuboService()
    if (kuboService.isRunning()) {
      const client = kuboService.getClient()
      if (client) {
        // Запускаем сборку мусора
        for await (const _result of client.repo.gc()) {
          // GC работает инкрементально
        }
        log.info('Kubo garbage collection завершена')
      }
    }
  } catch (error) {
    log.error('Ошибка очистки IPFS', { error: error instanceof Error ? error.message : String(error) })
    // Продолжаем — БД уже очищена
  }

  log.info('Библиотека очищена', { deletedCount: count, deletedBytes })
  return { deletedCount: count, deletedBytes }
}
