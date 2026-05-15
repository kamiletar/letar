import fs from 'node:fs'

import { createModuleLogger } from '../utils/logger'
import { getDatabasePath } from './database'

const log = createModuleLogger('legacy-directory-migration')

interface LegacyAnime {
  id: string
  manifestCid: string
}

function getLegacyFilePath(): string {
  return `${getDatabasePath()}.legacy-dirs.json`
}

/**
 * Запустить авто-миграцию legacy-аниме на IPFS-директории.
 *
 * Вызывается после старта IPFS. Читает файл .legacy-dirs.json,
 * сохранённый перед применением миграции remove_anime_manifest_cid,
 * и строит directoryCid для каждого аниме через buildAnimeDirectory.
 */
export async function runLegacyDirectoryMigration(): Promise<void> {
  const legacyFilePath = getLegacyFilePath()

  if (!fs.existsSync(legacyFilePath)) {
    return
  }

  let legacyList: LegacyAnime[]
  try {
    legacyList = JSON.parse(fs.readFileSync(legacyFilePath, 'utf-8')) as LegacyAnime[]
  } catch (err) {
    log.error('Не удалось прочитать файл legacy-миграции', { error: String(err) })
    return
  }

  if (legacyList.length === 0) {
    fs.unlinkSync(legacyFilePath)
    return
  }

  log.warn(`Авто-миграция директорий: ${legacyList.length} аниме без directoryCid`, {
    legacyFilePath,
  })

  const { buildAnimeDirectory } = await import('./ipfs/anime-directory-builder')
  const { prisma: db } = await import('../utils/db')

  let successCount = 0
  let failedCount = 0

  for (const { id, manifestCid } of legacyList) {
    try {
      const { directoryCid } = await buildAnimeDirectory(id, { manifestCidOverride: manifestCid })
      await db.anime.update({ where: { id }, data: { directoryCid } })
      successCount++
      log.info(`Аниме мигрировано на directoryCid`, { animeId: id })
    } catch (error) {
      log.error(`Не удалось мигрировать аниме`, { animeId: id, error: String(error) })
      failedCount++
    }
  }

  log.info('Legacy-миграция директорий завершена', {
    successCount,
    failedCount,
    total: legacyList.length,
  })

  if (failedCount === 0) {
    fs.unlinkSync(legacyFilePath)
  } else {
    log.warn(`${failedCount} аниме не удалось мигрировать — файл сохранён для повторной попытки`, {
      legacyFilePath,
    })
  }
}
