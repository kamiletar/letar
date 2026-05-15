/**
 * IPC handlers для генерации манифестов
 */

import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

import type { DemuxResult } from '../../shared/types'
import type {
  ChaptersDocument,
  EncodingDocument,
  EpisodeManifest,
  GenerateManifestOptions,
  ManifestChapter,
  ManifestEncodingInfo,
  ManifestThumbnails,
  ThumbnailsDocument,
} from '../../shared/types/manifest'
import { updateAnimeManifest } from '../services/anime-manifest-generator'
import { addBytes, addFile, cat } from '../services/ipfs/unixfs-service'
import {
  generateManifestFromDemux,
  readManifest,
  rebuildManifestTracksFromFile,
  updateManifestEncoding,
  updateManifestMediaCids,
  updateManifestNavigation,
  updateManifestThumbnails,
} from '../services/manifest-generator'
import { prisma } from '../utils/db'
import { createHandler } from '../utils/ipc-handler-factory'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('ManifestHandlers')

/**
 * Регистрирует IPC handlers для работы с манифестами
 */
export function registerManifestHandlers(): void {
  // Генерация манифеста из результатов demux
  createHandler('manifest:generate', (demuxResult: DemuxResult, options: GenerateManifestOptions) =>
    generateManifestFromDemux(demuxResult, options)
  )

  // Чтение существующего манифеста
  createHandler('manifest:read', (manifestPath: string) => {
    const manifest = readManifest(manifestPath)
    if (!manifest) {
      throw new Error('Манифест не найден')
    }
    return manifest
  })

  // Обновление навигации в манифесте
  createHandler(
    'manifest:updateNavigation',
    (
      manifestPath: string,
      navigation: {
        nextEpisode?: { id: string; manifestPath: string }
        prevEpisode?: { id: string; manifestPath: string }
      }
    ) => {
      const success = updateManifestNavigation(manifestPath, navigation)
      return { success }
    }
  )

  // Обновление thumbnails в манифесте (загрузка в IPFS как ThumbnailsDocument)
  createHandler('manifest:updateThumbnails', async (manifestPath: string, thumbnails: ManifestThumbnails) => {
    const success = await updateManifestThumbnails(manifestPath, thumbnails)
    return { success }
  })

  // Обновление информации о кодировании в манифесте (загрузка в IPFS как EncodingDocument)
  createHandler('manifest:updateEncoding', async (manifestPath: string, encoding: ManifestEncodingInfo) => {
    const success = await updateManifestEncoding(manifestPath, encoding)
    return { success }
  })

  // Обновление CID'ов медиафайлов в манифесте перед загрузкой в IPFS
  createHandler(
    'manifest:updateMediaCids',
    (
      manifestPath: string,
      options: {
        videoCid?: string
        audioTrackCids?: Record<string, string>
        audioTrackCodecs?: Record<string, string>
        audioTrackChannels?: Record<string, string>
        subtitleTrackCids?: Record<string, string>
        fontCids?: Record<string, string>
      }
    ) => {
      const success = updateManifestMediaCids(manifestPath, options)
      return { success }
    }
  )

  // Полная перестройка аудио/субтитров в манифесте из БД (для import-processor)
  createHandler('manifest:rebuildTracksFromDb', async (manifestPath: string, episodeId: string) => {
    const ep = await prisma.episode.findUnique({
      where: { id: episodeId },
      select: {
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
            ipfsSize: true,
          },
          orderBy: { streamIndex: 'asc' },
        },
        subtitleTracks: {
          select: {
            streamIndex: true,
            language: true,
            title: true,
            format: true,
            isDefault: true,
            dubGroup: true,
            fileCid: true,
            ipfsSize: true,
            fonts: { select: { fontName: true, fileCid: true, fileExt: true, ipfsSize: true } },
          },
          orderBy: { streamIndex: 'asc' },
        },
      },
    })

    if (!ep) {
      throw new Error(`Эпизод ${episodeId} не найден`)
    }

    const changed = rebuildManifestTracksFromFile(manifestPath, ep.audioTracks, ep.subtitleTracks)
    log.info('Перестройка треков из БД', { episodeId, changed })
    return { changed }
  })

  /**
   * Получить информацию о кодировании из IPFS манифеста
   *
   * Алгоритм:
   * 1. cat(manifestCid) → EpisodeManifest
   * 2. Если есть encodingCid → cat(encodingCid) → EncodingDocument.encoding
   * 3. Иначе → manifest.encoding (обратная совместимость)
   */
  createHandler('manifest:getEncoding', async (manifestCid: string): Promise<ManifestEncodingInfo | null> => {
    log.info('Получение encoding из манифеста', { manifestCid })

    const manifestBuf = await cat(manifestCid)
    const manifest: EpisodeManifest = JSON.parse(manifestBuf.toString('utf-8'))

    // Новый формат: encoding в отдельном EncodingDocument
    if (manifest.encodingCid) {
      const encodingBuf = await cat(manifest.encodingCid)
      const encodingDoc: EncodingDocument = JSON.parse(encodingBuf.toString('utf-8'))
      return encodingDoc.encoding
    }

    // Обратная совместимость: encoding инлайн в манифесте
    return manifest.encoding ?? null
  })

  /**
   * Получить thumbnails из IPFS манифеста
   *
   * Алгоритм:
   * 1. cat(manifestCid) → EpisodeManifest
   * 2. Если есть thumbnailsCid → cat(thumbnailsCid) → ThumbnailsDocument.thumbnails
   * 3. Иначе → manifest.thumbnails (обратная совместимость)
   */
  createHandler('manifest:getThumbnails', async (manifestCid: string): Promise<ManifestThumbnails | null> => {
    log.info('Получение thumbnails из манифеста', { manifestCid })

    const manifestBuf = await cat(manifestCid)
    const manifest: EpisodeManifest = JSON.parse(manifestBuf.toString('utf-8'))

    // Новый формат: thumbnails в отдельном ThumbnailsDocument
    if (manifest.thumbnailsCid) {
      const thumbnailsBuf = await cat(manifest.thumbnailsCid)
      const thumbnailsDoc: ThumbnailsDocument = JSON.parse(thumbnailsBuf.toString('utf-8'))
      return thumbnailsDoc.thumbnails
    }

    // Обратная совместимость: thumbnails инлайн в манифесте
    return manifest.thumbnails ?? null
  })

  /**
   * Batch-обновление навигации между эпизодами через IPFS
   *
   * Алгоритм:
   * 1. Скачать все манифесты из IPFS
   * 2. Обновить навигацию (prev/next) с placeholder CID
   * 3. Загрузить обратно в IPFS, получить новые CID
   * 4. Обновить ссылки в манифестах на реальные CID
   * 5. Перезагрузить манифесты с финальными CID
   * 6. Вернуть map episodeId -> newManifestCid
   */
  createHandler(
    'manifest:updateNavigationBatch',
    async (episodes: Array<{ id: string; manifestCid: string }>): Promise<Record<string, string>> => {
      const tempDir = path.join(os.tmpdir(), `animatrona-nav-${Date.now()}`)

      try {
        log.info('Обновление навигации для эпизодов', { count: episodes.length })

        // Создаём временную директорию
        await fs.mkdir(tempDir, { recursive: true })

        // Шаг 1: Скачать все манифесты из IPFS
        const manifests = new Map<string, EpisodeManifest>()

        for (const ep of episodes) {
          try {
            const content = await cat(ep.manifestCid)
            const json = content.toString('utf-8')
            manifests.set(ep.id, JSON.parse(json))
          } catch (error) {
            log.warn('Не удалось скачать манифест для эпизода', {
              episodeId: ep.id,
              error: error instanceof Error ? error.message : String(error),
            })
            // Пропускаем эпизоды с недоступными манифестами
          }
        }

        log.info('Манифесты скачаны', { count: manifests.size })

        // Фильтруем только эпизоды с успешно скачанными манифестами
        const validEpisodes = episodes.filter((ep) => manifests.has(ep.id))

        if (validEpisodes.length < 2) {
          // Нечего связывать
          return {}
        }

        // Шаг 2: Обновить навигацию в каждом манифесте (с placeholder)
        for (let i = 0; i < validEpisodes.length; i++) {
          const ep = validEpisodes[i]
          const manifest = manifests.get(ep.id)
          if (!manifest) {
            continue
          }

          const prev = validEpisodes[i - 1]
          const next = validEpisodes[i + 1]

          manifest.navigation = {
            prevEpisode: prev ? { id: prev.id, manifestCid: '' } : undefined,
            nextEpisode: next ? { id: next.id, manifestCid: '' } : undefined,
          }
        }

        // Шаг 3: Загрузить все манифесты в IPFS, получить промежуточные CID
        const intermediateCids = new Map<string, string>()

        for (const ep of validEpisodes) {
          const manifest = manifests.get(ep.id)
          if (!manifest) {
            continue
          }

          const tempPath = path.join(tempDir, `${ep.id}.json`)
          await fs.writeFile(tempPath, JSON.stringify(manifest, null, 2), 'utf-8')

          const result = await addFile(tempPath)
          intermediateCids.set(ep.id, result.cid)
        }

        log.info('Промежуточные манифесты загружены', { count: intermediateCids.size })

        // Шаг 4: Обновить ссылки в навигации на реальные CID
        for (const ep of validEpisodes) {
          const manifest = manifests.get(ep.id)
          if (!manifest?.navigation) {
            continue
          }

          if (manifest.navigation.prevEpisode) {
            const prevCid = intermediateCids.get(manifest.navigation.prevEpisode.id)
            if (prevCid) {
              manifest.navigation.prevEpisode.manifestCid = prevCid
            }
          }

          if (manifest.navigation.nextEpisode) {
            const nextCid = intermediateCids.get(manifest.navigation.nextEpisode.id)
            if (nextCid) {
              manifest.navigation.nextEpisode.manifestCid = nextCid
            }
          }
        }

        // Шаг 5: Перезагрузить манифесты с финальными CID
        const finalCids = new Map<string, string>()

        for (const ep of validEpisodes) {
          const manifest = manifests.get(ep.id)
          if (!manifest) {
            continue
          }

          const tempPath = path.join(tempDir, `${ep.id}-final.json`)
          await fs.writeFile(tempPath, JSON.stringify(manifest, null, 2), 'utf-8')

          const result = await addFile(tempPath)
          finalCids.set(ep.id, result.cid)
        }

        log.info('Финальные манифесты загружены', { count: finalCids.size })

        // Шаг 6: Очистка
        try {
          await fs.rm(tempDir, { recursive: true })
        } catch {
          // Игнорируем ошибки очистки
        }

        // Преобразуем Map в Record для возврата через IPC
        const result: Record<string, string> = {}
        for (const [id, cid] of finalCids) {
          result[id] = cid
        }

        return result
      } catch (error) {
        // Очистка при ошибке
        try {
          await fs.rm(tempDir, { recursive: true })
        } catch {
          // Игнорируем
        }
        throw error
      }
    }
  )

  /**
   * Получить главы эпизода из IPFS манифеста
   *
   * Алгоритм:
   * 1. cat(manifestCid) → EpisodeManifest
   * 2. Если есть chaptersCid → cat(chaptersCid) → ChaptersDocument.chapters
   * 3. Иначе → manifest.chapters (обратная совместимость)
   */
  createHandler('manifest:getChapters', async (manifestCid: string): Promise<ManifestChapter[]> => {
    log.info('Получение глав из манифеста', { manifestCid })

    const manifestBuf = await cat(manifestCid)
    const manifest: EpisodeManifest = JSON.parse(manifestBuf.toString('utf-8'))

    // Новый формат: главы в отдельном ChaptersDocument
    if (manifest.chaptersCid) {
      const chaptersBuf = await cat(manifest.chaptersCid)
      const chaptersDoc: ChaptersDocument = JSON.parse(chaptersBuf.toString('utf-8'))
      return chaptersDoc.chapters
    }

    // Обратная совместимость: главы инлайн в манифесте
    return manifest.chapters ?? []
  })

  /**
   * Обновить главы эпизода через IPFS
   *
   * Алгоритм:
   * 1. Создать ChaptersDocument JSON
   * 2. addBytes(chaptersJson) → chaptersCid
   * 3. cat(oldManifestCid) → manifest
   * 4. manifest.chaptersCid = chaptersCid, manifest.chapters = []
   * 5. addBytes(manifestJson) → newManifestCid
   * 6. prisma.episode.update({ manifestCid: newManifestCid })
   * 7. return newManifestCid
   */
  createHandler('manifest:updateChapters', async (episodeId: string, chapters: ManifestChapter[]): Promise<string> => {
    log.info('Обновление глав эпизода', { episodeId, count: chapters.length })

    // Получаем текущий manifestCid
    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
      select: { manifestCid: true },
    })

    if (!episode?.manifestCid) {
      throw new Error(`Эпизод ${episodeId} не имеет манифеста`)
    }

    // 1. Создаём ChaptersDocument
    const chaptersDoc: ChaptersDocument = { version: 1, chapters }
    const chaptersJson = JSON.stringify(chaptersDoc)
    const chaptersCid = await addBytes(Buffer.from(chaptersJson, 'utf-8'))

    // 2. Читаем текущий манифест
    const manifestBuf = await cat(episode.manifestCid)
    const manifest: EpisodeManifest = JSON.parse(manifestBuf.toString('utf-8'))

    // 3. Обновляем манифест: ссылка на ChaptersDocument, очищаем инлайн
    manifest.chaptersCid = chaptersCid
    manifest.chapters = []

    // 4. Загружаем обновлённый манифест в IPFS
    const manifestJson = JSON.stringify(manifest, null, 2)
    const newManifestCid = await addBytes(Buffer.from(manifestJson, 'utf-8'))

    // 5. Обновляем Episode.manifestCid в БД
    const updatedEp = await prisma.episode.update({
      where: { id: episodeId },
      data: { manifestCid: newManifestCid },
      select: { animeId: true },
    })

    // 6. Пересобираем AnimeManifest + directoryCid
    updateAnimeManifest(updatedEp.animeId).catch((err) => {
      log.warn('Не удалось обновить AnimeManifest после изменения глав', { error: String(err) })
    })

    log.info('Главы обновлены', { episodeId, chaptersCid, newManifestCid })
    return newManifestCid
  })

  /**
   * Копировать главы из одного эпизода в другие
   */
  createHandler(
    'manifest:copyChapters',
    async (
      sourceEpisodeId: string,
      targetEpisodeIds: string[],
      chapterTypes: string[]
    ): Promise<{ count: number; skipped: number }> => {
      log.info('Копирование глав', { sourceEpisodeId, targetCount: targetEpisodeIds.length, chapterTypes })

      // Получаем главы из source
      const sourceEp = await prisma.episode.findUnique({
        where: { id: sourceEpisodeId },
        select: { manifestCid: true },
      })

      if (!sourceEp?.manifestCid) {
        throw new Error(`Эпизод-источник ${sourceEpisodeId} не имеет манифеста`)
      }

      const sourceChapters = await getChaptersFromManifest(sourceEp.manifestCid)
      const chaptersToCopy = sourceChapters.filter((c) => chapterTypes.includes(c.type))

      if (chaptersToCopy.length === 0) {
        return { count: 0, skipped: 0 }
      }

      let count = 0
      let skipped = 0

      for (const targetId of targetEpisodeIds) {
        const targetEp = await prisma.episode.findUnique({
          where: { id: targetId },
          select: { manifestCid: true },
        })

        if (!targetEp?.manifestCid) {
          skipped += chaptersToCopy.length
          continue
        }

        // Получаем текущие главы целевого эпизода
        const existingChapters = await getChaptersFromManifest(targetEp.manifestCid)
        const existingTypes = new Set(existingChapters.map((c) => c.type))

        // Добавляем только те, которых нет
        const newChapters = chaptersToCopy.filter((c) => !existingTypes.has(c.type))

        if (newChapters.length === 0) {
          skipped += chaptersToCopy.length
          continue
        }

        const mergedChapters = [...existingChapters, ...newChapters].sort((a, b) => a.startMs - b.startMs)

        // Обновляем через тот же паттерн
        const chaptersDoc: ChaptersDocument = { version: 1, chapters: mergedChapters }
        const chaptersCid = await addBytes(Buffer.from(JSON.stringify(chaptersDoc), 'utf-8'))

        const manifestBuf = await cat(targetEp.manifestCid)
        const manifest: EpisodeManifest = JSON.parse(manifestBuf.toString('utf-8'))
        manifest.chaptersCid = chaptersCid
        manifest.chapters = []

        const newManifestCid = await addBytes(Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'))
        await prisma.episode.update({
          where: { id: targetId },
          data: { manifestCid: newManifestCid },
        })

        count += newChapters.length
        skipped += chaptersToCopy.length - newChapters.length
      }

      // Пересобираем AnimeManifest + directoryCid для затронутых аниме
      const affectedEpisodes = await prisma.episode.findMany({
        where: { id: { in: targetEpisodeIds } },
        select: { animeId: true },
        distinct: ['animeId'],
      })
      for (const ep of affectedEpisodes) {
        updateAnimeManifest(ep.animeId).catch((err) => {
          log.warn('Не удалось обновить AnimeManifest после копирования глав', { error: String(err) })
        })
      }

      log.info('Копирование глав завершено', { count, skipped })
      return { count, skipped }
    }
  )

  /**
   * Генерация RECAP/PREVIEW глав на основе OP/ED
   */
  createHandler(
    'manifest:generateRecapPreview',
    async (
      episodes: Array<{ id: string; manifestCid: string; durationMs: number }>
    ): Promise<{ created: number; skipped: number }> => {
      log.info('Генерация RECAP/PREVIEW', { count: episodes.length })

      let created = 0
      let skipped = 0

      for (const ep of episodes) {
        const chapters = await getChaptersFromManifest(ep.manifestCid)

        if (chapters.length === 0) {
          continue
        }

        const types = new Set(chapters.map((c) => c.type))
        const newChapters: ManifestChapter[] = []

        // Найти первый OP
        const firstOp = chapters.find((c) => c.type === 'op')
        // Найти последний ED
        const lastEd = [...chapters].reverse().find((c) => c.type === 'ed')

        // RECAP: от 0 до OP.startMs
        if (firstOp && !types.has('recap') && firstOp.startMs > 0) {
          newChapters.push({
            startMs: 0,
            endMs: firstOp.startMs,
            title: 'Ретро',
            type: 'recap',
            skippable: true,
          })
          created++
        } else if (firstOp && types.has('recap')) {
          skipped++
        }

        // PREVIEW: от ED.endMs до durationMs
        if (lastEd && !types.has('preview') && ep.durationMs > 0 && lastEd.endMs < ep.durationMs) {
          newChapters.push({
            startMs: lastEd.endMs,
            endMs: ep.durationMs,
            title: 'Превью',
            type: 'preview',
            skippable: true,
          })
          created++
        } else if (lastEd && types.has('preview')) {
          skipped++
        }

        if (newChapters.length > 0) {
          const mergedChapters = [...chapters, ...newChapters].sort((a, b) => a.startMs - b.startMs)

          const chaptersDoc: ChaptersDocument = { version: 1, chapters: mergedChapters }
          const chaptersCid = await addBytes(Buffer.from(JSON.stringify(chaptersDoc), 'utf-8'))

          const manifestBuf = await cat(ep.manifestCid)
          const manifest: EpisodeManifest = JSON.parse(manifestBuf.toString('utf-8'))
          manifest.chaptersCid = chaptersCid
          manifest.chapters = []

          const newManifestCid = await addBytes(Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'))
          await prisma.episode.update({
            where: { id: ep.id },
            data: { manifestCid: newManifestCid },
          })
        }
      }

      // Пересобираем AnimeManifest + directoryCid для затронутых аниме
      const epIds = episodes.map((e) => e.id)
      const affectedEpisodes = await prisma.episode.findMany({
        where: { id: { in: epIds } },
        select: { animeId: true },
        distinct: ['animeId'],
      })
      for (const ep of affectedEpisodes) {
        updateAnimeManifest(ep.animeId).catch((err) => {
          log.warn('Не удалось обновить AnimeManifest после генерации RECAP/PREVIEW', { error: String(err) })
        })
      }

      log.info('Генерация RECAP/PREVIEW завершена', { created, skipped })
      return { created, skipped }
    }
  )
}

/**
 * Вспомогательная функция: получить главы из манифеста (с поддержкой chaptersCid и инлайн)
 */
async function getChaptersFromManifest(manifestCid: string): Promise<ManifestChapter[]> {
  const manifestBuf = await cat(manifestCid)
  const manifest: EpisodeManifest = JSON.parse(manifestBuf.toString('utf-8'))

  if (manifest.chaptersCid) {
    const chaptersBuf = await cat(manifest.chaptersCid)
    const chaptersDoc: ChaptersDocument = JSON.parse(chaptersBuf.toString('utf-8'))
    return chaptersDoc.chapters
  }

  return manifest.chapters ?? []
}
