import { describe, expect, it } from 'vitest'
import { ALL_SCALE_CODES } from '../_data/personality-types'
import type { AnsweredQuestionInput, QuizOptionData, ScoringData } from './scoring-core'
import {
  BANK_SCORING_DATA,
  buildTotalRelevantByScale,
  computeActualMax,
  computeScoresCore,
  confidenceFromCount,
  countRelevantAnswered,
  getScaleConfidence,
  getScaleLevel,
} from './scoring-core'

/** Мини-фабрика опций вопроса с заданным scoring */
function opts(...scorings: Record<string, number>[]): QuizOptionData[] {
  return scorings.map((scoring, i) => ({ text: `opt-${i}`, textEn: `opt-en-${i}`, scoring }))
}

/**
 * Тестовый справочник максимумов: 4 вопроса (номера 1–4 ↔ sortOrder 0–3).
 * MAC: 2 релевантных вопроса, NAR: 1, HUM: 2 — остальные шкалы не покрыты.
 */
const perQuestionMax: Record<string, Record<string, number>> = {
  '1': { MAC: 3, NAR: 2 },
  '2': { MAC: 3 },
  '3': { HUM: 4 },
  '4': { HUM: 2 },
}
const data: ScoringData = { perQuestionMax, totalRelevantByScale: buildTotalRelevantByScale(perQuestionMax) }

describe('getScaleLevel', () => {
  it('границы уровней: 20/40/60/80', () => {
    expect(getScaleLevel(0)).toBe('minimal')
    expect(getScaleLevel(19.9)).toBe('minimal')
    expect(getScaleLevel(20)).toBe('moderate')
    expect(getScaleLevel(39.9)).toBe('moderate')
    expect(getScaleLevel(40)).toBe('significant')
    expect(getScaleLevel(59.9)).toBe('significant')
    expect(getScaleLevel(60)).toBe('high')
    expect(getScaleLevel(79.9)).toBe('high')
    expect(getScaleLevel(80)).toBe('extreme')
    expect(getScaleLevel(100)).toBe('extreme')
  })
})

describe('confidenceFromCount', () => {
  it('пороги ratio: 0.1/0.3/0.6', () => {
    expect(confidenceFromCount(0, 10)).toBe('insufficient')
    expect(confidenceFromCount(1, 10)).toBe('low') // ровно 0.1 → уже low
    expect(confidenceFromCount(2, 10)).toBe('low')
    expect(confidenceFromCount(3, 10)).toBe('moderate') // ровно 0.3 → moderate
    expect(confidenceFromCount(5, 10)).toBe('moderate')
    expect(confidenceFromCount(6, 10)).toBe('high') // ровно 0.6 → high
    expect(confidenceFromCount(10, 10)).toBe('high')
  })

  it('total=0 не делит на ноль', () => {
    expect(confidenceFromCount(0, 0)).toBe('insufficient')
  })
})

describe('computeActualMax / countRelevantAnswered', () => {
  it('actual_max суммируется по отвеченным вопросам шкалы', () => {
    // sortOrder 0 и 1 → вопросы 1 и 2: MAC 3+3=6, NAR 2, HUM 0
    expect(computeActualMax('MAC', [0, 1], data)).toBe(6)
    expect(computeActualMax('NAR', [0, 1], data)).toBe(2)
    expect(computeActualMax('HUM', [0, 1], data)).toBe(0)
  })

  it('релевантные вопросы считаются по каждой шкале', () => {
    const counts = countRelevantAnswered([0, 1, 2], data)
    expect(counts.MAC).toBe(2)
    expect(counts.NAR).toBe(1)
    expect(counts.HUM).toBe(1)
    expect(counts.SAD).toBe(0)
  })

  it('getScaleConfidence: полное покрытие банка → high, нулевое → insufficient', () => {
    expect(getScaleConfidence('MAC', [0, 1], data)).toBe('high') // 2 из 2
    expect(getScaleConfidence('HUM', [], data)).toBe('insufficient') // 0 из 2
  })
})

describe('computeScoresCore', () => {
  it('raw суммируется по выбранным опциям, normalized = raw/actual_max × 100', () => {
    const answered: AnsweredQuestionInput[] = [
      { sortOrder: 0, selectedOption: 0, options: opts({ MAC: 3, NAR: 2 }, { MAC: 1 }) },
      { sortOrder: 1, selectedOption: 1, options: opts({ MAC: 3 }, { MAC: 1 }) },
    ]
    const scores = computeScoresCore(answered, data)

    expect(scores.raw.MAC).toBe(4) // 3 + 1
    expect(scores.normalized.MAC).toBe(66.7) // 4 из 6
    expect(scores.levels.MAC).toBe('high')

    expect(scores.raw.NAR).toBe(2)
    expect(scores.normalized.NAR).toBe(100) // 2 из 2
    expect(scores.levels.NAR).toBe('extreme')
  })

  it('шкала без релевантных вопросов → 0 и insufficient_data', () => {
    const answered: AnsweredQuestionInput[] = [{ sortOrder: 0, selectedOption: 0, options: opts({ MAC: 3, NAR: 2 }) }]
    const scores = computeScoresCore(answered, data)
    expect(scores.normalized.HUM).toBe(0)
    expect(scores.levels.HUM).toBe('insufficient_data')
    expect(scores.confidence.HUM).toBe('insufficient')
  })

  it('relevantCounts отражают покрытие шкал этой порцией ответов', () => {
    const answered: AnsweredQuestionInput[] = [
      { sortOrder: 0, selectedOption: 0, options: opts({ MAC: 3, NAR: 2 }) },
      { sortOrder: 2, selectedOption: 0, options: opts({ HUM: 4 }) },
    ]
    const scores = computeScoresCore(answered, data)
    expect(scores.relevantCounts.MAC).toBe(1)
    expect(scores.relevantCounts.NAR).toBe(1)
    expect(scores.relevantCounts.HUM).toBe(1)
    expect(scores.relevantCounts.SAD).toBe(0)
  })

  it('невалидный индекс опции: не входит в raw, но остаётся в answersWithSortOrder', () => {
    const answered: AnsweredQuestionInput[] = [{ sortOrder: 0, selectedOption: 5, options: opts({ MAC: 3 }) }]
    const scores = computeScoresCore(answered, data)
    expect(scores.raw.MAC).toBe(0)
    expect(scores.answersWithSortOrder).toEqual([{ sortOrder: 0, selectedOption: 5 }])
  })

  it('вход не мутируется', () => {
    const answered: AnsweredQuestionInput[] = [
      { sortOrder: 0, selectedOption: 0, options: opts({ MAC: 3, NAR: 2 }, { MAC: 1 }) },
    ]
    const snapshot = JSON.stringify(answered)
    computeScoresCore(answered, data)
    expect(JSON.stringify(answered)).toBe(snapshot)
  })

  it('реальный банк подключён: все 22 шкалы имеют релевантные вопросы', () => {
    for (const code of ALL_SCALE_CODES) {
      expect(BANK_SCORING_DATA.totalRelevantByScale[code], `шкала ${code}`).toBeGreaterThan(0)
    }
  })
})

describe('пересчёт гостевой сессии на сервере (5.8)', () => {
  it('баллы восстанавливаются только из ответов — клиентским цифрам ядро не верит', () => {
    // Гость привязывает результат: на сервер едут ТОЛЬКО ответы (questionId → option).
    // Ядро пересчитывает профиль из ответов и справочника максимумов — любые
    // подделанные normalized из localStorage в расчёт физически не попадают.
    const guestAnswers: AnsweredQuestionInput[] = [
      { sortOrder: 0, selectedOption: 1, options: opts({ MAC: 3, NAR: 2 }, { MAC: 2, NAR: 0 }) },
      { sortOrder: 1, selectedOption: 0, options: opts({ MAC: 3 }, { MAC: 0 }) },
      { sortOrder: 2, selectedOption: 1, options: opts({ HUM: 4 }, { HUM: 1 }) },
      { sortOrder: 3, selectedOption: 0, options: opts({ HUM: 2 }, { HUM: 0 }) },
    ]
    const scores = computeScoresCore(guestAnswers, data)

    // MAC: raw 2+3=5, actual_max 6 → 83.3 (extreme)
    expect(scores.raw.MAC).toBe(5)
    expect(scores.normalized.MAC).toBe(83.3)
    // NAR: raw 0, actual_max 2 → 0
    expect(scores.normalized.NAR).toBe(0)
    // HUM: raw 1+2=3, actual_max 6 → 50 (significant)
    expect(scores.normalized.HUM).toBe(50)
    expect(scores.levels.HUM).toBe('significant')
    // Достоверность и валидность считаются из тех же ответов
    expect(scores.confidence.MAC).toBe('high')
    expect(scores.answersWithSortOrder).toHaveLength(4)
  })
})
