import { embedTexts, formatQuery, reciprocalRankFusion } from '../../../libs/scout/src/index'
import { splitOf } from '../cli'
import { type EvalCase, evaluateTools, type ToolMetrics, toolRanking } from '../eval'
import { EMBED_URL } from '../vectors'
import type { SuiteContext } from './types'
import { pct } from './util'

/** Сетка порога «ничего не советовать» по лучшему косинусу среди карточек инструментов */
export const COSINE_GRID = Array.from({ length: 26 }, (_, i) => Math.round((0.3 + i * 0.02) * 100) / 100)

export interface ToolVariantsResult {
  /** Порог варианта в, выбранный по dev */
  threshold: number
  groups: Array<{ variant: 'а' | 'б' | 'в'; group: string } & ToolMetrics>
  /** Сколько запросов не удалось вложить (сервер эмбеддингов недоступен) — тогда вариант не считается */
  noVector: number
}

/**
 * Эксперимент Э2.3: выбор инструмента (а) BM25 как есть, (б) гибрид BM25 + косинус описаний через RRF,
 * (в) (б) плюс порог «не советовать», если лучший косинус ниже t (t — по dev, замер — на test).
 * «Показан ли совет» в (а) и (б) берётся из боевого пути (`run`), поэтому ложный совет у них совпадает;
 * в (в) к нему добавляется порог.
 */
export async function runToolVariants(
  { engine, deps, cases, run }: SuiteContext,
  gold: Map<string, string[]>,
  advisable: Set<string>,
): Promise<{ summary: Record<string, number>; result: ToolVariantsResult } | undefined> {
  const store = deps.store
  if (!store) {
    console.log('\n== tools: варианты == нет векторов — пропущены')
    return undefined
  }
  const toolCards = engine.cards.filter((c) => (c.kind === 'skill' || c.kind === 'agent') && !c.scope)
  const titleById = new Map(toolCards.map((c) => [c.id, c.title]))
  const toolIds = toolCards.filter((c) => advisable.has(c.title) && store.dense.has(c.id)).map((c) => c.id)
  const vectors = new Map<string, Float32Array>()
  const url = deps.embedUrl ?? EMBED_URL
  for (let i = 0; i < cases.length; i += 16) {
    const batch = cases.slice(i, i + 16)
    try {
      const out = await embedTexts(batch.map((c) => formatQuery(c.query)), { url, timeoutMs: 60_000 })
      batch.forEach((c, j) => vectors.set(c.query, out[j]))
    } catch {
      // пакет не вложился — эти запросы считаем без вектора
    }
  }
  const noVector = cases.filter((c) => !vectors.has(c.query)).length
  const dense = (q: string) => {
    const v = vectors.get(q)
    return v ? store.dense.rank(v, toolIds).map((r) => ({ title: titleById.get(r.id)!, score: r.score })) : []
  }
  const bm25Rank = (q: string) => toolRanking(engine.search(q, 500))
  const fusedRank = (q: string) => {
    const d = dense(q)
    if (!d.length) {
      return bm25Rank(q)
    }
    const fused = reciprocalRankFusion([bm25Rank(q), d.map((x) => x.title)])
    return [...fused.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
  }
  const bestCos = (q: string) => dense(q)[0]?.score ?? -1
  const shownA = async (q: string) => Boolean((await run(q)).result.tool)
  const dev = cases.filter((c) => splitOf(c.sessionId) === 'dev')
  const test = cases.filter((c) => splitOf(c.sessionId) === 'test')
  const groupsOf = (): Array<[string, EvalCase[]]> => [['все', cases], ['dev', dev], ['test', test]]

  // Порог по dev: максимум (доля угаданных первым − доля ложных советов), при равенстве — меньший порог
  let threshold = COSINE_GRID[0]
  let bestNet = -Infinity
  for (const t of COSINE_GRID) {
    const m = await evaluateTools(
      async (q) => (bestCos(q) < t ? [] : fusedRank(q)),
      dev,
      gold,
      { shown: async (q) => (await shownA(q)) && bestCos(q) >= t, advisable },
    )
    const net = m.hit1 - m.falseAdvice
    console.log(`  сетка dev: t=${t} hit@1 ${pct(m.hit1)} ложный ${pct(m.falseAdvice)} net ${net.toFixed(3)}`)
    if (net > bestNet) {
      bestNet = net
      threshold = t
    }
  }

  const out: ToolVariantsResult['groups'] = []
  const summary: Record<string, number> = {}
  console.log(`\n== tools: варианты (порог в по dev: косинус ${threshold}) ==`)
  const variants: Array<['а' | 'б' | 'в', (q: string) => Promise<string[]>, (q: string) => Promise<boolean>]> = [
    ['а', async (q) => bm25Rank(q), shownA],
    ['б', async (q) => fusedRank(q), shownA],
    [
      'в',
      async (q) => (bestCos(q) < threshold ? [] : fusedRank(q)),
      async (q) => (await shownA(q)) && bestCos(q) >= threshold,
    ],
  ]
  for (const [variant, rank, shown] of variants) {
    for (const [group, list] of groupsOf()) {
      const m = await evaluateTools(rank, list, gold, { shown, advisable })
      out.push({ variant, group, ...m })
      console.log(
        `${variant} ${group.padEnd(5)} с эталоном ${String(m.goldCases).padStart(3)}  hit@1 ${
          pct(m.hit1).padStart(6)
        }  hit@3 ${pct(m.hit3).padStart(6)}  MRR ${m.mrr.toFixed(3)}  ложный совет ${pct(m.falseAdvice)}`,
      )
      if (variant !== 'а') {
        const all = group === 'все'
        const isTest = group === 'test'
        if (variant === 'б' && (all || isTest)) {
          summary[all ? 'инстр. б hit@1' : 'инстр. б hit@1 test'] = m.hit1 * 100
          if (all) {
            summary['инстр. б hit@3'] = m.hit3 * 100
          }
        }
        if (variant === 'в' && (all || isTest)) {
          summary[all ? 'инстр. в hit@1' : 'инстр. в hit@1 test'] = m.hit1 * 100
          summary[all ? 'инстр. в ложный' : 'инстр. в ложный test'] = m.falseAdvice * 100
        }
      }
    }
  }
  if (noVector) {
    console.log(`⚠️ запросов без вектора: ${noVector} (для них б = а)`)
  }
  return { summary, result: { threshold, groups: out, noVector } }
}
