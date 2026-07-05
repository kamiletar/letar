/**
 * Логика safety-net (этап 5.6.4): когда показывать кризисный блок и мягкую
 * формулировку по тёмным шкалам. Чистые функции без побочных эффектов —
 * тестируются изолированно (safety-net.test.ts) и переиспользуются в UI.
 */

import {
  DARK_REASSURANCE_SCALES,
  DARK_REASSURANCE_THRESHOLD,
  SAFETY_NET_THRESHOLD,
  SAFETY_NET_TRIGGER_SCALES,
} from '../_data/crisis-resources'
import type { PersonalityTypeCode } from '../_data/personality-types'

/** Частичный набор баллов — на экране экспресса есть не все шкалы. */
type Scores = Partial<Record<PersonalityTypeCode, number>>

/**
 * Реестр вопросов-маркеров суицидального риска (аналог PHQ-9 item 9).
 *
 * ⚠️ ПОКА ПУСТ. Настоящий маркер требует вопроса, размеченного психологом
 * (зависимость от этапа 5.6.2 — маппинг на PHQ-9). Придумывать клинический
 * порог/вопрос самостоятельно нельзя — safety-функцию нельзя фабриковать.
 *
 * Активация: добавить сюда `{ sortOrder, riskOptionIndices }` для размеченного
 * вопроса — `hasSafetyMarker` начнёт срабатывать без изменений в UI.
 */
export interface SuicideRiskMarker {
  /** sortOrder вопроса-маркера в банке (0-based) */
  sortOrder: number
  /** Индексы опций, выбор которых считается маркером риска */
  riskOptionIndices: number[]
}

export const SUICIDE_RISK_MARKERS: SuicideRiskMarker[] = []

const MARKERS_BY_SORT_ORDER = new Map(SUICIDE_RISK_MARKERS.map((m) => [m.sortOrder, m]))

/**
 * Есть ли среди ответов маркер суицидального риска.
 * Работает на данных уровня ответов (sortOrder + выбранная опция), доступных
 * серверно в calculateScores. Пока реестр пуст — всегда false.
 */
export function hasSafetyMarker(answers: { sortOrder: number; selectedOption: number }[]): boolean {
  if (MARKERS_BY_SORT_ORDER.size === 0) {
    return false
  }
  for (const a of answers) {
    const marker = MARKERS_BY_SORT_ORDER.get(a.sortOrder)
    if (marker && marker.riskOptionIndices.includes(a.selectedOption)) {
      return true
    }
  }
  return false
}

/**
 * Нужен ли кризисный блок с телефонами доверия.
 * Триггер: любая шкала состояния (DPR/BAR/BOR) ≥ порога ИЛИ явный маркер риска.
 *
 * @param scores нормализованные баллы (0–100)
 * @param opts.marker результат hasSafetyMarker (по умолчанию false)
 */
export function needsSafetyNet(scores: Scores, opts?: { marker?: boolean }): boolean {
  if (opts?.marker) {
    return true
  }
  return SAFETY_NET_TRIGGER_SCALES.some((code) => (scores[code] ?? 0) >= SAFETY_NET_THRESHOLD)
}

/**
 * Нужна ли мягкая дестигматизирующая формулировка по тёмным шкалам.
 * Триггер: любая тёмная шкала (MAC/NAR/PSY(ANT)/SAD/MAS) ≥ порога.
 */
export function needsDarkReassurance(scores: Scores): boolean {
  return DARK_REASSURANCE_SCALES.some((code) => (scores[code] ?? 0) >= DARK_REASSURANCE_THRESHOLD)
}
