/**
 * Чистое ядро скоринга (этап 5.6) — без next/db-зависимостей.
 *
 * Вынесено из quiz.action.ts ('use server'-модуль тянет next-зависимости и
 * не поддаётся unit-тестированию). Server action остаётся тонкой обёрткой:
 * загружает вопросы из БД и передаёт сюда уже разрешённые данные.
 *
 * Формула нормализации (TZ v2): normalized[S] = (raw[S] / actual_max[S]) × 100,
 * где actual_max[S] — сумма макс. баллов шкалы S по отвеченным вопросам.
 */
import maxScoresData from '../_data/max-scores-per-question.json'
import type { PersonalityTypeCode } from '../_data/personality-types'
import { ALL_SCALE_CODES } from '../_data/personality-types'

/** Формат опции из БД */
export interface QuizOptionData {
  text: string
  textEn: string
  scoring: Record<string, number>
}

/** Уровень достоверности шкалы */
export type ScaleConfidence = 'insufficient' | 'low' | 'moderate' | 'high'

/** Уровень значимости шкалы */
export type ScaleLevel = 'minimal' | 'moderate' | 'significant' | 'high' | 'extreme' | 'insufficient_data'

/** Нормализованные результаты */
export interface QuizScores {
  raw: Record<PersonalityTypeCode, number>
  normalized: Record<PersonalityTypeCode, number>
  /** Достоверность каждой шкалы (зависит от числа пройденных релевантных вопросов) */
  confidence: Record<PersonalityTypeCode, ScaleConfidence>
  /** Уровень значимости каждой шкалы */
  levels: Record<PersonalityTypeCode, ScaleLevel>
  /** Число отвеченных релевантных вопросов по шкале — вход для ipsative-интервалов */
  relevantCounts: Record<PersonalityTypeCode, number>
  /** Ответы с sortOrder — для вычисления валидности протокола */
  answersWithSortOrder: { sortOrder: number; selectedOption: number }[]
}

/** Ответ с уже разрешёнными данными вопроса (загрузка из БД — снаружи ядра) */
export interface AnsweredQuestionInput {
  sortOrder: number
  selectedOption: number
  options: QuizOptionData[]
}

/** Справочник максимумов баллов — инжектируем в тестах, дефолт — банк из JSON психолога */
export interface ScoringData {
  /** questionNumber (1-based, sortOrder+1) → шкала → макс. балл вопроса по шкале */
  perQuestionMax: Record<string, Record<string, number>>
  /** Общее число релевантных вопросов банка по каждой шкале */
  totalRelevantByScale: Record<string, number>
}

/** Общее количество релевантных вопросов по каждой шкале */
export function buildTotalRelevantByScale(perQuestionMax: Record<string, Record<string, number>>) {
  const totals: Record<string, number> = {}
  for (const code of ALL_SCALE_CODES) {
    let count = 0
    for (const qMax of Object.values(perQuestionMax)) {
      if (qMax[code] && qMax[code] > 0) {
        count++
      }
    }
    totals[code] = count
  }
  return totals
}

const bankPerQuestionMax = maxScoresData.per_question_max as Record<string, Record<string, number>>

/** Данные реального банка вопросов (из JSON от психолога) */
export const BANK_SCORING_DATA: ScoringData = {
  perQuestionMax: bankPerQuestionMax,
  totalRelevantByScale: buildTotalRelevantByScale(bankPerQuestionMax),
}

/** Определить уровень значимости */
export function getScaleLevel(normalized: number): ScaleLevel {
  if (normalized < 20) {
    return 'minimal'
  }
  if (normalized < 40) {
    return 'moderate'
  }
  if (normalized < 60) {
    return 'significant'
  }
  if (normalized < 80) {
    return 'high'
  }
  return 'extreme'
}

/** actual_max шкалы: сумма макс. баллов шкалы по отвеченным вопросам */
export function computeActualMax(scale: string, answeredSortOrders: number[], data: ScoringData = BANK_SCORING_DATA) {
  let actualMax = 0
  for (const so of answeredSortOrders) {
    const qId = String(so + 1) // sortOrder 0-based → questionNumber 1-based
    const qMax = data.perQuestionMax[qId]
    if (qMax?.[scale]) {
      actualMax += qMax[scale]
    }
  }
  return actualMax
}

/** Число отвеченных релевантных вопросов по каждой шкале */
export function countRelevantAnswered(
  answeredSortOrders: number[],
  data: ScoringData = BANK_SCORING_DATA
): Record<PersonalityTypeCode, number> {
  const counts: Record<string, number> = {}
  for (const code of ALL_SCALE_CODES) {
    counts[code] = 0
  }
  for (const so of answeredSortOrders) {
    const qId = String(so + 1)
    const qMax = data.perQuestionMax[qId]
    if (!qMax) {
      continue
    }
    for (const code of ALL_SCALE_CODES) {
      if (qMax[code] && qMax[code] > 0) {
        counts[code]++
      }
    }
  }
  return counts as Record<PersonalityTypeCode, number>
}

/** Достоверность шкалы по числу пройденных релевантных вопросов относительно банка */
export function confidenceFromCount(relevant: number, totalInBank: number): ScaleConfidence {
  const ratio = relevant / (totalInBank || 1)
  if (ratio < 0.1) {
    return 'insufficient'
  }
  if (ratio < 0.3) {
    return 'low'
  }
  if (ratio < 0.6) {
    return 'moderate'
  }
  return 'high'
}

/** Определить достоверность шкалы по списку отвеченных sortOrder */
export function getScaleConfidence(
  scale: string,
  answeredSortOrders: number[],
  data: ScoringData = BANK_SCORING_DATA
): ScaleConfidence {
  let relevant = 0
  for (const so of answeredSortOrders) {
    const qId = String(so + 1)
    if (data.perQuestionMax[qId]?.[scale] && data.perQuestionMax[qId][scale] > 0) {
      relevant++
    }
  }
  return confidenceFromCount(relevant, data.totalRelevantByScale[scale] || 1)
}

/**
 * Посчитать баллы по ответам — авторитетная версия, общая для сервера.
 * Вход не мутируется. Ответы с невалидным индексом опции игнорируются в raw,
 * но участвуют в answersWithSortOrder (как в исходном calculateScores).
 */
export function computeScoresCore(
  answered: AnsweredQuestionInput[],
  data: ScoringData = BANK_SCORING_DATA
): QuizScores {
  const raw: Record<string, number> = {}
  for (const code of ALL_SCALE_CODES) {
    raw[code] = 0
  }

  const answeredSortOrders: number[] = []
  const answersWithSortOrder: { sortOrder: number; selectedOption: number }[] = []

  for (const answer of answered) {
    answeredSortOrders.push(answer.sortOrder)
    answersWithSortOrder.push({ sortOrder: answer.sortOrder, selectedOption: answer.selectedOption })

    const option = answer.options[answer.selectedOption]
    if (!option) {
      continue
    }

    for (const [typeCode, score] of Object.entries(option.scoring)) {
      raw[typeCode] = (raw[typeCode] || 0) + score
    }
  }

  const relevantCounts = countRelevantAnswered(answeredSortOrders, data)

  const normalized: Record<string, number> = {}
  const confidence: Record<string, ScaleConfidence> = {}
  const levels: Record<string, ScaleLevel> = {}

  for (const code of ALL_SCALE_CODES) {
    const actualMax = computeActualMax(code, answeredSortOrders, data)

    if (actualMax === 0) {
      normalized[code] = 0
      levels[code] = 'insufficient_data'
    } else {
      const norm = (raw[code] / actualMax) * 100
      normalized[code] = Math.round(norm * 10) / 10
      levels[code] = getScaleLevel(norm)
    }

    confidence[code] = confidenceFromCount(relevantCounts[code], data.totalRelevantByScale[code] || 1)
  }

  return {
    raw: raw as Record<PersonalityTypeCode, number>,
    normalized: normalized as Record<PersonalityTypeCode, number>,
    confidence: confidence as Record<PersonalityTypeCode, ScaleConfidence>,
    levels: levels as Record<PersonalityTypeCode, ScaleLevel>,
    relevantCounts,
    answersWithSortOrder,
  }
}
