/**
 * Нормализация pins — одноразовая чистка лишних recursive pin'ов
 *
 * Проблема: каждый client.add() в Kubo по умолчанию ставит recursive pin.
 * За время работы animatrona создаются тысячи промежуточных recursive pin'ов
 * (animeInfo, episodes-doc, episode-manifest, chapters, thumbnails-doc, encoding-doc и т.д.).
 * Все они находятся внутри Anime.directoryCid и могли бы быть indirect — но Kubo
 * не снимает их recursive pin автоматически.
 *
 * Решение: для каждого Anime.directoryCid через client.refs(recursive: true) собираем
 * все дочерние CID, затем проходим по списку recursive pin'ов и снимаем те, которые
 * есть в дочерних → они становятся indirect и продолжают защищаться от GC.
 *
 * CID которые НЕ являются ни directoryCid, ни indirect под одним из directoryCid —
 * НЕ трогаем (это могут быть legacy-аниме без directoryCid либо настоящие orphan'ы,
 * которые потом отловит аудит).
 */

import { CID } from 'multiformats/cid'

import { prisma } from '../../utils/db'
import { createModuleLogger } from '../../utils/logger'
import { getKuboService } from '../kubo'
import { isSafeToUnpinLocally } from './pin-status-service'

const log = createModuleLogger('PinNormalizer')

export interface NormalizePinsResult {
  /** Сколько recursive pin'ов снято (стали indirect) */
  unpinned: number
  /** Сколько recursive pin'ов оставлены как есть (roots или не покрыты ни одним directoryCid) */
  kept: number
  /** Сколько ошибок при unpin */
  errors: number
  /** Сколько directoryCid обработано */
  directoriesProcessed: number
  /** Сколько directoryCid не удалось обойти (не локальны / ошибка) */
  directoriesFailed: number
}

export type NormalizeProgress = (step: string, current?: number, total?: number) => void

/**
 * Нормализует все pins в Kubo относительно known directoryCid'ов из БД.
 */
export async function normalizeAllPins(onProgress?: NormalizeProgress): Promise<NormalizePinsResult> {
  const client = getKuboService().getClientOrNull()
  if (!client) {
    log.warn('Kubo клиент недоступен')
    return { unpinned: 0, kept: 0, errors: 0, directoriesProcessed: 0, directoriesFailed: 0 }
  }

  // 1. Собираем roots — то, что должно остаться recursive в любом случае
  onProgress?.('Сбор directoryCid из БД...')
  const animes = await prisma.anime.findMany({
    where: { pinnedLocally: { not: false } },
    select: { directoryCid: true, posterCid: true, animeInfoCid: true },
  })

  const roots = new Set<string>()
  const directoryRoots: string[] = []

  for (const a of animes) {
    if (a.directoryCid) {
      roots.add(a.directoryCid)
      directoryRoots.push(a.directoryCid)
    }
  }

  log.info('Roots собраны', {
    totalRoots: roots.size,
    directoryRoots: directoryRoots.length,
    legacyAnimes: animes.length - directoryRoots.length,
  })

  // 2. Для каждого directoryCid через client.refs собираем все indirect CID
  const indirectSet = new Set<string>()
  let directoriesProcessed = 0
  let directoriesFailed = 0

  for (let i = 0; i < directoryRoots.length; i++) {
    const dirCid = directoryRoots[i]
    onProgress?.(`Обход directoryCid ${i + 1}/${directoryRoots.length}...`, i + 1, directoryRoots.length)

    try {
      // refs с recursive=true возвращает все ссылки в DAG (это и есть indirect блоки)
      for await (const ref of client.refs(dirCid, { recursive: true })) {
        if (ref.ref) {
          indirectSet.add(ref.ref)
        }
      }
      directoriesProcessed++
    } catch (error) {
      log.warn('Не удалось обойти directoryCid', { directoryCid: dirCid, error: String(error) })
      directoriesFailed++
    }
  }

  log.info('Indirect CID собраны', { indirectCount: indirectSet.size })

  // 3. Получаем все recursive pins
  onProgress?.('Получение recursive pins...')
  const allRecursive: string[] = []
  try {
    for await (const pin of client.pin.ls({ type: 'recursive' })) {
      allRecursive.push(pin.cid.toString())
    }
  } catch (error) {
    log.error('Ошибка получения recursive pins', { error: String(error) })
    return {
      unpinned: 0,
      kept: 0,
      errors: 1,
      directoriesProcessed,
      directoriesFailed,
    }
  }

  log.info('Recursive pins получены', { count: allRecursive.length })

  // 4. Снимаем recursive pin с тех CID, что покрыты хотя бы одним directoryCid и не root
  let unpinned = 0
  let kept = 0
  let errors = 0

  const total = allRecursive.length
  for (let i = 0; i < total; i++) {
    const cid = allRecursive[i]

    if (i % 50 === 0 || i === total - 1) {
      onProgress?.(`Нормализация pins: ${i + 1}/${total} (снято ${unpinned})...`, i + 1, total)
    }

    if (roots.has(cid)) {
      kept++
      continue
    }

    if (indirectSet.has(cid)) {
      // Защита от GC: не снимаем рекурсивный пин если CID ещё не на удалённых пинерах.
      // LOCAL_ONLY / PIN_QUEUED — блоки только локально, снятие пина → GC их удалит.
      const safe = await isSafeToUnpinLocally(cid)
      if (!safe) {
        log.debug('CID защищён от нормализации (не на пинерах)', { cid })
        kept++
        continue
      }

      try {
        await client.pin.rm(CID.parse(cid))
        unpinned++
      } catch (error) {
        log.debug('pin.rm failed (вероятно уже indirect)', { cid, error: String(error) })
        errors++
      }
    } else {
      // CID не покрыт ни одним directoryCid — оставляем (orphan или legacy)
      kept++
    }
  }

  log.info('Нормализация завершена', {
    unpinned,
    kept,
    errors,
    directoriesProcessed,
    directoriesFailed,
  })

  return { unpinned, kept, errors, directoriesProcessed, directoriesFailed }
}
