/**
 * Episode Manifest Regeneration — Регенерация манифестов эпизодов
 *
 * Синхронизация EpisodeManifest'ов в IPFS с данными из БД.
 */

import os from 'node:os'

import type { EpisodeManifest } from '../../shared/types/manifest'
import { prisma } from '../utils/db'
import { hasSufficientDiskSpace, LOW_DISK_THRESHOLD_GB } from '../utils/disk-space'
import { createModuleLogger } from '../utils/logger'
import { updateAnimeManifest } from './anime-manifest-generator'
import { pinSubDocuments } from './ipfs/pin-sub-documents'
import { addBytes, cat } from './ipfs/unixfs-service'
import { rebuildManifestTracks } from './manifest-generator'

const log = createModuleLogger('EpisodeManifestRegen')

/** Общий Prisma select для аудио/субтитров эпизода (используется в обеих функциях) */
const EPISODE_TRACKS_SELECT = {
  audioTracks: {
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
    },
    orderBy: { streamIndex: 'asc' as const },
  },
  subtitleTracks: {
    select: {
      streamIndex: true,
      language: true,
      title: true,
      format: true,
      subtitleType: true,
      isDefault: true,
      dubGroup: true,
      fileCid: true,
      fonts: { select: { fontName: true, fileCid: true, fileExt: true } },
    },
    orderBy: { streamIndex: 'asc' as const },
  },
} as const

/**
 * Результат регенерации манифестов эпизодов
 */
export interface RegenerateManifestsResult {
  /** Всего эпизодов с манифестами */
  total: number
  /** Успешно обновлено */
  updated: number
  /** Пропущено (уже корректные) */
  skipped: number
  /** С ошибками */
  failed: number
  /** Список ошибок */
  errors: Array<{ episodeId: string; animeName: string; episodeNumber: number; error: string }>
  /** Затронутые аниме (для перегенерации AnimeManifest) */
  affectedAnimeIds: string[]
  /** Остановлено из-за нехватки места на диске (<30 ГБ свободно) */
  stoppedDueToLowDisk?: boolean
}

/**
 * Обновить EpisodeManifest'ы конкретного аниме + AnimeManifest + directoryCid
 *
 * Точечная операция для случаев когда изменились названия эпизодов или метаданные.
 * Обновляет info.episodeName в каждом EpisodeManifest, затем AnimeManifest и directoryCid.
 */
export async function regenerateAnimeEpisodeManifests(
  animeId: string,
  options?: {
    /** Пропустить пересборку AnimeManifest + directoryCid в конце.
     *  Используется когда caller сам управляет этим шагом (напр. делает Shikimori refresh перед сборкой). */
    skipDirectoryBuild?: boolean
  },
): Promise<{
  updated: number
  failed: number
}> {
  log.info('Точечная регенерация EpisodeManifest для аниме', { animeId })

  const episodes = await prisma.episode.findMany({
    where: { animeId, manifestCid: { not: null } },
    select: {
      id: true,
      number: true,
      name: true,
      manifestCid: true,
      transcodedCid: true,
      screenshotCids: true,
      metadataCid: true,
      anime: { select: { name: true } },
      ...EPISODE_TRACKS_SELECT,
    },
    orderBy: { number: 'asc' },
  })

  let updated = 0
  let failed = 0

  for (const ep of episodes) {
    try {
      const manifestBuf = await cat(ep.manifestCid!)
      const manifest = JSON.parse(manifestBuf.toString('utf-8'))

      let changed = false

      // Синхронизируем episodeName из БД
      const dbEpisodeName = ep.name || undefined
      if (manifest.info?.episodeName !== dbEpisodeName) {
        if (!manifest.info) {
          manifest.info = {}
        }
        manifest.info.episodeName = dbEpisodeName
        changed = true
      }

      // Синхронизируем video CID
      if (ep.transcodedCid && manifest.video?.cid !== ep.transcodedCid) {
        manifest.video.cid = ep.transcodedCid
        changed = true
      }

      // Синхронизируем screenshotCids из БД
      const dbScreenshotCids = ep.screenshotCids ? (JSON.parse(ep.screenshotCids) as string[]) : undefined
      if (JSON.stringify(manifest.screenshotCids) !== JSON.stringify(dbScreenshotCids)) {
        manifest.screenshotCids = dbScreenshotCids
        changed = true
      }

      // Синхронизируем metadataCid из БД
      if (ep.metadataCid && manifest.metadataCid !== ep.metadataCid) {
        manifest.metadataCid = ep.metadataCid
        changed = true
      }

      // Полная перестройка аудио/субтитров из БД (исправляет дубликаты у внешних дорожек)
      const tracksResult = rebuildManifestTracks(manifest, ep.audioTracks, ep.subtitleTracks)
      if (tracksResult.changed) {
        changed = true
      }

      if (!changed) {
        continue
      }

      manifest.generatedAt = new Date().toISOString()
      const newCid = await addBytes(Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'))
      await prisma.episode.update({ where: { id: ep.id }, data: { manifestCid: newCid } })

      // Recursive pin для EpisodeManifest и его суб-документов
      await pinSubDocuments([
        ['episodeManifestCid', newCid],
        ['chaptersCid', manifest.chaptersCid],
        ['thumbnailsCid', manifest.thumbnailsCid],
        ['encodingCid', manifest.encodingCid],
      ])

      updated++
    } catch (error) {
      failed++
      log.error('Ошибка обновления EpisodeManifest', {
        episodeId: ep.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (!options?.skipDirectoryBuild) {
    // Обновляем AnimeManifest + directoryCid (двухпроходная как при импорте)
    try {
      // Проход 1: обновить AnimeManifest (manifestCid)
      await updateAnimeManifest(animeId)

      // Проход 2: пересобрать IPFS-директорию (directoryCid) — включает новый manifestCid
      const { buildAnimeDirectory } = await import('./ipfs/anime-directory-builder')
      const { directoryCid } = await buildAnimeDirectory(animeId)
      await prisma.anime.update({
        where: { id: animeId },
        data: { directoryCid },
      })
      log.info('IPFS-директория пересобрана', { animeId, directoryCid })
    } catch (error) {
      log.error('Ошибка обновления AnimeManifest/directoryCid', {
        animeId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  log.info('Точечная регенерация завершена', { animeId, updated, failed })
  return { updated, failed }
}

/**
 * Регенерировать ВСЕ EpisodeManifest'ы в IPFS
 *
 * Читает каждый манифест из IPFS, заменяет локальные пути на CID'ы из БД,
 * загружает обновлённый манифест обратно в IPFS и обновляет manifestCid в БД.
 *
 * После обновления всех эпизодов — перегенерирует AnimeManifest'ы и переиздаёт библиотеку.
 */
export async function regenerateAllEpisodeManifests(options?: {
  /** Callback прогресса */
  onProgress?: (current: number, total: number, animeName: string, episodeNumber: number) => void
  /** Пропустить переиздание библиотеки после обновления */
  skipPublish?: boolean
  /**
   * Минимальный порог свободного места на диске в ГБ.
   * При опускании ниже порога регенерация останавливается.
   * По умолчанию: 30 ГБ
   */
  lowDiskThresholdGb?: number
  /**
   * Путь для проверки свободного места (любой путь на нужном диске).
   * По умолчанию: os.homedir()
   */
  diskCheckPath?: string
}): Promise<RegenerateManifestsResult> {
  log.info('Начинаю регенерацию всех EpisodeManifest')

  const diskCheckPath = options?.diskCheckPath ?? os.homedir()
  const lowDiskThresholdGb = options?.lowDiskThresholdGb ?? LOW_DISK_THRESHOLD_GB
  /** Проверять диск каждые N эпизодов */
  const DISK_CHECK_INTERVAL = 10

  // Запрашиваем все эпизоды с manifestCid и ПОЛНЫМИ метаданными треков
  const episodes = await prisma.episode.findMany({
    where: {
      manifestCid: { not: null },
    },
    select: {
      id: true,
      number: true,
      manifestCid: true,
      transcodedCid: true,
      screenshotCids: true,
      metadataCid: true,
      anime: {
        select: {
          id: true,
          name: true,
        },
      },
      ...EPISODE_TRACKS_SELECT,
    },
    orderBy: [{ anime: { name: 'asc' } }, { number: 'asc' }],
  })

  const result: RegenerateManifestsResult = {
    total: episodes.length,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    affectedAnimeIds: [],
  }

  if (episodes.length === 0) {
    log.info('Нет эпизодов с манифестами для регенерации')
    return result
  }

  log.info('Найдено эпизодов с манифестами', { count: episodes.length })
  const affectedAnimeIds = new Set<string>()

  for (let i = 0; i < episodes.length; i++) {
    const ep = episodes[i]
    options?.onProgress?.(i + 1, episodes.length, ep.anime.name, ep.number)

    // Проверяем диск каждые DISK_CHECK_INTERVAL эпизодов
    if (i % DISK_CHECK_INTERVAL === 0) {
      const hasSpace = await hasSufficientDiskSpace(diskCheckPath, lowDiskThresholdGb)
      if (!hasSpace) {
        log.warn('Регенерация остановлена — мало места на диске', {
          episode: i + 1,
          total: episodes.length,
          thresholdGb: lowDiskThresholdGb,
        })
        result.stoppedDueToLowDisk = true
        break
      }
    }

    try {
      // Читаем манифест из IPFS
      const manifestBuf = await cat(ep.manifestCid!)
      const manifest: EpisodeManifest = JSON.parse(manifestBuf.toString('utf-8'))

      let changed = false

      // 1. Обновляем video CID
      if (ep.transcodedCid) {
        if (manifest.video.cid !== ep.transcodedCid) {
          manifest.video.cid = ep.transcodedCid
          changed = true
        }
        // Удаляем локальный путь (Windows path) если есть
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- очистка лишних полей
        const videoAny = manifest.video as any
        if (videoAny.path) {
          delete videoAny.path
          changed = true
        }
      }

      // 2. Синхронизируем screenshotCids из БД
      {
        const dbScreenshotCids = ep.screenshotCids ? (JSON.parse(ep.screenshotCids) as string[]) : undefined
        if (JSON.stringify(manifest.screenshotCids) !== JSON.stringify(dbScreenshotCids)) {
          manifest.screenshotCids = dbScreenshotCids
          changed = true
        }
      }

      // 3. Синхронизируем metadataCid из БД
      if (ep.metadataCid && manifest.metadataCid !== ep.metadataCid) {
        manifest.metadataCid = ep.metadataCid
        changed = true
      }

      // 4. Полная перестройка аудио/субтитров из БД (исправляет дубликаты у внешних дорожек)
      {
        const tracksResult = rebuildManifestTracks(manifest, ep.audioTracks, ep.subtitleTracks)
        if (tracksResult.changed) {
          changed = true
        }
      }

      // Если ничего не изменилось — пропускаем
      if (!changed) {
        result.skipped++
        log.debug('Манифест уже корректен, пропускаю', {
          episodeId: ep.id,
          animeName: ep.anime.name,
          number: ep.number,
        })
        continue
      }

      // Обновляем дату генерации
      manifest.generatedAt = new Date().toISOString()

      // Загружаем обновлённый манифест в IPFS
      const newManifestCid = await addBytes(Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'))

      // Обновляем manifestCid в БД
      await prisma.episode.update({
        where: { id: ep.id },
        data: { manifestCid: newManifestCid },
      })

      // Recursive pin для EpisodeManifest и его суб-документов
      await pinSubDocuments([
        ['episodeManifestCid', newManifestCid],
        ['chaptersCid', manifest.chaptersCid],
        ['thumbnailsCid', manifest.thumbnailsCid],
        ['encodingCid', manifest.encodingCid],
      ])

      result.updated++
      affectedAnimeIds.add(ep.anime.id)
      log.info('EpisodeManifest обновлён', {
        episodeId: ep.id,
        animeName: ep.anime.name,
        number: ep.number,
        oldCid: ep.manifestCid,
        newCid: newManifestCid,
      })
    } catch (error) {
      result.failed++
      const errorMessage = error instanceof Error ? error.message : String(error)
      result.errors.push({
        episodeId: ep.id,
        animeName: ep.anime.name,
        episodeNumber: ep.number,
        error: errorMessage,
      })
      log.error('Ошибка обновления EpisodeManifest', {
        episodeId: ep.id,
        animeName: ep.anime.name,
        number: ep.number,
        error: errorMessage,
      })
    }
  }

  result.affectedAnimeIds = [...affectedAnimeIds]
  log.info('Регенерация EpisodeManifest завершена', {
    total: result.total,
    updated: result.updated,
    skipped: result.skipped,
    failed: result.failed,
    affectedAnimes: result.affectedAnimeIds.length,
  })

  // Фаза 2: Обновить AnimeManifest + DirectoryCid для ВСЕХ аниме
  // Включает Shikimori refresh (студии, персонал, персонажи, изображения)
  try {
    const allAnimesForRefresh = await prisma.anime.findMany({
      where: { manifestCid: { not: null } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })

    if (allAnimesForRefresh.length > 0) {
      log.info('Обновляю манифесты + Shikimori-данные для всех аниме', { count: allAnimesForRefresh.length })

      let manifestUpdated = 0
      let manifestFailed = 0

      for (let i = 0; i < allAnimesForRefresh.length; i++) {
        const anime = allAnimesForRefresh[i]
        options?.onProgress?.(i + 1, allAnimesForRefresh.length, anime.name, 0)

        // Проверяем диск перед каждым аниме (Phase 2 генерирует больше данных)
        const hasSpace = await hasSufficientDiskSpace(diskCheckPath, lowDiskThresholdGb)
        if (!hasSpace) {
          log.warn('Фаза 2 остановлена — мало места на диске', {
            anime: anime.name,
            index: i + 1,
            total: allAnimesForRefresh.length,
            thresholdGb: lowDiskThresholdGb,
          })
          result.stoppedDueToLowDisk = true
          break
        }

        try {
          // updateAnimeManifest без skipShikimoriRefresh = запрашивает Shikimori + обновляет manifest + directory
          const manifestResult = await updateAnimeManifest(anime.id)
          if (manifestResult.success) {
            manifestUpdated++
          } else {
            manifestFailed++
            log.warn('updateAnimeManifest вернул ошибку', { animeName: anime.name, error: manifestResult.error })
          }
        } catch (error) {
          manifestFailed++
          log.error('Ошибка обновления AnimeManifest', {
            animeName: anime.name,
            error: error instanceof Error ? error.message : String(error),
          })
        }

        // Небольшая пауза между аниме чтобы не перегружать Shikimori API
        if (i < allAnimesForRefresh.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      log.info('Обновление манифестов завершено', {
        total: allAnimesForRefresh.length,
        updated: manifestUpdated,
        failed: manifestFailed,
      })
    }
  } catch (error) {
    log.error('Ошибка фазы обновления AnimeManifest', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Переиздаём библиотеку
  if (!options?.skipPublish && result.updated > 0) {
    try {
      // Используем динамический импорт чтобы избежать циклической зависимости
      const { publishLibrary } = await import('./library-publisher')
      log.info('Переиздаю библиотеку после регенерации манифестов')
      await publishLibrary()
      log.info('Библиотека переиздана')
    } catch (error) {
      log.error('Ошибка переиздания библиотеки', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return result
}
