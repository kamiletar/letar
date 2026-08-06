import { describe, expect, it } from 'vitest'
import type { ScaleCode } from '../_data/personality-types'
import {
  computeDarkCore,
  DARK_CORE_CODES,
  DARK_CORE_FLAVOR_THRESHOLD,
  DARK_CORE_MIN_N,
  type DarkCoreInput,
  isDarkScaleMeasured,
  minConfidence,
} from './dark-core'
import type { IpsativeScale } from './ipsative'
import type { ScaleConfidence } from './scoring-core'

/** Достаточное число ответов, чтобы шкала считалась измеренной */
const ENOUGH = 50

/**
 * Собрать вход: баллы задаются явно, n и достоверность по умолчанию «хорошие».
 * counts/confidence можно переопределить точечно, в том числе для шкал вне scores.
 */
function mk(
  scores: Partial<Record<ScaleCode, number>>,
  opts?: {
    counts?: Partial<Record<ScaleCode, number>>
    confidence?: Partial<Record<ScaleCode, ScaleConfidence>>
    ranking?: IpsativeScale[]
  },
): DarkCoreInput {
  const relevantCounts: Partial<Record<ScaleCode, number>> = {}
  const confidence: Partial<Record<ScaleCode, ScaleConfidence>> = {}
  for (const code of Object.keys(scores) as ScaleCode[]) {
    relevantCounts[code] = ENOUGH
    confidence[code] = 'high'
  }
  Object.assign(relevantCounts, opts?.counts ?? {})
  Object.assign(confidence, opts?.confidence ?? {})
  return { normalized: scores, relevantCounts, confidence, ranking: opts?.ranking }
}

/** Полная тетрада с одинаковыми баллами, кроме перечисленных */
function tetrad(overrides: Partial<Record<ScaleCode, number>>, base = 30) {
  return mk({ MAC: base, NAR: base, ANT: base, SAD: base, ...overrides })
}

describe('computeDarkCore — уровень ядра', () => {
  it('ядро = среднее измеренных шкал, spread = размах', () => {
    const idx = computeDarkCore(mk({ MAC: 40, NAR: 50, ANT: 60, SAD: 70 }))
    expect(idx.core).toBe(55)
    expect(idx.spread).toBe(30)
    expect(idx.includedCodes).toEqual(['MAC', 'NAR', 'ANT', 'SAD'])
    expect(idx.missingCodes).toEqual([])
  })

  it('интервал ядра окружает само ядро', () => {
    const idx = computeDarkCore(mk({ MAC: 40, NAR: 50, ANT: 60, SAD: 70 }))
    expect(idx.coreCiLow).toBeLessThan(idx.core!)
    expect(idx.coreCiHigh).toBeGreaterThan(idx.core!)
  })
})

describe('computeDarkCore — структурный вывод', () => {
  it('все шкалы равны → «Ровное ядро»', () => {
    const idx = computeDarkCore(tetrad({}, 45))
    expect(idx.structure).toBe('even')
    expect(idx.spread).toBe(0)
    expect(idx.flavors.every((f) => f.deviation === 0)).toBe(true)
    expect(idx.leadingFlavor).toBeNull()
  })

  it('один выброс вверх → «выраженный вкус» (регрессия на ошибку ветвления)', () => {
    // 90/30/30/30: ядро 45, отклонения +45, −15, −15, −15.
    // Наивное «max|dev| >= порога, и таких ≥2 → поляризация» дало бы неверный вердикт.
    const idx = computeDarkCore(tetrad({ MAC: 90 }))
    expect(idx.structure).toBe('flavored')
    expect(idx.core).toBe(45)
    expect(idx.flavors[0].code).toBe('MAC')
    expect(idx.flavors[0].deviation).toBe(45)
    expect(idx.leadingFlavor?.code).toBe('MAC')
  })

  it('два выброса вверх → «разнонаправленные вкусы»', () => {
    const idx = computeDarkCore(mk({ MAC: 70, NAR: 70, ANT: 30, SAD: 30 }))
    expect(idx.structure).toBe('polarized')
    expect(idx.core).toBe(50)
  })

  it('выброс вниз без выбросов вверх → «приглушённый компонент»', () => {
    const idx = computeDarkCore(tetrad({ MAC: 20 }, 55))
    expect(idx.structure).toBe('muted')
    expect(idx.leadingFlavor?.code).toBe('MAC')
    expect(idx.leadingFlavor!.deviation).toBeLessThan(0)
  })

  it('граница порога вкуса: ровно 15 → выражен, 14.8 → нет', () => {
    // MAC=50 при остальных 30: ядро 35, отклонение ровно +15
    const atThreshold = computeDarkCore(tetrad({ MAC: 50 }))
    expect(atThreshold.flavors[0].deviation).toBe(DARK_CORE_FLAVOR_THRESHOLD)
    expect(atThreshold.flavors[0].pronounced).toBe(true)
    expect(atThreshold.structure).toBe('flavored')

    // MAC=49.8: ядро 35, отклонение 14.8 — ниже порога
    const below = computeDarkCore(tetrad({ MAC: 49.8 }))
    expect(below.flavors[0].pronounced).toBe(false)
    expect(below.structure).toBe('even')
  })
})

describe('computeDarkCore — измеренность шкалы', () => {
  it('n = 0 означает «нет данных», а не ноль баллов', () => {
    // SAD не отвечен: не должен просаживать ядро нулём
    const idx = computeDarkCore(mk({ MAC: 60, NAR: 60, ANT: 60, SAD: 0 }, { counts: { SAD: 0 } }))
    expect(idx.core).toBe(60)
    expect(idx.includedCodes).toEqual(['MAC', 'NAR', 'ANT'])
    expect(idx.missingCodes).toEqual(['SAD'])
    expect(idx.flavors.map((f) => f.code)).not.toContain('SAD')
  })

  it('граница DARK_CORE_MIN_N: 3 ответа — измерена, 2 — нет', () => {
    const counts: Partial<Record<ScaleCode, number>> = { MAC: DARK_CORE_MIN_N }
    expect(isDarkScaleMeasured('MAC', counts)).toBe(true)
    expect(isDarkScaleMeasured('MAC', { MAC: DARK_CORE_MIN_N - 1 })).toBe(false)

    const idx = computeDarkCore(tetrad({}, 40))
    expect(idx.includedCodes).toHaveLength(4)

    const partial = computeDarkCore(mk({ MAC: 40, NAR: 40, ANT: 40, SAD: 40 }, { counts: { SAD: 2 } }))
    expect(partial.missingCodes).toEqual(['SAD'])
  })

  it('меньше трёх измеренных шкал → «данных недостаточно», но тексты заполнены', () => {
    const idx = computeDarkCore(mk({ MAC: 60, NAR: 60 }, { counts: { ANT: 0, SAD: 0 } }))
    expect(idx.structure).toBe('insufficient')
    expect(idx.core).toBeNull()
    expect(idx.spread).toBeNull()
    expect(idx.coreCiLow).toBeNull()
    expect(idx.flavors).toEqual([])
    expect(idx.leadingFlavor).toBeNull()
    for (const field of [idx.label, idx.labelEn, idx.description, idx.descriptionEn, idx.attention, idx.attentionEn]) {
      expect(field).toBeTruthy()
    }
    expect(idx.caveat).toBeTruthy()
    expect(idx.caveatEn).toBeTruthy()
  })
})

describe('computeDarkCore — анализ чувствительности к нарциссизму', () => {
  it('тождество: дельта = отклонение NAR / 3 при всех четырёх измеренных', () => {
    const idx = computeDarkCore(tetrad({ NAR: 70 }))
    expect(idx.core).toBe(40)
    expect(idx.coreWithoutNarcissism).toBe(30)
    expect(idx.narcissismDelta).toBe(10)

    const narFlavor = idx.flavors.find((f) => f.code === 'NAR')!
    expect(narFlavor.deviation).toBe(30)
    expect(idx.narcissismDelta).toBeCloseTo(narFlavor.deviation / 3, 5)
    expect(idx.narcissismDrivesEstimate).toBe(true)
  })

  it('ровное ядро → нарциссизм оценку не двигает', () => {
    const idx = computeDarkCore(tetrad({}, 50))
    expect(idx.narcissismDelta).toBe(0)
    expect(idx.narcissismDrivesEstimate).toBe(false)
  })

  it('NAR не измерен → дельта null, но вариант без нарциссизма считается', () => {
    const idx = computeDarkCore(mk({ MAC: 40, ANT: 50, SAD: 60 }, { counts: { NAR: 0 } }))
    expect(idx.core).toBe(50)
    expect(idx.coreWithoutNarcissism).toBe(50)
    expect(idx.narcissismDelta).toBeNull()
    expect(idx.narcissismDrivesEstimate).toBe(false)
  })

  it('SAD не измерен → чувствительность считается по MAC и ANT', () => {
    const idx = computeDarkCore(mk({ MAC: 30, NAR: 90, ANT: 30 }, { counts: { SAD: 0 } }))
    expect(idx.coreWithoutNarcissism).toBe(30)
    expect(idx.narcissismDrivesEstimate).toBe(true)
  })
})

describe('computeDarkCore — достоверность', () => {
  it('достоверность = минимум по измеренным, «insufficient» НЕ отменяет расчёт', () => {
    const idx = computeDarkCore(tetrad({}, 50), undefined)
    expect(idx.confidence).toBe('high')

    const mixed = computeDarkCore(
      mk(
        { MAC: 50, NAR: 50, ANT: 50, SAD: 50 },
        {
          confidence: { MAC: 'high', NAR: 'moderate', ANT: 'low', SAD: 'insufficient' },
        },
      ),
    )
    expect(mixed.confidence).toBe('insufficient')
    expect(mixed.weakestCode).toBe('SAD')
    // Ключевое: расчёт всё равно выполнен — confidence здесь это покрытие банка,
    // а не надёжность, и блокировать им фичу нельзя
    expect(mixed.core).toBe(50)
    expect(mixed.structure).toBe('even')
  })

  it('minConfidence: порядок insufficient < low < moderate < high', () => {
    expect(minConfidence(['high', 'moderate'])).toBe('moderate')
    expect(minConfidence(['high', 'low', 'moderate'])).toBe('low')
    expect(minConfidence(['high'])).toBe('high')
    expect(minConfidence([])).toBe('insufficient')
  })
})

describe('computeDarkCore — ipsative-контекст', () => {
  const ranking: IpsativeScale[] = [
    { code: 'MAC', rank: 1, normalized: 80, ciLow: 70, ciHigh: 90, n: 50, tieGroup: 0 },
    { code: 'NAR', rank: 2, normalized: 60, ciLow: 50, ciHigh: 70, n: 50, tieGroup: 0 },
    { code: 'ANT', rank: 3, normalized: 40, ciLow: 30, ciHigh: 50, n: 50, tieGroup: 1 },
    { code: 'HUM', rank: 4, normalized: 30, ciLow: 20, ciHigh: 40, n: 50, tieGroup: 1 },
    { code: 'SAD', rank: 5, normalized: 20, ciLow: 10, ciHigh: 30, n: 50, tieGroup: 2 },
    { code: 'KAN', rank: 6, normalized: 10, ciLow: 5, ciHigh: 20, n: 50, tieGroup: 2 },
  ]

  it('считает ранги, попадание в топ и разницу с фоном профиля', () => {
    const idx = computeDarkCore(mk({ MAC: 80, NAR: 60, ANT: 40, SAD: 20 }, { ranking }))
    expect(idx.profile).not.toBeNull()
    expect(idx.profile!.ranks.map((r) => r.code)).toEqual(['MAC', 'NAR', 'ANT', 'SAD'])
    expect(idx.profile!.meanRank).toBeCloseTo(2.8, 5)
    expect(idx.profile!.inTopN).toBe(4)
    expect(idx.profile!.totalScales).toBe(6)
    expect(idx.profile!.profileMean).toBe(40)
    // ядро 50 против фона 40
    expect(idx.profile!.coreVsProfile).toBe(10)
  })

  it('без переданного ранжирования профиль = null', () => {
    const idx = computeDarkCore(mk({ MAC: 80, NAR: 60, ANT: 40, SAD: 20 }))
    expect(idx.profile).toBeNull()
  })
})

describe('computeDarkCore — границы конструкта', () => {
  it('MAS не участвует в ядре: ущерб направлен на себя, а не на других', () => {
    const withoutMas = computeDarkCore(tetrad({}, 40))
    const withMas = computeDarkCore(mk({ MAC: 40, NAR: 40, ANT: 40, SAD: 40, MAS: 100 }))
    expect(withMas.core).toBe(withoutMas.core)
    expect(withMas.structure).toBe(withoutMas.structure)
    expect(withMas.includedCodes).toEqual(withoutMas.includedCodes)
    expect(withMas.flavors.map((f) => f.code)).not.toContain('MAS')
  })

  it('состав тетрады зафиксирован', () => {
    expect(DARK_CORE_CODES).toEqual(['MAC', 'NAR', 'ANT', 'SAD'])
  })
})

describe('computeDarkCore — полнота текстов', () => {
  it('каждая структурная ветка заполнена на обоих языках', () => {
    const cases: DarkCoreInput[] = [
      tetrad({}, 45), // even
      tetrad({ MAC: 90 }), // flavored
      mk({ MAC: 70, NAR: 70, ANT: 30, SAD: 30 }), // polarized
      tetrad({ MAC: 20 }, 55), // muted
      mk({ MAC: 60, NAR: 60 }, { counts: { ANT: 0, SAD: 0 } }), // insufficient
    ]
    const seen = new Set<string>()
    for (const input of cases) {
      const idx = computeDarkCore(input)
      seen.add(idx.structure)
      for (
        const field of [
          idx.label,
          idx.labelEn,
          idx.description,
          idx.descriptionEn,
          idx.attention,
          idx.attentionEn,
        ]
      ) {
        expect(field, `структура ${idx.structure}`).toBeTruthy()
      }
    }
    expect(seen).toEqual(new Set(['even', 'flavored', 'polarized', 'muted', 'insufficient']))
  })

  it('каждый «вкус» заполнен на обоих языках, у садизма честно помечена экстраполяция', () => {
    const idx = computeDarkCore(mk({ MAC: 40, NAR: 50, ANT: 60, SAD: 70 }))
    expect(idx.flavors).toHaveLength(4)
    for (const flavor of idx.flavors) {
      for (
        const field of [
          flavor.label,
          flavor.labelEn,
          flavor.description,
          flavor.descriptionEn,
          flavor.residual,
          flavor.residualEn,
        ]
      ) {
        expect(field, `вкус ${flavor.code}`).toBeTruthy()
      }
    }
    // У Bader et al. (2023) садизма нет — выдавать экстраполяцию за источник нельзя
    expect(idx.flavors.find((f) => f.code === 'SAD')!.source).toBe('extrapolated')
    for (const code of ['MAC', 'NAR', 'ANT'] as const) {
      expect(idx.flavors.find((f) => f.code === code)!.source).toBe('bader2023')
    }
  })
})

describe('computeDarkCore — параметры и чистота', () => {
  it('кастомные пороги учитываются', () => {
    const scores = tetrad({ MAC: 50 }) // отклонение MAC = +15
    expect(computeDarkCore(scores, { flavorThreshold: 20 }).structure).toBe('even')
    expect(computeDarkCore(scores, { flavorThreshold: 10 }).structure).toBe('flavored')

    const scarce = mk({ MAC: 50, NAR: 50, ANT: 50, SAD: 50 }, { counts: { SAD: 5 } })
    expect(computeDarkCore(scarce, { minN: 10 }).missingCodes).toEqual(['SAD'])
    expect(computeDarkCore(scarce, { minN: 4 }).missingCodes).toEqual([])
  })

  it('вход не мутируется', () => {
    const input = mk({ MAC: 40, NAR: 50, ANT: 60, SAD: 70 })
    const snapshot = JSON.stringify(input)
    computeDarkCore(input)
    expect(JSON.stringify(input)).toBe(snapshot)
  })
})
