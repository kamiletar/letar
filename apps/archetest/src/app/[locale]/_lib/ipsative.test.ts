import { describe, expect, it } from 'vitest'
import type { PersonalityTypeCode } from '../_data/personality-types'
import { ALL_SCALE_CODES, STATE_CODES } from '../_data/personality-types'
import { computeIpsativeRanking, intervalsOverlap, wilsonInterval } from './ipsative'

/** Профиль: все шкалы 0, поверх — переопределения */
function profile(overrides: Partial<Record<PersonalityTypeCode, number>>): Record<PersonalityTypeCode, number> {
  const base = Object.fromEntries(ALL_SCALE_CODES.map((c) => [c, 0])) as Record<PersonalityTypeCode, number>
  return { ...base, ...overrides }
}

/** Счётчики: у всех шкал одинаковое n, поверх — переопределения */
function counts(n: number, overrides: Partial<Record<PersonalityTypeCode, number>> = {}) {
  const base = Object.fromEntries(ALL_SCALE_CODES.map((c) => [c, n])) as Record<PersonalityTypeCode, number>
  return { ...base, ...overrides }
}

describe('wilsonInterval', () => {
  it('n=0 → полная неопределённость [0, 1]', () => {
    expect(wilsonInterval(0.5, 0)).toEqual({ low: 0, high: 1 })
  })

  it('интервал содержит выборочную долю', () => {
    const { low, high } = wilsonInterval(0.5, 10)
    expect(low).toBeLessThan(0.5)
    expect(high).toBeGreaterThan(0.5)
  })

  it('интервал сужается с ростом n', () => {
    const wide = wilsonInterval(0.5, 5)
    const narrow = wilsonInterval(0.5, 20)
    expect(narrow.high - narrow.low).toBeLessThan(wide.high - wide.low)
  })

  it('края p=0 и p=1 не выходят за [0, 1]', () => {
    const atZero = wilsonInterval(0, 3)
    expect(atZero.low).toBe(0)
    expect(atZero.high).toBeGreaterThan(0)
    expect(atZero.high).toBeLessThan(1)

    const atOne = wilsonInterval(1, 3)
    expect(atOne.high).toBe(1)
    expect(atOne.low).toBeGreaterThan(0)
    expect(atOne.low).toBeLessThan(1)
  })

  it('p вне [0, 1] зажимается', () => {
    expect(wilsonInterval(1.5, 10).high).toBe(1)
    expect(wilsonInterval(-0.5, 10).low).toBe(0)
  })
})

describe('intervalsOverlap', () => {
  it('перекрытие и касание → true, разрыв → false', () => {
    expect(intervalsOverlap({ ciLow: 10, ciHigh: 50 }, { ciLow: 40, ciHigh: 80 })).toBe(true)
    expect(intervalsOverlap({ ciLow: 10, ciHigh: 40 }, { ciLow: 40, ciHigh: 80 })).toBe(true)
    expect(intervalsOverlap({ ciLow: 10, ciHigh: 39 }, { ciLow: 40, ciHigh: 80 })).toBe(false)
  })
})

describe('computeIpsativeRanking', () => {
  it('ранжирует по убыванию normalized, ранги 1..N', () => {
    const ranking = computeIpsativeRanking(profile({ MAC: 90, HUM: 85, SAD: 20 }), counts(50))
    expect(ranking).toHaveLength(ALL_SCALE_CODES.length)
    expect(ranking[0].code).toBe('MAC')
    expect(ranking[0].rank).toBe(1)
    expect(ranking[1].code).toBe('HUM')
    expect(ranking[2].code).toBe('SAD')
    expect(ranking.map((r) => r.rank)).toEqual(ranking.map((_, i) => i + 1))
  })

  it('exclude выкидывает шкалы из ранжирования (STATE_CODES)', () => {
    const ranking = computeIpsativeRanking(profile({ BAR: 100, MAC: 50 }), counts(50), { exclude: STATE_CODES })
    expect(ranking.some((r) => STATE_CODES.includes(r.code))).toBe(false)
    expect(ranking[0].code).toBe('MAC')
    expect(ranking).toHaveLength(ALL_SCALE_CODES.length - STATE_CODES.length)
  })

  it('перекрывающиеся интервалы соседей → одна tieGroup, разрыв → новая', () => {
    // n=50: 90% ≈ [78.6, 95.7], 85% ≈ [72.6, 92.4] — перекрытие;
    // 20% ≈ [11.2, 33.0] — разрыв; нули ≈ [0, 7.1] — ещё одна группа
    const ranking = computeIpsativeRanking(profile({ MAC: 90, HUM: 85, SAD: 20 }), counts(50))
    const byCode = new Map(ranking.map((r) => [r.code, r]))

    expect(byCode.get('MAC')!.tieGroup).toBe(byCode.get('HUM')!.tieGroup)
    expect(byCode.get('SAD')!.tieGroup).toBe(byCode.get('MAC')!.tieGroup + 1)
    expect(byCode.get('PAR')!.tieGroup).toBe(byCode.get('SAD')!.tieGroup + 1)
  })

  it('шкала с n=0 получает интервал [0, 100]', () => {
    const ranking = computeIpsativeRanking(profile({ MAC: 70 }), counts(50, { MAC: 0 }))
    const mac = ranking.find((r) => r.code === 'MAC')!
    expect(mac.ciLow).toBe(0)
    expect(mac.ciHigh).toBe(100)
    expect(mac.n).toBe(0)
  })

  it('равные normalized упорядочены детерминированно (код по алфавиту)', () => {
    const ranking = computeIpsativeRanking(profile({ NAR: 50, MAC: 50, HUM: 50 }), counts(50))
    expect(ranking.slice(0, 3).map((r) => r.code)).toEqual(['HUM', 'MAC', 'NAR'])
  })

  it('вход не мутируется', () => {
    const normalized = profile({ MAC: 90 })
    const relevant = counts(50)
    const normSnapshot = JSON.stringify(normalized)
    const countsSnapshot = JSON.stringify(relevant)
    computeIpsativeRanking(normalized, relevant)
    expect(JSON.stringify(normalized)).toBe(normSnapshot)
    expect(JSON.stringify(relevant)).toBe(countsSnapshot)
  })
})
