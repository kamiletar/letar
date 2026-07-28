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
import type { ScaleCode } from '../_data/personality-types'
import { SCORED_SCALE_CODES } from '../_data/personality-types'

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

/**
 * Нормализованные результаты. Ключи — ScaleCode (ядро 22 + экспериментальные 5.5):
 * надмножество PersonalityTypeCode, чтение баллов ядра обратно совместимо.
 */
export interface QuizScores {
  raw: Record<ScaleCode, number>
  normalized: Record<ScaleCode, number>
  /** Достоверность каждой шкалы (зависит от числа пройденных релевантных вопросов) */
  confidence: Record<ScaleCode, ScaleConfidence>
  /** Уровень значимости каждой шкалы */
  levels: Record<ScaleCode, ScaleLevel>
  /** Число отвеченных релевантных вопросов по шкале — вход для ipsative-интервалов */
  relevantCounts: Record<ScaleCode, number>
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
  for (const code of SCORED_SCALE_CODES) {
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
): Record<ScaleCode, number> {
  const counts: Record<string, number> = {}
  for (const code of SCORED_SCALE_CODES) {
    counts[code] = 0
  }
  for (const so of answeredSortOrders) {
    const qId = String(so + 1)
    const qMax = data.perQuestionMax[qId]
    if (!qMax) {
      continue
    }
    for (const code of SCORED_SCALE_CODES) {
      if (qMax[code] && qMax[code] > 0) {
        counts[code]++
      }
    }
  }
  return counts as Record<ScaleCode, number>
}

/**
 * Пороги достоверности — по АБСОЛЮТНОМУ числу отвеченных релевантных вопросов.
 *
 * Раньше считалась доля банка (`relevant / totalInBank`), и это давало
 * противоположный смыслу результат: вопросов на шкалу в банке различается в 100+ раз
 * (RES_PHYS — 10, SAD — 21, а AVD — 1192, OBC — 1175). «Высокая достоверность»
 * достигалась за 6 ответов по редкой шкале и за 715 — по населённой, то есть
 * чем больше вопросов по шкале, тем «недостовернее» она выглядела.
 *
 * Точность оценки зависит от абсолютного n (стандартная ошибка убывает как 1/√n),
 * а не от доли банка. Границы выведены из полуширины 95%-интервала Уилсона
 * при худшем случае p = 0.5 — том самом, что уже считается в `ipsative.ts`:
 *
 * | n   | полуширина интервала | уровень      |
 * | --- | -------------------- | ------------ |
 * | < 5 | > ±33 п.п.           | insufficient |
 * | 5   | ±33 п.п.             | low          |
 * | 15  | ±23 п.п.             | moderate     |
 * | 30  | ±17 п.п.             | high         |
 *
 * Следствие, которое важно понимать: по редким шкалам ядра (SAD — 21 вопрос,
 * ASD — 22, MAS — 23) уровень `high` недостижим даже при исчерпании банка.
 * Это честно — оценка по двум десяткам вопросов действительно груба, — и это
 * подсвечивает отдельный техдолг «выровнять банк по редким шкалам».
 */
export const CONFIDENCE_THRESHOLDS = { low: 5, moderate: 15, high: 30 } as const

/** Достоверность шкалы по числу отвеченных релевантных вопросов */
export function confidenceFromCount(relevant: number): ScaleConfidence {
  if (relevant < CONFIDENCE_THRESHOLDS.low) {
    return 'insufficient'
  }
  if (relevant < CONFIDENCE_THRESHOLDS.moderate) {
    return 'low'
  }
  if (relevant < CONFIDENCE_THRESHOLDS.high) {
    return 'moderate'
  }
  return 'high'
}

/**
 * Покрытие банка по шкале (0..1) — доля релевантных вопросов шкалы, на которые
 * человек ответил. Это НЕ достоверность (см. `confidenceFromCount`), а другая
 * величина: «сколько из доступного пройдено». Оставлено отдельным показателем
 * на случай, если понадобится в UI — например, чтобы объяснить, почему по редкой
 * шкале нельзя набрать высокую точность.
 */
export function bankCoverage(relevant: number, totalInBank: number): number {
  return totalInBank > 0 ? Math.min(1, relevant / totalInBank) : 0
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
  return confidenceFromCount(relevant)
}

/** Покрытие банка по шкале (0..1) для списка отвеченных sortOrder */
export function getScaleBankCoverage(
  scale: string,
  answeredSortOrders: number[],
  data: ScoringData = BANK_SCORING_DATA
): number {
  let relevant = 0
  for (const so of answeredSortOrders) {
    const qId = String(so + 1)
    if (data.perQuestionMax[qId]?.[scale] && data.perQuestionMax[qId][scale] > 0) {
      relevant++
    }
  }
  return bankCoverage(relevant, data.totalRelevantByScale[scale] ?? 0)
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
  for (const code of SCORED_SCALE_CODES) {
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

  for (const code of SCORED_SCALE_CODES) {
    const actualMax = computeActualMax(code, answeredSortOrders, data)

    if (actualMax === 0) {
      normalized[code] = 0
      levels[code] = 'insufficient_data'
    } else {
      const norm = (raw[code] / actualMax) * 100
      normalized[code] = Math.round(norm * 10) / 10
      levels[code] = getScaleLevel(norm)
    }

    confidence[code] = confidenceFromCount(relevantCounts[code])
  }

  return {
    raw: raw as Record<ScaleCode, number>,
    normalized: normalized as Record<ScaleCode, number>,
    confidence: confidence as Record<ScaleCode, ScaleConfidence>,
    levels: levels as Record<ScaleCode, ScaleLevel>,
    relevantCounts,
    answersWithSortOrder,
  }
}
