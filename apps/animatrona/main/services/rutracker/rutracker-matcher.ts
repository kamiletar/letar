/**
 * Матчинг раздачи Рутрекера с Shikimori
 *
 * Стратегия:
 * 1. Если в ссылках есть shikimoriId → прямой запрос getAnimeExtended
 * 2. Если есть malId → поиск по названию + фильтр по MAL ID
 * 3. Фоллбэк: поиск по оригинальному/русскому названию + ранжирование
 */

import type { ShikimoriAnimePreview } from '../shikimori'
import type { RutrackerTorrentInfo } from './types'

/** Результат матчинга */
export interface MatchResult {
  /** Shikimori ID */
  shikimoriId: number
  /** Уровень уверенности (0..1) */
  confidence: number
  /** Метод, которым найдено */
  method: 'direct-link' | 'mal-link' | 'search-title'
  /** Подробности для отладки */
  details: string
}

/** Результат ранжирования одного кандидата */
export interface CandidateScore {
  /** Shikimori ID */
  shikimoriId: number
  /** Итоговый скор (0..1) */
  score: number
  /** Разбивка скора по факторам */
  breakdown: {
    titleScore: number
    yearScore: number
    typeScore: number
    episodeScore: number
  }
}

/**
 * Нормализует строку для нечёткого сравнения
 * Убирает пунктуацию, приводит к нижнему регистру, нормализует пробелы
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[☆★♪♫♬♩]/g, '') // Музыкальные символы
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // Оставляем только буквы, цифры, пробелы
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Вычисляет похожесть двух строк (0..1)
 * Используем комбинацию: точное совпадение > содержание > n-gram
 */
export function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a)
  const nb = normalizeTitle(b)

  if (!na || !nb) {
    return 0
  }

  // Точное совпадение
  if (na === nb) {
    return 1.0
  }

  // Одна содержит другую
  if (na.includes(nb) || nb.includes(na)) {
    const shorter = na.length < nb.length ? na : nb
    const longer = na.length >= nb.length ? na : nb

    // Проверяем, отличаются ли строки только номером сезона в конце
    // "загадка бога" vs "загадка бога 2" — разные сезоны, штраф
    const trailingDiff = longer.slice(shorter.length).trim()
    if (/^\d+$/.test(trailingDiff)) {
      return 0.5
    }

    return 0.7 + 0.3 * (shorter.length / longer.length)
  }

  // Bigram similarity (коэффициент Дайса)
  const bigramsA = getBigrams(na)
  const bigramsB = getBigrams(nb)

  if (bigramsA.size === 0 || bigramsB.size === 0) {
    return 0
  }

  let intersection = 0
  for (const bigram of bigramsA) {
    if (bigramsB.has(bigram)) {
      intersection++
    }
  }

  return (2 * intersection) / (bigramsA.size + bigramsB.size)
}

/** Извлекает множество биграмм из строки */
function getBigrams(text: string): Set<string> {
  const bigrams = new Set<string>()
  for (let i = 0; i < text.length - 1; i++) {
    bigrams.add(text.slice(i, i + 2))
  }
  return bigrams
}

/**
 * Маппинг типа из Рутрекера в формат Shikimori
 */
function mapTypeToShikimori(rutrackerType?: string): string | undefined {
  if (!rutrackerType) {
    return undefined
  }
  const lower = rutrackerType.toLowerCase()
  if (lower.includes('tv')) {
    return 'tv'
  }
  if (lower.includes('movie') || lower.includes('фильм')) {
    return 'movie'
  }
  if (lower.includes('ova')) {
    return 'ova'
  }
  if (lower.includes('ona')) {
    return 'ona'
  }
  if (lower.includes('special') || lower.includes('спешл')) {
    return 'special'
  }
  return undefined
}

/**
 * Ранжирует кандидатов из Shikimori по данным из Рутрекера
 *
 * Факторы (с весами):
 * - Похожесть названия: 0.5
 * - Совпадение года: 0.2
 * - Совпадение типа: 0.15
 * - Совпадение эпизодов: 0.15
 */
export function rankCandidates(candidates: ShikimoriAnimePreview[], torrent: RutrackerTorrentInfo): CandidateScore[] {
  return candidates
    .map((candidate) => {
      const shikimoriId = Number(candidate.id)

      // Похожесть названия (max из русского и оригинального)
      const titleScores: number[] = []

      // Сравниваем русские названия
      if (candidate.russian && torrent.nameRu) {
        titleScores.push(titleSimilarity(candidate.russian, torrent.nameRu))
      }
      // Сравниваем оригинальные названия
      if (candidate.name && torrent.nameOriginal) {
        titleScores.push(titleSimilarity(candidate.name, torrent.nameOriginal))
      }
      // Кросс-сравнения
      if (candidate.name && torrent.nameRu) {
        titleScores.push(titleSimilarity(candidate.name, torrent.nameRu) * 0.8)
      }
      if (candidate.russian && torrent.nameOriginal) {
        titleScores.push(titleSimilarity(candidate.russian, torrent.nameOriginal) * 0.8)
      }

      const titleScore = Math.max(0, ...titleScores)

      // Совпадение года
      let yearScore = 0.5 // Нейтральный скор если нет данных
      if (torrent.year && candidate.airedOn?.year) {
        const diff = Math.abs(torrent.year - candidate.airedOn.year)
        if (diff === 0) {
          yearScore = 1.0
        } else if (diff === 1) {
          yearScore = 0.7
        } // Может отличаться на 1 год
        else {
          yearScore = 0
        }
      }

      // Совпадение типа
      let typeScore = 0.5
      const shikiKind = mapTypeToShikimori(torrent.type)
      if (shikiKind && candidate.kind) {
        typeScore = shikiKind === candidate.kind ? 1.0 : 0.2
      }

      // Совпадение количества эпизодов
      let episodeScore = 0.5
      if (torrent.episodeCount && candidate.episodes > 0) {
        const diff = Math.abs(torrent.episodeCount - candidate.episodes)
        if (diff === 0) {
          episodeScore = 1.0
        } else if (diff <= 1) {
          episodeScore = 0.8
        } // Может быть +1 спешл
        else if (diff <= 3) {
          episodeScore = 0.5
        } else {
          episodeScore = 0.1
        }
      }

      const score = titleScore * 0.5 + yearScore * 0.2 + typeScore * 0.15 + episodeScore * 0.15

      return {
        shikimoriId,
        score,
        breakdown: { titleScore, yearScore, typeScore, episodeScore },
      }
    })
    .sort((a, b) => b.score - a.score)
}

/**
 * Определяет, можно ли автоматически принять лучший результат
 * Требования: уверенность >= 0.75 и значительный отрыв от второго
 */
export function isAutoMatchConfident(scores: CandidateScore[]): boolean {
  if (scores.length === 0) {
    return false
  }
  if (scores[0].score < 0.75) {
    return false
  }
  if (scores.length === 1) {
    return scores[0].score >= 0.75
  }

  // Отрыв от второго кандидата >= 0.15
  const gap = scores[0].score - scores[1].score
  return gap >= 0.15
}

/**
 * Создаёт MatchResult из прямой ссылки (shikimoriId из парсера)
 */
export function matchFromDirectLink(torrent: RutrackerTorrentInfo): MatchResult | null {
  if (torrent.externalLinks.shikimoriId) {
    return {
      shikimoriId: torrent.externalLinks.shikimoriId,
      confidence: 1.0,
      method: 'direct-link',
      details: `Прямая ссылка: ${torrent.externalLinks.shikimoriUrl}`,
    }
  }
  return null
}

/**
 * Создаёт MatchResult из MAL ссылки
 * (Shikimori часто использует тот же ID что и MAL)
 */
export function matchFromMalLink(torrent: RutrackerTorrentInfo): MatchResult | null {
  if (torrent.externalLinks.malId) {
    return {
      shikimoriId: torrent.externalLinks.malId,
      confidence: 0.9,
      method: 'mal-link',
      details: `MAL ID: ${torrent.externalLinks.malId} (${torrent.externalLinks.malUrl})`,
    }
  }
  return null
}

/**
 * Проверяет, совпадает ли аниме с торрентом по году и эпизодам
 * Возвращает false если год отличается на > 1 или эпизоды сильно не совпадают
 */
export function validateMatchMetadata(
  anime: { airedOn?: { year?: number | null } | null; episodes?: number },
  torrent: RutrackerTorrentInfo,
): boolean {
  // Проверка года — основной индикатор правильного сезона
  if (torrent.year && anime.airedOn?.year) {
    const yearDiff = Math.abs(torrent.year - anime.airedOn.year)
    if (yearDiff > 1) {
      return false
    }
  }

  // Проверка эпизодов — дополнительная валидация
  if (torrent.episodeCount && anime.episodes && anime.episodes > 0) {
    const epDiff = Math.abs(torrent.episodeCount - anime.episodes)
    // Более 50% разницы — явно не то
    if (epDiff > Math.max(torrent.episodeCount, anime.episodes) * 0.5) {
      return false
    }
  }

  return true
}

/**
 * Создаёт MatchResult из related-аниме (когда MAL ведёт на другой сезон)
 */
export function matchFromMalRelated(shikimoriId: number, score: CandidateScore): MatchResult {
  return {
    shikimoriId,
    confidence: Math.min(score.score, 0.85), // Не выше 0.85 — нужно подтверждение
    method: 'mal-link' as const,
    details: `Через related: скор ${score.score.toFixed(3)} (title: ${score.breakdown.titleScore.toFixed(2)}, year: ${
      score.breakdown.yearScore.toFixed(
        2,
      )
    }, type: ${score.breakdown.typeScore.toFixed(2)}, ep: ${score.breakdown.episodeScore.toFixed(2)})`,
  }
}

/**
 * Создаёт MatchResult из лучшего кандидата поиска
 */
export function matchFromSearch(scores: CandidateScore[]): MatchResult | null {
  if (scores.length === 0) {
    return null
  }

  const best = scores[0]
  return {
    shikimoriId: best.shikimoriId,
    confidence: best.score,
    method: 'search-title',
    details: `Поиск по названию, скор: ${best.score.toFixed(3)} (title: ${
      best.breakdown.titleScore.toFixed(
        2,
      )
    }, year: ${best.breakdown.yearScore.toFixed(2)}, type: ${best.breakdown.typeScore.toFixed(2)}, ep: ${
      best.breakdown.episodeScore.toFixed(
        2,
      )
    })`,
  }
}
