/**
 * Расчёт рейтинга загрузчика (uploaderScore + uploaderRank)
 *
 * Формула:
 * - publishedAnimeCount * 100
 * - totalViewers * 2 (суммарные зрители всех аниме)
 * - totalLibraryAdds * 5 (суммарные добавления в библиотеку)
 * - avgUserRating * 50 (средний рейтинг аниме, 0-10)
 * - totalBytesUploaded / 1GB * 10 (IPFS раздача)
 */

const ONE_GB = 1024 * 1024 * 1024

/** Ранги загрузчиков */
const RANKS = [
  { minScore: 10000, rank: 'Легенда' },
  { minScore: 2000, rank: 'Мастер' },
  { minScore: 500, rank: 'Опытный' },
  { minScore: 100, rank: 'Загрузчик' },
  { minScore: 0, rank: 'Новичок' },
] as const

/** Цвета рангов для UI */
export const RANK_COLORS: Record<string, string> = {
  Легенда: 'purple',
  Мастер: 'orange',
  Опытный: 'blue',
  Загрузчик: 'green',
  Новичок: 'gray',
}

/** Следующий ранг и сколько очков до него */
export function getNextRank(score: number): { rank: string; minScore: number } | null {
  for (const r of RANKS) {
    if (score < r.minScore) {
      return { rank: r.rank, minScore: r.minScore }
    }
  }
  return null // Уже Легенда
}

export interface UploaderScoreInput {
  /** Количество опубликованных аниме */
  publishedAnimeCount: number
  /** Суммарные зрители всех аниме */
  totalViewers: number
  /** Суммарные добавления в библиотеку */
  totalLibraryAdds: number
  /** Средний рейтинг аниме (0-10, null если нет оценок) */
  avgUserRating: number | null
  /** Всего байт отдано через IPFS (BigInt → Number) */
  totalBytesUploaded: number
}

/** Рассчитать score загрузчика */
export function calculateUploaderScore(input: UploaderScoreInput): number {
  const score =
    input.publishedAnimeCount * 100 +
    input.totalViewers * 2 +
    input.totalLibraryAdds * 5 +
    (input.avgUserRating ?? 0) * 50 +
    Math.floor(input.totalBytesUploaded / ONE_GB) * 10

  return Math.round(score)
}

/** Определить ранг по score */
export function getRank(score: number): string {
  for (const r of RANKS) {
    if (score >= r.minScore) {
      return r.rank
    }
  }
  return 'Новичок'
}
