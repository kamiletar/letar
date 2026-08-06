import { describe, expect, it } from 'vitest'
import { ALL_SCALE_CODES, EXPERIMENTAL_SCALE_CODES } from '../_data/personality-types'
import type { AnsweredQuestionInput, QuizOptionData, ScoringData } from './scoring-core'
import {
  BANK_SCORING_DATA,
  bankCoverage,
  buildTotalRelevantByScale,
  computeActualMax,
  computeScoresCore,
  confidenceFromCount,
  countRelevantAnswered,
  getScaleBankCoverage,
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
  it('абсолютные пороги: 5/15/30 отвеченных релевантных вопросов', () => {
    expect(confidenceFromCount(0)).toBe('insufficient')
    expect(confidenceFromCount(4)).toBe('insufficient')
    expect(confidenceFromCount(5)).toBe('low') // ровно порог → уже low
    expect(confidenceFromCount(14)).toBe('low')
    expect(confidenceFromCount(15)).toBe('moderate')
    expect(confidenceFromCount(29)).toBe('moderate')
    expect(confidenceFromCount(30)).toBe('high')
    expect(confidenceFromCount(700)).toBe('high')
  })

  it('не зависит от размера банка — в этом и была суть починки', () => {
    // Раньше 6 ответов по редкой шкале (банк 10) давали high,
    // а 6 ответов по населённой (банк 1192) — insufficient.
    // Точность оценки определяется абсолютным n, банк тут ни при чём.
    expect(confidenceFromCount(6)).toBe('low')
    expect(confidenceFromCount(40)).toBe('high')
  })
})

describe('bankCoverage', () => {
  it('доля пройденного банка — отдельная величина, не достоверность', () => {
    expect(bankCoverage(6, 10)).toBeCloseTo(0.6)
    expect(bankCoverage(6, 1192)).toBeCloseTo(0.005, 3)
  })

  it('банк 0 не делит на ноль; переполнение зажимается единицей', () => {
    expect(bankCoverage(0, 0)).toBe(0)
    expect(bankCoverage(5, 0)).toBe(0)
    expect(bankCoverage(20, 10)).toBe(1)
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

  it('getScaleConfidence: два ответа — insufficient, даже если это весь банк шкалы', () => {
    // Именно здесь была инверсия: раньше «2 из 2» давало high.
    // Оценка по двум вопросам не становится точной от того, что больше их нет.
    expect(getScaleConfidence('MAC', [0, 1], data)).toBe('insufficient')
    expect(getScaleConfidence('HUM', [], data)).toBe('insufficient')
  })

  it('getScaleBankCoverage: доля банка шкалы, шкала вне справочника — 0', () => {
    expect(getScaleBankCoverage('MAC', [0, 1], data)).toBeCloseTo(1) // 2 из 2
    expect(getScaleBankCoverage('HUM', [2], data)).toBeCloseTo(0.5) // 1 из 2
    expect(getScaleBankCoverage('SAD', [0, 1, 2, 3], data)).toBe(0)
  })

  it('getScaleConfidence: high набирается абсолютным числом ответов', () => {
    // 40 вопросов, все релевантны SAD
    const wideMax: Record<string, Record<string, number>> = {}
    for (let i = 1; i <= 40; i++) {
      wideMax[String(i)] = { SAD: 2 }
    }
    const wide: ScoringData = { perQuestionMax: wideMax, totalRelevantByScale: buildTotalRelevantByScale(wideMax) }
    const sortOrders = Array.from({ length: 40 }, (_, i) => i)

    expect(getScaleConfidence('SAD', sortOrders.slice(0, 4), wide)).toBe('insufficient')
    expect(getScaleConfidence('SAD', sortOrders.slice(0, 10), wide)).toBe('low')
    expect(getScaleConfidence('SAD', sortOrders.slice(0, 20), wide)).toBe('moderate')
    expect(getScaleConfidence('SAD', sortOrders, wide)).toBe('high')
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

  it('реальный банк подключён: все 22 шкалы ядра имеют релевантные вопросы', () => {
    for (const code of ALL_SCALE_CODES) {
      expect(BANK_SCORING_DATA.totalRelevantByScale[code], `шкала ${code}`).toBeGreaterThan(0)
    }
  })

  it('экспериментальные шкалы (5.5) тоже подключены к реальному банку', () => {
    for (const code of EXPERIMENTAL_SCALE_CODES) {
      expect(BANK_SCORING_DATA.totalRelevantByScale[code], `шкала ${code}`).toBeGreaterThan(0)
    }
  })
})

describe('изоляция ядра от экспериментальных шкал (5.5)', () => {
  // Вопрос 1 (sortOrder 0) — ядро, вопрос 2 (sortOrder 1) — экспериментальный
  const isoMax: Record<string, Record<string, number>> = {
    '1': { MAC: 3 },
    '2': { RES_PHYS: 3 },
  }
  const isoData: ScoringData = { perQuestionMax: isoMax, totalRelevantByScale: buildTotalRelevantByScale(isoMax) }

  it('actual_max ядра не зависит от наличия экспериментального вопроса', () => {
    // MAC покрывается только вопросом 1 → его actual_max одинаков, отвечен экспериментальный или нет
    expect(computeActualMax('MAC', [0], isoData)).toBe(3)
    expect(computeActualMax('MAC', [0, 1], isoData)).toBe(3)
  })

  it('ответ на экспериментальный вопрос не сдвигает normalized ядра', () => {
    const coreOnly = computeScoresCore([{ sortOrder: 0, selectedOption: 0, options: opts({ MAC: 3 }) }], isoData)
    const withExp = computeScoresCore(
      [
        { sortOrder: 0, selectedOption: 0, options: opts({ MAC: 3 }) },
        { sortOrder: 1, selectedOption: 0, options: opts({ RES_PHYS: 3 }) },
      ],
      isoData,
    )
    expect(coreOnly.normalized.MAC).toBe(100)
    expect(withExp.normalized.MAC).toBe(100)
    // экспериментальная шкала посчитана отдельно
    expect(withExp.normalized.RES_PHYS).toBe(100)
    expect(coreOnly.normalized.RES_PHYS).toBe(0)
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
    // Достоверность считается из тех же ответов: два релевантных вопроса по MAC —
    // это insufficient, сколько бы их ни было в банке
    expect(scores.confidence.MAC).toBe('insufficient')
    expect(scores.answersWithSortOrder).toHaveLength(4)
  })
})
