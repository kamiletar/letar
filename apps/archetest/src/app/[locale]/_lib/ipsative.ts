/**
 * Ipsative-ранжирование профиля (этап 5.6) — интерпретационный слой ПОВЕРХ normalized.
 *
 * Принцип (решение 2026-06-18): «% от максимума» несопоставим МЕЖДУ шкалами
 * (разное число вопросов, разные максимумы), поэтому ведущие черты определяются
 * ipsative-ранжированием — сравнением шкал ВНУТРИ профиля одного человека.
 * Сравнение с другими людьми появится с нормативными перцентилями (5.6.2, N ≈ 200–300).
 *
 * Доверительный интервал — 95%-приближение Уилсона: балл шкалы трактуется как доля
 * от максимума на n отвеченных релевантных вопросах. Баллы вопросов не бинарны,
 * поэтому интервал — честный ориентир точности, а не строгая статистика (подписывается
 * в UI как ориентир). Соседние по рангу шкалы с перекрывающимися интервалами
 * статистически неразличимы — UI обязан показывать это, а не ложную точность
 * «61,2% > 60,8%».
 *
 * Как и interpretation-rules: чистая функция, вход не мутируется, raw/normalized
 * в БД не затрагиваются.
 */
import type { PersonalityTypeCode } from '../_data/personality-types'
import { ALL_SCALE_CODES } from '../_data/personality-types'

/** z-квантиль для 95%-интервала */
export const IPSATIVE_Z = 1.96

/** Шкала в ipsative-ранжировании профиля */
export interface IpsativeScale {
  code: PersonalityTypeCode
  /** Ранг внутри профиля: 1 — самая выраженная */
  rank: number
  /** Нормализованный балл 0–100 (как в QuizScores.normalized) */
  normalized: number
  /** Нижняя граница 95%-интервала, 0–100 */
  ciLow: number
  /** Верхняя граница 95%-интервала, 0–100 */
  ciHigh: number
  /** Число отвеченных релевантных вопросов шкалы (ширина интервала зависит от него) */
  n: number
  /**
   * Группа статистически неразличимых соседей (0-based): смежные по рангу шкалы
   * с перекрывающимися интервалами попадают в одну группу (транзитивно по цепочке)
   */
  tieGroup: number
}

/**
 * 95%-интервал Уилсона для доли p на n наблюдениях.
 * Возвращает границы в долях [0, 1]. n ≤ 0 → полная неопределённость [0, 1].
 */
export function wilsonInterval(p: number, n: number, z: number = IPSATIVE_Z): { low: number; high: number } {
  if (n <= 0) {
    return { low: 0, high: 1 }
  }
  const clamped = Math.min(1, Math.max(0, p))
  const z2 = z * z
  const denom = 1 + z2 / n
  const center = (clamped + z2 / (2 * n)) / denom
  const half = (z / denom) * Math.sqrt((clamped * (1 - clamped)) / n + z2 / (4 * n * n))
  return {
    low: Math.max(0, center - half),
    high: Math.min(1, center + half),
  }
}

/** Перекрываются ли интервалы двух шкал (следовательно — статистически неразличимы) */
export function intervalsOverlap(
  a: Pick<IpsativeScale, 'ciLow' | 'ciHigh'>,
  b: Pick<IpsativeScale, 'ciLow' | 'ciHigh'>
) {
  return a.ciLow <= b.ciHigh && b.ciLow <= a.ciHigh
}

/**
 * Ipsative-ранжирование шкал внутри профиля.
 * Вход НЕ мутируется. Сортировка: normalized по убыванию, при равенстве — код
 * по алфавиту (детерминированность между сессиями).
 */
export function computeIpsativeRanking(
  normalized: Record<PersonalityTypeCode, number>,
  relevantCounts: Record<PersonalityTypeCode, number>,
  options?: { exclude?: readonly PersonalityTypeCode[] }
): IpsativeScale[] {
  const excluded = new Set(options?.exclude ?? [])

  const entries = ALL_SCALE_CODES.filter((code) => !excluded.has(code)).map((code) => {
    const score = normalized[code] ?? 0
    const n = relevantCounts[code] ?? 0
    const ci = wilsonInterval(score / 100, n)
    return {
      code,
      normalized: score,
      ciLow: round1(ci.low * 100),
      ciHigh: round1(ci.high * 100),
      n,
    }
  })

  entries.sort((a, b) => b.normalized - a.normalized || a.code.localeCompare(b.code))

  // Группировка неразличимых соседей: цепочка перекрытий склеивает группу
  const result: IpsativeScale[] = []
  let tieGroup = 0
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && !intervalsOverlap(entries[i - 1], entries[i])) {
      tieGroup++
    }
    result.push({ ...entries[i], rank: i + 1, tieGroup })
  }

  return result
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
