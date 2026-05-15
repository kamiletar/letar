/**
 * Массовое снятие recursive pin'ов с пачки CID.
 *
 * Сделано отдельно от PinManager.unpin — тот делает save() в JSON-файл на каждый вызов
 * и обновляет внутреннее состояние (события, локальный кэш). Для 24к orphan-pin'ов это
 * занимало бы часы. Здесь — только Kubo `pin.rm` параллельно с прогресс-репортом.
 *
 * Орphan recursive pin'ов в локальном PinManager.pins.json обычно нет (они создавались
 * через `client.add()`, а не через PinManager.pin) — поэтому игнорировать локальный кэш безопасно.
 */

import { CID } from 'multiformats/cid'

import { createModuleLogger } from '../../utils/logger'
import { getKuboService } from '../kubo'

const log = createModuleLogger('BulkUnpin')

/** Параллельность — Kubo локальный, 20 одновременных запросов безопасно */
const BULK_UNPIN_CONCURRENCY = 20

export interface BulkUnpinResult {
  unpinned: number
  failed: number
  total: number
}

export type BulkUnpinProgress = (current: number, total: number) => void

/**
 * Массово снимает recursive pin со списка CID.
 *
 * Параллельность 20 — стандартная локальная нагрузка для Kubo.
 * Прогресс репортится после каждой `step` обработанных штук.
 */
export async function bulkUnpin(cids: string[], onProgress?: BulkUnpinProgress): Promise<BulkUnpinResult> {
  const client = getKuboService().getClientOrNull()
  if (!client) {
    log.warn('Kubo клиент недоступен')
    return { unpinned: 0, failed: cids.length, total: cids.length }
  }

  const total = cids.length
  let unpinned = 0
  let failed = 0
  let done = 0

  // Параллельный воркер-пул с курсором
  let cursor = 0
  async function worker() {
    while (cursor < total) {
      const idx = cursor++
      const cid = cids[idx]
      try {
        await client.pin.rm(CID.parse(cid))
        unpinned++
      } catch (error) {
        // "not pinned" — нормально, просто игнор
        const msg = String(error)
        if (!msg.includes('not pinned')) {
          log.debug('Ошибка bulk unpin', { cid, error: msg })
        }
        failed++
      }
      done++
      // Репортим каждые 25 (или последний)
      if (done % 25 === 0 || done === total) {
        onProgress?.(done, total)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(BULK_UNPIN_CONCURRENCY, total) }, worker))

  log.info('Bulk unpin завершён', { unpinned, failed, total })
  return { unpinned, failed, total }
}
