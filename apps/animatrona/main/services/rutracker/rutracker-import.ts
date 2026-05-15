/**
 * Оркестратор импорта из Рутрекера
 *
 * Связывает парсер, матчер и Shikimori API в единый пайплайн:
 * URL → HTML → парсинг → матчинг → подтверждение → (будущее: торрент)
 */

import { broadcastToWindows } from '../../utils/ipc-handler-factory'
import { createModuleLogger } from '../../utils/logger'
import type { ShikimoriAnimeExtended, ShikimoriAnimePreview } from '../shikimori'
import { getAnimeExtended, getAnimeWithRelated, searchAnime } from '../shikimori'

const log = createModuleLogger('RutrackerImport')

/** Отправить текущий этап импорта в renderer */
function sendStep(step: string): void {
  log.info(step)
  broadcastToWindows('rutracker:importStep', step)
}
import {
  type CandidateScore,
  isAutoMatchConfident,
  matchFromDirectLink,
  matchFromMalLink,
  matchFromMalRelated,
  matchFromSearch,
  type MatchResult,
  rankCandidates,
  validateMatchMetadata,
} from './rutracker-matcher'
import { parseRutrackerPage } from './rutracker-parser'
import type { RutrackerTorrentInfo } from './types'

/** Результат полного импорта (Фаза 1-2) */
export interface RutrackerImportResult {
  /** Распарсенные данные раздачи */
  torrent: RutrackerTorrentInfo
  /** Результат матчинга с Shikimori */
  match: MatchResult | null
  /** Нужно ли подтверждение пользователя */
  needsConfirmation: boolean
  /** Кандидаты для ручного выбора (если нет уверенного матча) */
  candidates: CandidateScore[]
  /** Данные Shikimori (если матч найден и подтверждён) */
  shikimoriData?: ShikimoriAnimeExtended
}

/**
 * Ищет правильный сезон через related аниме
 * Когда MAL-ссылка ведёт на первый сезон, а торрент — третий
 */
async function findCorrectSeasonViaRelated(
  malShikimoriId: number,
  torrent: RutrackerTorrentInfo,
): Promise<RutrackerImportResult | null> {
  const withRelated = await getAnimeWithRelated(malShikimoriId)
  if (!withRelated?.related?.length) return null

  // Собираем всех кандидатов из related (sequel, prequel, side_story)
  const relatedCandidates = withRelated.related.filter((rel) => rel.anime != null).map((rel) => rel.anime!)

  if (relatedCandidates.length === 0) return null

  // Ранжируем по метаданным торрента (год, эпизоды, название, тип)
  const scores = rankCandidates(relatedCandidates, torrent)
  if (scores.length === 0) return null

  const best = scores[0]
  // Принимаем только если скор достаточно высокий (год и эпизоды совпадают)
  if (best.breakdown.yearScore < 0.7) return null

  const match = matchFromMalRelated(best.shikimoriId, best)
  const shikimoriData = await getAnimeExtended(best.shikimoriId)

  return {
    torrent,
    match,
    needsConfirmation: true, // Всегда просим подтвердить — нашли косвенно
    candidates: scores,
    shikimoriData: shikimoriData ?? undefined,
  }
}

/**
 * Полный пайплайн: URL → парсинг → матчинг
 *
 * @param html HTML страницы раздачи
 * @param url URL страницы
 */
export async function processRutrackerImport(html: string, url: string): Promise<RutrackerImportResult> {
  const startMs = Date.now()
  sendStep('Парсинг HTML...')

  // 1. Парсинг HTML
  const torrent = parseRutrackerPage(html, url)
  log.info('Парсинг завершён', {
    nameRu: torrent.nameRu,
    nameOriginal: torrent.nameOriginal,
    year: torrent.year,
    episodes: torrent.episodeCount,
    elapsed: Date.now() - startMs,
  })

  // 2. Попытка прямого матчинга по ссылкам
  const directMatch = matchFromDirectLink(torrent)
  if (directMatch) {
    sendStep(`Загрузка данных Shikimori #${directMatch.shikimoriId}...`)
    const shikimoriData = await getAnimeExtended(directMatch.shikimoriId)
    log.info('Импорт завершён (прямой матч)', { elapsed: Date.now() - startMs })
    return {
      torrent,
      match: directMatch,
      needsConfirmation: false,
      candidates: [],
      shikimoriData: shikimoriData ?? undefined,
    }
  }

  // 3. Попытка матчинга по MAL ID
  const malMatch = matchFromMalLink(torrent)
  if (malMatch) {
    sendStep(`Проверка MAL матча → Shikimori #${malMatch.shikimoriId}...`)
    const shikimoriData = await getAnimeExtended(malMatch.shikimoriId)
    if (shikimoriData) {
      // Валидация: год и эпизоды совпадают с торрентом?
      if (validateMatchMetadata(shikimoriData, torrent)) {
        log.info('Импорт завершён (MAL матч)', { elapsed: Date.now() - startMs })
        return {
          torrent,
          match: malMatch,
          needsConfirmation: false,
          candidates: [],
          shikimoriData,
        }
      }

      // MAL ведёт на другой сезон — ищем правильный через related
      sendStep('Поиск правильного сезона через related...')
      const corrected = await findCorrectSeasonViaRelated(malMatch.shikimoriId, torrent)
      if (corrected) {
        log.info('Импорт завершён (MAL→related)', { elapsed: Date.now() - startMs })
        return corrected
      }
    }
    // MAL ID не совпал с Shikimori → фоллбэк на поиск
    log.info('MAL матч не найден на Shikimori, фоллбэк на поиск')
  }

  // 4. Поиск по обоим названиям (оригинальному и русскому) для лучшего покрытия
  // Пример: "Phi Brain: Kami no Puzzle" (без "2") + "Фи Брейн: Загадка Бога 2" (с "2")
  const searchQueries = new Set<string>()
  if (torrent.nameOriginal) searchQueries.add(torrent.nameOriginal)
  if (torrent.nameRu && torrent.nameRu !== torrent.nameOriginal) searchQueries.add(torrent.nameRu)

  const searchResults: ShikimoriAnimePreview[] = []
  const seenIds = new Set<string>()

  for (const query of searchQueries) {
    sendStep(`Поиск «${query}» на Shikimori...`)
    const results = await searchAnime({ search: query, limit: 10 })
    for (const r of results) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id)
        searchResults.push(r)
      }
    }
  }

  if (searchResults.length === 0) {
    return {
      torrent,
      match: null,
      needsConfirmation: true,
      candidates: [],
    }
  }

  // 5. Ранжирование кандидатов
  const candidates = rankCandidates(searchResults, torrent)
  const match = matchFromSearch(candidates)

  // 6. Авто-принятие если достаточно уверены
  const autoMatch = isAutoMatchConfident(candidates)

  let shikimoriData: ShikimoriAnimeExtended | undefined
  if (autoMatch && match) {
    shikimoriData = (await getAnimeExtended(match.shikimoriId)) ?? undefined
  }

  return {
    torrent,
    match,
    needsConfirmation: !autoMatch,
    candidates,
    shikimoriData,
  }
}

/**
 * Подтверждение выбора пользователем (для UI)
 * Загружает полные данные Shikimori для выбранного кандидата
 */
export async function confirmShikimoriMatch(shikimoriId: number): Promise<ShikimoriAnimeExtended | null> {
  return getAnimeExtended(shikimoriId)
}
