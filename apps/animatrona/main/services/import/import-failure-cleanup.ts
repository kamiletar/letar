/**
 * Cleanup при ошибке/отмене импорта — двухуровневое открепление IPFS-контента
 * (записанного в БД и tracked-CID, не попавших в БД), затем удаление записи
 * аниме из БД и папки библиотеки.
 *
 * Выделено из ImportService.process() (catch-блок) — принимает состояние явными
 * аргументами вместо чтения `this.createdAnimeId`/`this.createdAnimeFolder`.
 */

import fs from 'fs'

import { createModuleLogger } from '../../utils/logger'
import * as db from './import-db'
import { getTrackedCids } from './import-ipfs'

const log = createModuleLogger('ImportService')

export interface ImportFailureCleanupParams {
  createdAnimeId: string | null
  createdAnimeFolder: string | null
  /** 'cancel' если импорт остановлен пользователем, иначе 'error' — только для логов */
  reason: 'cancel' | 'error'
}

/**
 * Cleanup IPFS — двухуровневый:
 * 1) deleteAnimeContent() — открепляет CID из БД (audio/subtitle, загруженные renderer'ом)
 * 2) getTrackedCids() — открепляет CID, загруженные в main (видео, скриншоты, манифесты),
 *    которые могли не попасть в БД (ошибка между upload и save)
 */
export async function cleanupAfterImportFailure(params: ImportFailureCleanupParams): Promise<void> {
  const { createdAnimeId, createdAnimeFolder, reason } = params

  if (createdAnimeId) {
    // Шаг 1: открепляем CID, уже записанные в БД (ПЕРЕД удалением записей!)
    try {
      const { deleteAnimeContent } = await import('../content-deletion')
      const contentResult = await deleteAnimeContent(createdAnimeId)
      log.info(`Cleanup (${reason}): откреплено ${contentResult.deletedCids} CID из БД`)
    } catch (contentError) {
      log.warn('Cleanup: ошибка открепления контента из БД', { error: String(contentError) })
    }
  }

  // Шаг 2: открепляем CID, загруженные в main process за время импорта (не попавшие в БД)
  const trackedCids = getTrackedCids()
  if (trackedCids.size > 0) {
    log.warn(`Cleanup (${reason}): проверяем ${trackedCids.size} tracked CID`)
    try {
      const { getPinManager } = await import('../ipfs')
      const pinManager = getPinManager()
      let unpinned = 0
      for (const cid of trackedCids) {
        try {
          const isPinned = await pinManager.isPinned(cid)
          if (isPinned) {
            await pinManager.unpin(cid)
            unpinned++
          }
        } catch {
          // Не критично — CID мог быть уже откреплён
        }
      }
      if (unpinned > 0) {
        log.info(`Cleanup: дополнительно откреплено ${unpinned} tracked CID`)
      }
    } catch (unpinError) {
      log.error('Cleanup: ошибка открепления tracked CID', { error: String(unpinError) })
    }
  }

  // Cleanup DB
  if (createdAnimeId) {
    log.warn(`Cleanup (${reason}): удаляем аниме из БД`, { animeId: createdAnimeId })
    try {
      await db.deleteAnime(createdAnimeId)
    } catch (dbError) {
      log.error('Не удалось удалить аниме из БД', { error: String(dbError) })
    }
  }

  if (createdAnimeFolder) {
    log.warn(`Cleanup (${reason}): удаляем папку`, { folder: createdAnimeFolder })
    try {
      fs.rmSync(createdAnimeFolder, { recursive: true, force: true })
    } catch {
      /* не критично */
    }
  }
}
