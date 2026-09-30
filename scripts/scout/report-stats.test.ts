import { describe, expect, test } from 'bun:test'
import type { SessionReport } from './report'
import { abDifference, pickSample, wilson } from './report-stats'

function session(id: string, shown: boolean, hits: number, suggested = 4): SessionReport {
  return {
    sessionId: id,
    status: 'ok',
    mode: 'ab',
    shown,
    queryLength: 100,
    suggested: Array.from({ length: suggested }, (_, i) => `d${i}`),
    opened: [],
    openedNovel: [],
    hits: Array.from({ length: hits }, (_, i) => `d${i}`),
    hitsBeforeEdit: [],
    missed: [],
  }
}

describe('отчёт: статистика', () => {
  test('Уилсон: краевые случаи и симметрия', () => {
    expect(wilson(0, 0)).toEqual({ p: 0, lo: 0, hi: 0 })
    const w = wilson(50, 100)
    expect(w.lo).toBeGreaterThan(0.39)
    expect(w.hi).toBeLessThan(0.61)
    expect(wilson(10, 10).hi).toBeLessThanOrEqual(1)
  })

  test('выборка детерминирована и не длиннее N', () => {
    const items = Array.from({ length: 30 }, (_, i) => ({ id: `s${i}` }))
    const a = pickSample(items, 7, (x) => x.id)
    expect(a).toHaveLength(7)
    expect(pickSample(items, 7, (x) => x.id)).toEqual(a)
  })

  test('A−B на синтетическом логе: знак, интервал, воспроизводимость', () => {
    const reports = [
      ...Array.from({ length: 40 }, (_, i) => session(`a${i}`, true, 3)),
      ...Array.from({ length: 40 }, (_, i) => session(`b${i}`, false, 1)),
    ]
    const [precision] = abDifference(reports, 500, 7)
    expect(precision.a).toBeCloseTo(0.75)
    expect(precision.b).toBeCloseTo(0.25)
    expect(precision.diff).toBeCloseTo(0.5)
    expect(precision.lo!).toBeLessThanOrEqual(precision.diff!)
    expect(precision.hi!).toBeGreaterThanOrEqual(precision.diff!)
    expect(abDifference(reports, 500, 7)[0]).toEqual(precision)
  })

  test('пустой ab-лог не падает: разницы нет', () => {
    const rows = abDifference([])
    expect(rows.every((r) => r.diff === undefined)).toBe(true)
    const onlyA = abDifference([session('a', true, 2)])
    expect(onlyA[0].diff).toBeUndefined()
  })
})
