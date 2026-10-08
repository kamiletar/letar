import { describe, expect, test } from 'bun:test'
import type { SessionReport } from './report'
import { abDifference, embedDownStats, pickSample, watchdogStats, wilson } from './report-stats'

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

describe('отчёт: эмбеддер', () => {
  test('доля без эмбеддера: строки нового и старого вида, справки приложения не считаются', () => {
    const stats = embedDownStats([
      { docs_by: 'hybrid', embed: { ok: true } },
      { docs_by: 'bm25', embed: { ok: false, error: 'timeout' } },
      { docs_by: 'bm25', embed: { ok: false, error: 'refused' } },
      { docs_by: 'bm25', forms: 'no-vectors' },
      // старая строка: поля embed нет, справка без эмбеддера определяется по docs_by
      { docs_by: 'bm25', forms: 'embed-down' },
      { docs_by: 'hybrid+phrases', forms: 'dense' },
      { kind: 'app' },
    ])
    expect(stats).toEqual({
      n: 4,
      total: 6,
      byError: { timeout: 1, refused: 1, 'no-vectors': 1, неизвестно: 1 },
    })
    expect(embedDownStats([])).toEqual({ n: 0, total: 0, byError: {} })
  })

  test('события сторожа за период', () => {
    const rows = [
      { ts: '2026-09-30T10:00:00Z', state: 'down', action: 'start' },
      { ts: '2026-10-02T10:00:00Z', state: 'down', action: 'start' },
      { ts: '2026-10-03T10:00:00Z', state: 'hung', action: 'restart' },
      { ts: '2026-10-04T10:00:00Z', state: 'slow', action: 'none' },
      { ts: '2026-10-05T10:00:00Z', state: 'hung', action: 'cooldown' },
    ]
    expect(watchdogStats(rows, Date.parse('2026-10-01'))).toEqual({ start: 1, restart: 1, slow: 1 })
    expect(watchdogStats(rows)).toEqual({ start: 2, restart: 1, slow: 1 })
    expect(watchdogStats([])).toEqual({ start: 0, restart: 0, slow: 0 })
  })
})
