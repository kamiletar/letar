/**
 * Content Migration — Миграция контента в IPFS
 *
 * Находит эпизоды с локальными файлами, загружает их в IPFS и обновляет БД.
 */

import { prisma } from '../utils/db'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('ContentMigration')

/**
 * Результат миграции эпизода в IPFS
 */
export interface MigrationResult {
  /** Общее количество эпизодов для миграции */
  total: number
  /** Успешно мигрировано */
  migrated: number
  /** С ошибками */
  failed: number
  /** Список ошибок */
  errors: Array<{ episodeId: string; animeName: string; episodeNumber: number; error: string }>
}

/**
 * Получить эпизоды, требующие миграции в IPFS
 * (есть folderPath, но нет transcodedCid)
 */
export async function getEpisodesNeedingMigration(): Promise<
  Array<{
    id: string
    number: number
    folderPath: string
    animeName: string
    animeId: string
  }>
> {
  const episodes = await prisma.episode.findMany({
    where: {
      folderPath: { not: null },
      transcodedCid: null,
    },
    select: {
      id: true,
      number: true,
      folderPath: true,
      anime: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ anime: { name: 'asc' } }, { number: 'asc' }],
  })

  return episodes
    .filter((ep): ep is typeof ep & { folderPath: string } => ep.folderPath !== null)
    .map((ep) => ({
      id: ep.id,
      number: ep.number,
      folderPath: ep.folderPath,
      animeName: ep.anime.name,
      animeId: ep.anime.id,
    }))
}

/**
 * Мигрировать существующий контент в IPFS
 *
 * Находит эпизоды с folderPath но без transcodedCid,
 * загружает video.webm в IPFS и обновляет БД.
 */
export async function migrateContentToIpfs(options?: {
  onProgress?: (current: number, total: number, animeName: string, episodeNumber: number) => void
}): Promise<MigrationResult> {
  const { addFile } = await import('./ipfs')
  const path = await import('path')
  const fs = await import('fs/promises')

  const episodes = await getEpisodesNeedingMigration()
  const result: MigrationResult = {
    total: episodes.length,
    migrated: 0,
    failed: 0,
    errors: [],
  }

  if (episodes.length === 0) {
    log.info('Нет эпизодов для миграции')
    return result
  }

  log.info('Начинаю миграцию контента в IPFS', { total: episodes.length })

  for (let i = 0; i < episodes.length; i++) {
    const ep = episodes[i]
    options?.onProgress?.(i + 1, episodes.length, ep.animeName, ep.number)

    try {
      // Ищем video.webm в папке эпизода
      const videoPath = path.join(ep.folderPath, 'video.webm')

      // Проверяем существование файла
      try {
        await fs.access(videoPath)
      } catch {
        throw new Error(`Файл не найден: ${videoPath}`)
      }

      // Загружаем в IPFS
      log.debug('Загружаю видео в IPFS', { episodeId: ep.id, videoPath })
      const cid = await addFile(videoPath)

      if (!cid) {
        throw new Error('addFile вернул null')
      }

      // Обновляем БД
      await prisma.episode.update({
        where: { id: ep.id },
        data: {
          transcodedCid: cid,
        },
      })

      result.migrated++
      log.info('Эпизод мигрирован', { episodeId: ep.id, cid, animeName: ep.animeName, number: ep.number })
    } catch (error) {
      result.failed++
      const errorMessage = error instanceof Error ? error.message : String(error)
      result.errors.push({
        episodeId: ep.id,
        animeName: ep.animeName,
        episodeNumber: ep.number,
        error: errorMessage,
      })
      log.error('Ошибка миграции эпизода', { episodeId: ep.id, error: errorMessage })
    }
  }

  log.info('Миграция завершена', { migrated: result.migrated, failed: result.failed, total: result.total })
  return result
}
