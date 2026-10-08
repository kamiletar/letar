#!/usr/bin/env bun
/**
 * Сравнение судей релевантности с эталоном Sonnet (`judge-ref.jsonl`).
 *
 * Судья, которого проверяем (Haiku, дообученная 9B…), размечает те же пары «задача — док», что Sonnet.
 * Сам судья здесь не вызывается: `--prepare` готовит пачки, разметку делает внешний исполнитель
 * (субагенты с `model: haiku` или скрипт с ключом API), `--compare` читает его ответы и считает
 * согласие с Sonnet. Кеш локальной 9B (`judge-labels.jsonl`) идёт третьей колонкой.
 *
 * `--prepare [--dir <каталог>]` — `batches/batch-NN.json` (случаи: sessionId, query, items), `rubric.txt` и
 * пустой `out/`. Судья вслепую: эталона в пачках нет.
 * `--compare [--dir <каталог>] [--bootstrap N]` — читает `out/*.json` формата
 * `{ "model": "...", "labels": { "<sessionId>": [0|1|2, ...] } }` (метки в порядке `items`).
 *
 * Каталог по умолчанию — `<scoutDataDir()>/judge-compare`. Эталон — тестовый набор: на нём не обучать.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { arg, readJsonl } from './cli'
import { freshIndex } from './hook-core'
import { findRepoRoot } from './index-store'
import { type JudgeLabel, labelKey, loadLabels, RUBRIC } from './judge'
import { scoutDataDir, scoutHome } from './paths'

type Label = 0 | 1 | 2

export const BATCH_SESSIONS = 8
/** Как в `judge.ts` — аннотация, которую видит судья */
export const SUMMARY_CHARS = 300
/** Запрос в пачке длиннее обрезается: пачка из 8 случаев должна влезать судье в контекст */
export const QUERY_CHARS = 3000
export const BOOTSTRAP_DEFAULT = 2000

export interface CompareItem {
  path: string
  title: string
  summary: string
}

export interface CompareCase {
  sessionId: string
  query: string
  items: CompareItem[]
}

/** Файл ответов судьи: метки по сессиям в порядке пунктов эталона */
export interface JudgeOutput {
  model: string
  labels: Record<string, number[]>
}

/** Пункты по сессиям в порядке эталона — тот же порядок, что видел Sonnet */
export function refOrder(ref: JudgeLabel[]): Map<string, string[]> {
  const order = new Map<string, string[]>()
  for (const r of ref) {
    order.set(r.sessionId, [...(order.get(r.sessionId) ?? []), r.path])
  }
  return order
}

/** Случаи для пачек: запрос из eval-cases, карточка дока из индекса; сессии без запроса пропускаются */
export function buildCases(
  order: Map<string, string[]>,
  queries: Map<string, string>,
  cards: Map<string, { title: string; summary: string }>,
): CompareCase[] {
  const cases: CompareCase[] = []
  for (const [sessionId, paths] of order) {
    const query = queries.get(sessionId)
    if (!query) {
      continue
    }
    cases.push({
      sessionId,
      query: query.slice(0, QUERY_CHARS),
      items: paths.map((path) => {
        const card = cards.get(path)
        return { path, title: card?.title ?? path, summary: (card?.summary ?? '').slice(0, SUMMARY_CHARS) }
      }),
    })
  }
  return cases
}

/** Каппа Коэна по парам (эталон, судья) на заданном множестве классов; без разброса классов — 1 */
export function kappa(pairs: Array<[number, number]>, classes: number[]): number {
  const n = pairs.length
  if (!n) {
    return Number.NaN
  }
  const po = pairs.filter(([a, b]) => a === b).length / n
  let pe = 0
  for (const c of classes) {
    pe += (pairs.filter(([a]) => a === c).length / n) * (pairs.filter(([, b]) => b === c).length / n)
  }
  return pe === 1 ? 1 : (po - pe) / (1 - pe)
}

/** Пары (эталон, судья) по сессиям; пункт без метки судьи в пару не входит */
export function pairsOf(
  sessions: string[],
  order: Map<string, string[]>,
  ref: Map<string, JudgeLabel>,
  other: Map<string, JudgeLabel>,
): Array<[number, number]> {
  const pairs: Array<[number, number]> = []
  for (const s of sessions) {
    for (const p of order.get(s) ?? []) {
      const r = ref.get(labelKey(s, p))
      const o = other.get(labelKey(s, p))
      if (r && o) {
        pairs.push([r.label, o.label])
      }
    }
  }
  return pairs
}

/** Бинаризация «по делу»: метка ≥1 */
function binary(pairs: Array<[number, number]>): Array<[number, number]> {
  return pairs.map(([a, b]) => [a >= 1 ? 1 : 0, b >= 1 ? 1 : 0])
}

/** «По делу@k» (или «нужен@k» при `min = 2`): средняя по случаям доля пунктов с меткой ≥ min среди первых k */
export function relevantAt(
  order: Map<string, string[]>,
  labels: Map<string, JudgeLabel>,
  k: number,
  min: 1 | 2 = 1,
): number {
  const shares: number[] = []
  for (const [s, paths] of order) {
    const ls = paths.slice(0, k).map((p) => labels.get(labelKey(s, p))?.label)
    if (!ls.length || ls.some((l) => l === undefined)) {
      continue
    }
    shares.push(ls.filter((l) => (l as number) >= min).length / ls.length)
  }
  return shares.length ? shares.reduce((a, b) => a + b, 0) / shares.length : Number.NaN
}

/** Доля пунктов с меткой ≥1 на позиции `index` (с нуля) по всем случаям, где она есть */
export function relevantByPosition(
  order: Map<string, string[]>,
  labels: Map<string, JudgeLabel>,
  index: number,
): number {
  const hits: number[] = []
  for (const [s, paths] of order) {
    const l = labels.get(labelKey(s, paths[index] ?? ''))
    if (l) {
      hits.push(l.label >= 1 ? 1 : 0)
    }
  }
  return hits.length ? hits.reduce((a, b) => a + b, 0) / hits.length : Number.NaN
}

/** Матрица ошибок: строки — эталон 0/1/2, столбцы — судья 0/1/2 */
export function confusion(pairs: Array<[number, number]>): number[][] {
  return [0, 1, 2].map((r) => [0, 1, 2].map((o) => pairs.filter(([a, b]) => a === r && b === o).length))
}

/** Детерминированный генератор для бутстрэпа (LCG): повтор прогона даёт те же интервалы */
export function lcg(seed = 7): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

export interface BootstrapResult {
  a: [number, number]
  b: [number, number]
  /** Разность κ(b) − κ(a) */
  diff: [number, number]
  /** Доля повторов, где b лучше a */
  bBetter: number
}

/**
 * Бутстрэп по сессиям (пары внутри сессии не независимы): 95%-интервалы κ(≥1) двух судей и их разности.
 * Сессии пересэмплируются с возвращением, обе каппы считаются на одной выборке.
 */
export function bootstrapKappa(
  sessions: string[],
  order: Map<string, string[]>,
  ref: Map<string, JudgeLabel>,
  a: Map<string, JudgeLabel>,
  b: Map<string, JudgeLabel>,
  repeats = BOOTSTRAP_DEFAULT,
  rnd: () => number = lcg(),
): BootstrapResult {
  const ka: number[] = []
  const kb: number[] = []
  const diffs: number[] = []
  for (let i = 0; i < repeats; i++) {
    const sample = sessions.map(() => sessions[Math.floor(rnd() * sessions.length)])
    const x = kappa(binary(pairsOf(sample, order, ref, a)), [0, 1])
    const y = kappa(binary(pairsOf(sample, order, ref, b)), [0, 1])
    ka.push(x)
    kb.push(y)
    diffs.push(y - x)
  }
  const q = (xs: number[], p: number): number => [...xs].sort((u, v) => u - v)[Math.floor(p * xs.length)]
  const ci = (xs: number[]): [number, number] => [q(xs, 0.025), q(xs, 0.975)]
  return { a: ci(ka), b: ci(kb), diff: ci(diffs), bBetter: diffs.filter((d) => d > 0).length / diffs.length }
}

/** Ответы судьи из `out/*.json` → карта меток; ответ с неверной длиной массива считается и отбрасывается */
export function loadJudgeOutputs(
  dir: string,
  order: Map<string, string[]>,
  judge: string,
): { labels: Map<string, JudgeLabel>; models: string[]; badLength: number } {
  const labels = new Map<string, JudgeLabel>()
  const models = new Set<string>()
  let badLength = 0
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const j = JSON.parse(readFileSync(join(dir, f), 'utf8')) as JudgeOutput
    models.add(j.model)
    for (const [sessionId, arr] of Object.entries(j.labels)) {
      const paths = order.get(sessionId)
      if (!paths || paths.length !== arr.length || arr.some((x) => x !== 0 && x !== 1 && x !== 2)) {
        badLength++
        continue
      }
      paths.forEach((path, i) =>
        labels.set(labelKey(sessionId, path), { sessionId, path, label: arr[i] as Label, judge })
      )
    }
  }
  return { labels, models: [...models], badLength }
}

const pct = (x: number): string => `${(x * 100).toFixed(1)}%`

function prepare(dir: string): void {
  const data = scoutDataDir()
  const root = findRepoRoot()
  if (!root) {
    throw new Error('Не найден корень репозитория')
  }
  const cards = new Map<string, { title: string; summary: string }>()
  for (const c of freshIndex(root, scoutHome()).cards) {
    // Карточка дока предпочтительнее карточки секции с тем же путём
    if (!cards.has(c.path) || c.kind === 'doc') {
      cards.set(c.path, { title: c.title, summary: c.summary })
    }
  }
  const queries = new Map(
    readJsonl<{ sessionId: string; query: string }>(join(data, 'eval-cases.jsonl')).map((c) => [c.sessionId, c.query]),
  )
  const order = refOrder(readJsonl<JudgeLabel>(join(data, 'judge-ref.jsonl')))
  const cases = buildCases(order, queries, cards)
  const batches = join(dir, 'batches')
  mkdirSync(batches, { recursive: true })
  mkdirSync(join(dir, 'out'), { recursive: true })
  writeFileSync(join(dir, 'rubric.txt'), `${RUBRIC}\n`)
  let n = 0
  for (let i = 0; i < cases.length; i += BATCH_SESSIONS) {
    n++
    writeFileSync(
      join(batches, `batch-${String(n).padStart(2, '0')}.json`),
      JSON.stringify(cases.slice(i, i + BATCH_SESSIONS)),
    )
  }
  console.log(`Случаев: ${cases.length} из ${order.size} сессий эталона, пачек: ${n} → ${dir}`)
}

function compare(dir: string, repeats: number): void {
  const data = scoutDataDir()
  const refList = readJsonl<JudgeLabel>(join(data, 'judge-ref.jsonl'))
  const order = refOrder(refList)
  const ref = loadLabels(join(data, 'judge-ref.jsonl'))
  const b9 = loadLabels(join(data, 'judge-labels.jsonl'))
  const outDir = join(dir, 'out')
  if (!existsSync(outDir)) {
    throw new Error(`Нет ${outDir}: сначала --prepare и разметка`)
  }
  const { labels: other, models, badLength } = loadJudgeOutputs(outDir, order, 'candidate')
  // Сравниваем только там, где есть метки у всех трёх: иначе колонки не сопоставимы
  const sessions = [...order.keys()].filter((s) =>
    order.get(s)!.every((p) => other.has(labelKey(s, p)) && b9.has(labelKey(s, p)))
  )
  const common = (m: Map<string, JudgeLabel>) => pairsOf(sessions, order, ref, m)
  console.log(`Судья: ${models.join(', ') || '—'}; ответов с неверной длиной или меткой: ${badLength}`)
  console.log(`Сессий с метками у всех трёх: ${sessions.length} из ${order.size}, пар: ${common(other).length}\n`)
  for (const [name, m] of [['9B', b9], [models[0] ?? 'судья', other]] as const) {
    const pairs = common(m)
    const bin = binary(pairs)
    const agree = bin.filter(([a, b]) => a === b).length / bin.length
    console.log(
      `${name.padEnd(16)} согласие(≥1) ${pct(agree)}  κ(≥1) ${kappa(bin, [0, 1]).toFixed(2)}  κ(0/1/2) ${
        kappa(pairs, [0, 1, 2]).toFixed(2)
      }  точное ${pct(pairs.filter(([a, b]) => a === b).length / pairs.length)}`,
    )
    console.log(`${''.padEnd(16)} строки — Sonnet 0/1/2, столбцы — судья 0/1/2: ${JSON.stringify(confusion(pairs))}`)
  }
  const sub = (m: Map<string, JudgeLabel>) =>
    new Map([...m].filter(([k]) => sessions.some((s) => k.startsWith(`${s}\t`))))
  const sets: Array<[string, Map<string, JudgeLabel>]> = [['Sonnet', ref], ['9B', sub(b9)], [
    models[0] ?? 'судья',
    other,
  ]]
  const subOrder = new Map(sessions.map((s) => [s, order.get(s)!] as const))
  console.log('\nпо делу@1 / @3 / @5, нужен@3:')
  for (const [name, m] of sets) {
    console.log(
      `${name.padEnd(16)} @1 ${pct(relevantAt(subOrder, m, 1))}  @3 ${pct(relevantAt(subOrder, m, 3))}  @5 ${
        pct(relevantAt(subOrder, m, 5))
      }  нужен@3 ${pct(relevantAt(subOrder, m, 3, 2))}`,
    )
  }
  console.log('\nдоля «по делу» по позиции 1..5:')
  for (const [name, m] of sets) {
    const row = [0, 1, 2, 3, 4].map((i) => `#${i + 1} ${(relevantByPosition(subOrder, m, i) * 100).toFixed(0)}%`)
    console.log(`${name.padEnd(16)} ${row.join('  ')}`)
  }
  if (repeats > 0) {
    const r = bootstrapKappa(sessions, subOrder, ref, b9, other, repeats)
    const f = (x: [number, number]) => `${x[0].toFixed(2)}–${x[1].toFixed(2)}`
    console.log(`\nБутстрэп по сессиям (${repeats} повторов), 95%-интервал κ(≥1):`)
    console.log(
      `9B ${f(r.a)}; судья ${f(r.b)}; разница (судья − 9B) ${f(r.diff)}, судья лучше в ${pct(r.bBetter)} повторов`,
    )
  }
}

function main(): void {
  const dir = arg('--dir') ?? join(scoutDataDir(), 'judge-compare')
  if (process.argv.includes('--prepare')) {
    prepare(dir)
  } else if (process.argv.includes('--compare')) {
    compare(dir, Number(arg('--bootstrap') ?? BOOTSTRAP_DEFAULT))
  } else {
    console.log('Запуск: bun scripts/scout/judge-compare.ts --prepare | --compare [--dir <каталог>] [--bootstrap N]')
  }
}

if (import.meta.main) {
  main()
}
