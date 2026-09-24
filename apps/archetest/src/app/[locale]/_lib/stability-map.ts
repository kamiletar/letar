import { ALL_SCALE_CODES, type ScaleCode } from '../_data/personality-types'
import { wilsonInterval } from './ipsative'

/*
 * Карта стабильности профиля (пул 2026-09-24, волна 7.2) — кабинет психолога, ≥ 3 сессий.
 *
 * Главный риск — принять шум порции за смену состояния: в порции из 48 вопросов на шкалу
 * приходится 2–3 релевантных, и балл одной сессии гуляет сам по себе. Поэтому шкала
 * считается «меняющейся» не по разбросу баллов, а когда 95%-интервалы её сессий не имеют
 * общей точки (ни одно значение черты не объясняет все сессии разом). Интервал — Уилсона
 * по числу релевантных ответов, как в ipsative-ранжировании.
 */

/** Минимум сессий с данными по шкале, чтобы судить о стабильности */
export const STABILITY_MIN_SESSIONS = 3
/** Минимум релевантных ответов шкалы в сессии, чтобы сессия участвовала */
export const STABILITY_MIN_N = 3
/** Разбивка по настроению: минимум сессий в каждой группе («в грусти» и «в ресурсе») */
export const MOOD_SPLIT_MIN_SESSIONS = 2
/** Разбивка по настроению: минимальная разница средних (пункты), чтобы показать шкалу */
export const MOOD_SPLIT_MIN_DIFF = 15

export interface StabilitySession {
  normalized: Record<ScaleCode, number> | null
  relevantCounts: Record<ScaleCode, number> | null
  /** Mood check-in: 1 — негативная валентность, 3 — позитивная, null — пропущен */
  moodValence: number | null
}

export type ScaleStability = 'stable' | 'shifting' | 'insufficient'

export interface ScaleStabilityRow {
  code: ScaleCode
  status: ScaleStability
  /** Сессий, где у шкалы хватило ответов */
  sessions: number
  min: number
  max: number
}

/** Пары (балл, n) шкалы по сессиям, где ответов хватает */
function measured(sessions: readonly StabilitySession[], code: ScaleCode): { value: number; n: number }[] {
  return sessions.flatMap((s) => {
    const n = s.relevantCounts?.[code] ?? 0
    const value = s.normalized?.[code]
    return value !== undefined && n >= STABILITY_MIN_N ? [{ value, n }] : []
  })
}

export function computeStabilityMap(
  sessions: readonly StabilitySession[],
  codes: readonly ScaleCode[] = ALL_SCALE_CODES,
): { eligibleSessions: number; scales: ScaleStabilityRow[] } {
  const scales = codes.map((code): ScaleStabilityRow => {
    const points = measured(sessions, code)
    const values = points.map((p) => p.value)
    const row = {
      code,
      sessions: points.length,
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0,
    }
    if (points.length < STABILITY_MIN_SESSIONS) {
      return { ...row, status: 'insufficient' }
    }
    // Общая точка всех интервалов есть, если самая высокая нижняя граница не выше самой низкой верхней
    const bounds = points.map((p) => wilsonInterval(p.value / 100, p.n))
    const highestLow = Math.max(...bounds.map((b) => b.low))
    const lowestHigh = Math.min(...bounds.map((b) => b.high))
    return { ...row, status: highestLow > lowestHigh ? 'shifting' : 'stable' }
  })
  return { eligibleSessions: sessions.filter((s) => s.normalized).length, scales }
}

export interface MoodSplitRow {
  code: ScaleCode
  /** Средний балл в сессиях с негативной валентностью */
  low: number
  /** Средний балл в сессиях с позитивной валентностью */
  high: number
  /** high − low */
  diff: number
}

const mean = (xs: number[]) => Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10

/**
 * «Профиль в грусти vs в ресурсе» (отложено из 5.9.2): средние по сессиям с валентностью 1
 * и 3. Разведочная разбивка — гипотеза для разговора с клиентом, не вывод: групп мало,
 * и состояние на чек-ине не равно состоянию на всей порции.
 */
export function computeMoodSplit(
  sessions: readonly StabilitySession[],
  codes: readonly ScaleCode[] = ALL_SCALE_CODES,
): { available: boolean; lowCount: number; highCount: number; scales: MoodSplitRow[] } {
  const low = sessions.filter((s) => s.moodValence === 1 && s.normalized)
  const high = sessions.filter((s) => s.moodValence === 3 && s.normalized)
  const available = low.length >= MOOD_SPLIT_MIN_SESSIONS && high.length >= MOOD_SPLIT_MIN_SESSIONS
  if (!available) {
    return { available, lowCount: low.length, highCount: high.length, scales: [] }
  }
  const scales = codes.flatMap((code): MoodSplitRow[] => {
    const a = measured(low, code).map((p) => p.value)
    const b = measured(high, code).map((p) => p.value)
    if (a.length < MOOD_SPLIT_MIN_SESSIONS || b.length < MOOD_SPLIT_MIN_SESSIONS) {
      return []
    }
    const row = { code, low: mean(a), high: mean(b), diff: Math.round((mean(b) - mean(a)) * 10) / 10 }
    return Math.abs(row.diff) >= MOOD_SPLIT_MIN_DIFF ? [row] : []
  })
  scales.sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff))
  return { available, lowCount: low.length, highCount: high.length, scales }
}
