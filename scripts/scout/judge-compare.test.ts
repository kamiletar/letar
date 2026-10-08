import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type JudgeLabel, labelKey } from './judge'
import {
  bootstrapKappa,
  buildCases,
  confusion,
  kappa,
  lcg,
  loadJudgeOutputs,
  pairsOf,
  QUERY_CHARS,
  refOrder,
  relevantAt,
  relevantByPosition,
} from './judge-compare'

const lab = (sessionId: string, path: string, label: 0 | 1 | 2, judge = 'x'): JudgeLabel => ({
  sessionId,
  path,
  label,
  judge,
})
const mapOf = (ls: JudgeLabel[]) => new Map(ls.map((l) => [labelKey(l.sessionId, l.path), l]))

describe('kappa', () => {
  test('полное совпадение — 1, независимые ответы — около 0', () => {
    expect(kappa([[0, 0], [1, 1], [0, 0], [1, 1]], [0, 1])).toBe(1)
    expect(kappa([[0, 0], [0, 1], [1, 0], [1, 1]], [0, 1])).toBeCloseTo(0, 5)
  })
  test('пустой набор — NaN, один класс у обоих — 1', () => {
    expect(kappa([], [0, 1])).toBeNaN()
    expect(kappa([[1, 1], [1, 1]], [0, 1])).toBe(1)
  })
})

describe('метрики по меткам', () => {
  const ref = [lab('s1', 'a', 2), lab('s1', 'b', 0), lab('s1', 'c', 1), lab('s2', 'a', 0), lab('s2', 'd', 1)]
  const order = refOrder(ref)
  test('порядок пунктов — как в эталоне', () => {
    expect(order.get('s1')).toEqual(['a', 'b', 'c'])
  })
  test('по делу@k и нужен@k считают долю меток ≥1 и =2', () => {
    const m = mapOf(ref)
    expect(relevantAt(order, m, 2)).toBeCloseTo((0.5 + 0.5) / 2, 5)
    expect(relevantAt(order, m, 3, 2)).toBeCloseTo((1 / 3 + 0) / 2, 5)
  })
  test('случай, где размечены не все пункты, в среднее не входит', () => {
    const m = mapOf([lab('s1', 'a', 2), lab('s1', 'b', 2)])
    expect(relevantAt(order, m, 3)).toBeNaN()
  })
  test('доля по позиции', () => {
    expect(relevantByPosition(order, mapOf(ref), 0)).toBeCloseTo(0.5, 5)
  })
  test('матрица ошибок: строка — эталон, столбец — судья', () => {
    expect(confusion([[0, 1], [0, 1], [2, 2]])).toEqual([[0, 2, 0], [0, 0, 0], [0, 0, 1]])
  })
  test('пары берутся только там, где есть обе метки', () => {
    const other = mapOf([lab('s1', 'a', 1), lab('s2', 'd', 1)])
    expect(pairsOf(['s1', 's2'], order, mapOf(ref), other)).toEqual([[2, 1], [1, 1]])
  })
})

describe('пачки и ответы судьи', () => {
  const order = new Map([['s1', ['a', 'b']], ['s2', ['c']]])
  test('buildCases: запрос обрезается, нет карточки — путь вместо заголовка, нет запроса — сессия пропущена', () => {
    const cases = buildCases(
      order,
      new Map([['s1', 'я'.repeat(QUERY_CHARS + 10)]]),
      new Map([['a', { title: 'A', summary: 'б'.repeat(500) }]]),
    )
    expect(cases).toHaveLength(1)
    expect(cases[0].query).toHaveLength(QUERY_CHARS)
    expect(cases[0].items[0]).toEqual({ path: 'a', title: 'A', summary: 'б'.repeat(300) })
    expect(cases[0].items[1].title).toBe('b')
  })
  test('loadJudgeOutputs: неверная длина и чужая метка отбрасываются и считаются', () => {
    const dir = mkdtempSync(join(tmpdir(), 'judge-compare-'))
    try {
      mkdirSync(dir, { recursive: true })
      writeFileSync(
        join(dir, 'batch-01.json'),
        JSON.stringify({ model: 'm1', labels: { s1: [1, 2], s2: [0, 1], zzz: [1] } }),
      )
      writeFileSync(join(dir, 'batch-02.json'), JSON.stringify({ model: 'm1', labels: { s2: [3] } }))
      const r = loadJudgeOutputs(dir, order, 'm1')
      expect(r.models).toEqual(['m1'])
      expect(r.badLength).toBe(3)
      expect(r.labels.get(labelKey('s1', 'b'))?.label).toBe(2)
      expect(r.labels.has(labelKey('s2', 'c'))).toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('бутстрэп', () => {
  test('детерминирован: одно зерно — те же интервалы', () => {
    const ref: JudgeLabel[] = []
    const good: JudgeLabel[] = []
    const bad: JudgeLabel[] = []
    for (let s = 0; s < 20; s++) {
      for (const p of ['a', 'b', 'c']) {
        const r = ((s + p.charCodeAt(0)) % 3) as 0 | 1 | 2
        ref.push(lab(`s${s}`, p, r))
        good.push(lab(`s${s}`, p, r))
        bad.push(lab(`s${s}`, p, ((s * s + 2 * p.charCodeAt(0)) % 3) as 0 | 1 | 2))
      }
    }
    const order = refOrder(ref)
    const sessions = [...order.keys()]
    const run = () => bootstrapKappa(sessions, order, mapOf(ref), mapOf(bad), mapOf(good), 200, lcg(3))
    const a = run()
    expect(a).toEqual(run())
    expect(a.bBetter).toBeGreaterThan(0.9)
    expect(a.b[0]).toBeGreaterThan(a.a[1])
  })
})
