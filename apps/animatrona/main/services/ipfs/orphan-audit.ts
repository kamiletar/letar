/**
 * Аудит IPFS хранилища — поиск осиротевших (orphaned) recursive pins.
 *
 * После введения `Anime.directoryCid` логика стала тривиальной:
 * - Из БД собираем CID-ы, которые должны быть recursive-pinned (в основном — directoryCid).
 * - Из Kubo получаем recursive pins.
 * - Diff: orphan = pinned не в expected; missing = expected не в pinned.
 *
 * Никаких `cat()`/`refs()` обращений к IPFS — только Kubo `pin.ls` + Prisma.
 */

import type { PinInfo } from '../../../shared/types/ipfs'
import { prisma } from '../../utils/db'
import { createModuleLogger } from '../../utils/logger'
import { getKuboService } from '../kubo'
import { stat } from './unixfs-service'

const log = createModuleLogger('OrphanAudit')

/** Информация о незапиненном CID с указанием источника */
export interface MissingPinInfo {
  cid: string
  /** Источник: таблица и поле */
  source: string
  /** Название аниме (если удалось определить) */
  animeName?: string
  /** Только в манифестах (не в БД напрямую) — оставлено для обратной совместимости UI */
  manifestOnly: boolean
}

/** Результат аудита */
export interface OrphanAuditResult {
  /** CID из БД, которые должны быть recursive-pinned (раньше — все CID из БД) */
  dbCids: string[]
  /** Итого referenced CID — то же что dbCids */
  referencedCids: string[]
  /** Все pinned recursive CID */
  pinnedCids: string[]
  /** Orphaned: pinned, но не в expected roots */
  orphanedPins: PinInfo[]
  /** Missing: expected, но не pinned recursive */
  missingPins: string[]
  /** Missing с подробной информацией об источнике */
  missingPinDetails: MissingPinInfo[]
  /** Ошибки — раньше парсинг манифестов, сейчас всегда [] */
  errors: string[]
}

/** Таймаут для stat одного pin'а */
const STAT_TIMEOUT_MS = 5_000

/** Параллельность stat — операции локальные через Kubo */
const ENRICH_STAT_CONCURRENCY = 20

/** Promise с таймаутом */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label}: таймаут ${ms}мс`)), ms)),
  ])
}

/** Дополнить PinInfo размером (stat) — только для orphaned pins */
async function enrichWithStat(pins: PinInfo[], onStep?: (step: string) => void): Promise<void> {
  let timedOut = 0
  let done = 0
  const total = pins.length

  let cursor = 0
  async function worker() {
    while (cursor < total) {
      const idx = cursor++
      const pin = pins[idx]
      try {
        const s = await withTimeout(stat(pin.cid), STAT_TIMEOUT_MS, `stat(${pin.cid.slice(0, 12)})`)
        pin.size = s.size
        pin.type = s.type
      } catch {
        timedOut++
      }
      done++
      if (done % 10 === 0 || done === total) {
        onStep?.(`Размеры orphaned pins: ${done}/${total}...`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(ENRICH_STAT_CONCURRENCY, total) }, worker))

  if (timedOut > 0) {
    log.warn('enrichWithStat: пропущено из-за таймаута/ошибки', { timedOut, total: pins.length })
  }
}

/**
 * Сбор «корневых» CID, которые должны быть recursive-pinned в Kubo.
 *
 * Принцип: в новой архитектуре `Anime.directoryCid` — единственный recursive root для аниме,
 * всё остальное (episode-manifests, видео, аудио, субтитры, шрифты, постер, animeInfo, и т.д.)
 * лежит **внутри** этой директории как indirect через DAG. Recursive pin не нужен — содержимое
 * автоматически защищено от GC через recursive pin родителя.
 *
 * Поэтому в expected roots попадают:
 * 1. **Аниме с `directoryCid`** → только `directoryCid`. Все Episode/Audio/Subtitle/Font/Poster
 *    этого аниме НЕ добавляются как expected — они indirect через directoryCid.
 * 2. **Legacy-аниме без `directoryCid`** → standalone `manifestCid` + `posterCid` + `animeInfoCid`,
 *    плюс Episode-уровень CID, AudioTrack/SubtitleTrack/SubtitleFont этого аниме.
 * 3. **File и Franchise** — добавляются всегда: они не привязаны к конкретному аниме и обычно
 *    являются standalone. Если они окажутся внутри какого-то directoryCid (например, плакат
 *    добавили через File потом ассоциировали с аниме) — они будут indirect, и аудит покажет
 *    их как «не запинены». В этом случае их можно пинить через кнопку "Закрепить" — повторное
 *    pin.add для уже indirect CID превратит его в standalone recursive (что лишнее) либо
 *    останется indirect (что норм). Если запись File больше не нужна — её надо удалить из БД.
 *
 * Возвращает map cid → описание источника (для категоризации missing).
 */
async function collectExpectedRoots(): Promise<Map<string, string>> {
  const roots = new Map<string, string>()

  const animes = await prisma.anime.findMany({
    where: { pinnedLocally: { not: false } },
    select: {
      name: true,
      directoryCid: true,
      posterCid: true,
      animeInfoCid: true,
    },
  })

  for (const a of animes) {
    if (a.directoryCid) {
      roots.set(a.directoryCid, `Anime.directoryCid (${a.name})`)
    }
  }

  // Если ВСЕ аниме мигрированы на directoryCid — Episode/Audio/Subtitle/Font нам не нужны.
  // Запрашиваем их только если есть legacy-аниме (без directoryCid).
  const hasLegacyAnimes = animes.some((a) => !a.directoryCid)

  if (hasLegacyAnimes) {
    // Episode CIDs — только для legacy аниме без directoryCid
    const episodes = await prisma.episode.findMany({
      where: { anime: { pinnedLocally: { not: false }, directoryCid: null } },
      select: {
        number: true,
        transcodedCid: true,
        manifestCid: true,
        metadataCid: true,
        thumbnailCids: true,
        screenshotCids: true,
        anime: { select: { name: true } },
      },
    })
    for (const ep of episodes) {
      const lbl = (field: string) => `${field} (${ep.anime.name} эп.${ep.number})`
      if (ep.transcodedCid) {
        roots.set(ep.transcodedCid, lbl('Episode.transcodedCid'))
      }
      if (ep.manifestCid) {
        roots.set(ep.manifestCid, lbl('Episode.manifestCid'))
      }
      if (ep.metadataCid) {
        roots.set(ep.metadataCid, lbl('Episode.metadataCid'))
      }
      for (const jsonField of [ep.thumbnailCids, ep.screenshotCids]) {
        if (!jsonField) {
          continue
        }
        try {
          for (const c of JSON.parse(jsonField) as string[]) {
            if (c) {
              roots.set(c, lbl('Episode.*Cids'))
            }
          }
        } catch {
          /* noop */
        }
      }
    }

    // AudioTrack — только legacy
    const audioTracks = await prisma.audioTrack.findMany({
      where: { episode: { anime: { pinnedLocally: { not: false }, directoryCid: null } } },
      select: {
        transcodedCid: true,
        episode: { select: { number: true, anime: { select: { name: true } } } },
      },
    })
    for (const t of audioTracks) {
      if (t.transcodedCid) {
        roots.set(t.transcodedCid, `AudioTrack.transcodedCid (${t.episode.anime.name} эп.${t.episode.number})`)
      }
    }

    // SubtitleTrack — только legacy
    const subtitleTracks = await prisma.subtitleTrack.findMany({
      where: { episode: { anime: { pinnedLocally: { not: false }, directoryCid: null } } },
      select: {
        fileCid: true,
        episode: { select: { number: true, anime: { select: { name: true } } } },
      },
    })
    for (const t of subtitleTracks) {
      if (t.fileCid) {
        roots.set(t.fileCid, `SubtitleTrack.fileCid (${t.episode.anime.name} эп.${t.episode.number})`)
      }
    }

    // SubtitleFont — только legacy
    const subtitleFonts = await prisma.subtitleFont.findMany({
      where: { subtitleTrack: { episode: { anime: { pinnedLocally: { not: false }, directoryCid: null } } } },
      select: { fileCid: true, fontName: true },
    })
    for (const f of subtitleFonts) {
      if (f.fileCid) {
        roots.set(f.fileCid, `SubtitleFont.fileCid (${f.fontName})`)
      }
    }
  }

  // Намеренно НЕ добавляем prisma.File и prisma.Franchise:
  //
  // Franchise.graphCid публикуется при генерации AnimeManifest и попадает внутрь directoryCid
  // как meta/franchise-graph.json (indirect через DAG любого аниме той же франшизы).
  // Standalone recursive pin для него не нужен — пока хотя бы одно аниме франшизы запинено
  // через directoryCid, граф защищён от GC.
  //
  // File.cid — то же самое: постеры/аватарки/картинки персонажей публикуются как часть
  // AnimeInfo и лежат внутри directoryCid. Standalone pin не нужен.
  //
  // Если в БД остались stale записи Franchise/File без аниме-носителя — это вопрос чистки БД,
  // а не pin-стратегии (повторное закрепление не имеет смысла, CID давно удалён).

  return roots
}

/**
 * Основная функция аудита (упрощённая после введения directoryCid).
 *
 * Логика:
 * - Получаем все recursive pins из Kubo (direct/indirect не интересуют — они защищены через recursive).
 * - Из БД собираем «корневые» CID, которые должны быть recursive-pinned (в основном — directoryCid).
 * - Orphan = recursive pin, которого нет среди ожидаемых корней.
 * - Missing = ожидаемый корень, который не recursive-pinned.
 *
 * Никаких обращений к IPFS (cat/stat/refs) — только pin.ls и БД. Аудит мгновенный.
 */
export async function findOrphanedPins(
  pinnedList?: PinInfo[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- сигнатура сохраняется для обратной совместимости IPC
  _onProgress?: (current: number, total: number, name: string) => void,
  onStep?: (step: string) => void
): Promise<OrphanAuditResult> {
  log.info('=== Аудит хранилища: старт ===')

  // 1. Получаем recursive пины из Kubo (direct пины игнорируем — они и так под recursive)
  onStep?.('Получение recursive pins из Kubo...')
  let recursivePins: PinInfo[]
  if (pinnedList) {
    recursivePins = pinnedList
  } else {
    const kuboService = getKuboService()
    const client = kuboService.getClientOrNull()
    if (!client) {
      log.warn('Kubo клиент недоступен')
      recursivePins = []
    } else {
      recursivePins = []
      for await (const pin of client.pin.ls({ type: 'recursive' })) {
        recursivePins.push({ cid: pin.cid.toString(), size: 0, type: 'raw', pinnedAt: '' })
        if (recursivePins.length % 500 === 0) {
          onStep?.(`Получение recursive pins из Kubo: ${recursivePins.length}...`)
        }
      }
    }
  }
  log.info('[Шаг 1] Recursive pins получены', { count: recursivePins.length })

  // 2. Собираем ожидаемые корни из БД
  onStep?.('Сбор корневых CID из БД...')
  const expectedRoots = await collectExpectedRoots()
  log.info('[Шаг 2] Корни собраны', { roots: expectedRoots.size })

  // 3. Сравниваем
  onStep?.('Сравнение pins и корней...')
  const pinnedCids = recursivePins.map((p) => p.cid)
  const pinnedSet = new Set(pinnedCids)

  const orphanedPins = recursivePins.filter((p) => !expectedRoots.has(p.cid))
  const missingPins: string[] = []
  const missingPinDetails: MissingPinInfo[] = []
  for (const [cid, source] of expectedRoots) {
    if (!pinnedSet.has(cid)) {
      missingPins.push(cid)
      missingPinDetails.push({ cid, source, manifestOnly: false })
    }
  }

  log.info('[Шаг 3] Diff готов', {
    pinned: pinnedCids.length,
    expected: expectedRoots.size,
    orphans: orphanedPins.length,
    missing: missingPins.length,
  })

  // 4. Дополняем размерами orphaned pins (если их немного — иначе UI всё равно усечёт)
  if (orphanedPins.length > 0 && orphanedPins.length <= 500) {
    onStep?.(`Размеры orphaned pins: 0/${orphanedPins.length}...`)
    await enrichWithStat(orphanedPins, onStep)
  }

  log.info('=== Аудит хранилища: завершён ===')

  return {
    dbCids: Array.from(expectedRoots.keys()),
    referencedCids: Array.from(expectedRoots.keys()),
    pinnedCids,
    orphanedPins,
    missingPins,
    missingPinDetails,
    errors: [],
  }
}
