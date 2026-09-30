import { createHash } from 'node:crypto'
import type { SessionReport } from './report'

/** Доверительный интервал Уилсона для доли k из n (z = 1,96 → 95%) */
export function wilson(k: number, n: number, z = 1.96): { p: number; lo: number; hi: number } {
  if (!n) {
    return { p: 0, lo: 0, hi: 0 }
  }
  const p = k / n
  const z2 = z * z
  const denom = 1 + z2 / n
  const center = (p + z2 / (2 * n)) / denom
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom
  return { p, lo: Math.max(0, center - half), hi: Math.min(1, center + half) }
}

/** Детерминированный выбор N элементов: порядок по хешу ключа, а не по случайному числу */
export function pickSample<T>(items: T[], n: number, key: (item: T) => string): T[] {
  return [...items]
    .map((item) => ({ item, h: createHash('sha1').update(key(item)).digest('hex') }))
    .sort((a, b) => (a.h < b.h ? -1 : a.h > b.h ? 1 : 0))
    .slice(0, n)
    .map((x) => x.item)
}

/** Генератор псевдослучайных чисел (mulberry32): бутстрэп воспроизводим */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface AbMetric {
  metric: string
  a?: number
  b?: number
  diff?: number
  lo?: number
  hi?: number
}

type Stat = (list: SessionReport[]) => number | undefined

const sum = (list: SessionReport[], f: (r: SessionReport) => number) => list.reduce((acc, r) => acc + f(r), 0)
const div = (n: number, d: number) => (d ? n / d : undefined)

/** Метрики те же, что в `summarize`: точность, полнота, «до правки», инструмент */
export const AB_STATS: Array<[string, Stat]> = [
  ['точность', (l) => div(sum(l, (r) => r.hits.length), sum(l, (r) => r.suggested.length))],
  [
    'полнота',
    (l) =>
      div(
        sum(l, (r) => r.hits.filter((p) => r.openedNovel.includes(p)).length),
        sum(l, (r) => r.openedNovel.length),
      ),
  ],
  ['до правки', (l) => div(sum(l, (r) => r.hitsBeforeEdit.length), sum(l, (r) => r.suggested.length))],
  [
    'инструмент',
    (l) => {
      const withTool = l.filter((r) => r.tool)
      return div(withTool.filter((r) => r.toolHit).length, withTool.length)
    },
  ],
]

/**
 * Разница A−B для режима `ab` с доверительным интервалом: бутстрэп по сессиям (каждая группа
 * пересэмплируется отдельно, 95% — перцентили 2,5 и 97,5). Нет сессий в группе — разницы нет.
 * A — справка показана, B — тень; учитываются только разобранные сессии с поиском в режиме `ab`.
 */
export function abDifference(reports: SessionReport[], iterations = 2000, seed = 1): AbMetric[] {
  const ab = reports.filter((r) => r.status === 'ok' && r.mode === 'ab' && r.kind !== 'app')
  const groupA = ab.filter((r) => r.shown)
  const groupB = ab.filter((r) => !r.shown)
  const random = rng(seed)
  const resample = (list: SessionReport[]) => list.map(() => list[Math.floor(random() * list.length)])
  return AB_STATS.map(([metric, stat]) => {
    const a = stat(groupA)
    const b = stat(groupB)
    if (!groupA.length || !groupB.length || a === undefined || b === undefined) {
      return { metric, a, b }
    }
    const diffs: number[] = []
    for (let i = 0; i < iterations; i++) {
      const x = stat(resample(groupA))
      const y = stat(resample(groupB))
      if (x !== undefined && y !== undefined) {
        diffs.push(x - y)
      }
    }
    diffs.sort((p, q) => p - q)
    const at = (q: number) => diffs[Math.min(diffs.length - 1, Math.floor(q * diffs.length))]
    return {
      metric,
      a,
      b,
      diff: a - b,
      lo: diffs.length ? at(0.025) : undefined,
      hi: diffs.length ? at(0.975) : undefined,
    }
  })
}
