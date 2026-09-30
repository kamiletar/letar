import { formatBrief, mentionedIn } from '../../../libs/scout/src/index'
import { splitOf } from '../cli'
import { advisableTools, type EvalCase, evaluate, type Metrics } from '../eval'
import { hubMetrics } from '../hubs'
import type { Suite } from './types'
import { EMPTY, loadedPathsOf, pct } from './util'

export interface DocsGroup extends Metrics {
  group: string
}

export interface DocsResult {
  groups: DocsGroup[]
  avgChars: number
  emptyShare: number
}

/** Метрики `evaluate()` отдельно для dev, test (по `splitOf(sessionId)`) и коротких задач */
export const docsSuite: Suite = async ({ engine, cases, run, cached }) => {
  if (!cases.length) {
    return EMPTY
  }
  const s: Record<string, number | null> = {}
  const advisable = advisableTools(engine.cards)
  const search = async (q: string) => (await run(q)).result
  const loadedPaths = loadedPathsOf(engine)
  const redundant = (q: string, p: string) => mentionedIn(q, p) || loadedPaths.has(p)
  const groups: Array<[string, EvalCase[]]> = [
    ['все', cases],
    ['dev', cases.filter((c) => splitOf(c.sessionId) === 'dev')],
    ['test', cases.filter((c) => splitOf(c.sessionId) === 'test')],
    ['короткие', cases.filter((c) => c.query.length < 120)],
    ['test<400', cases.filter((c) => splitOf(c.sessionId) === 'test' && c.query.length < 400)],
    ['все<400', cases.filter((c) => c.query.length < 400)],
  ]
  const out: DocsGroup[] = []
  console.log('\n== docs ==')
  for (const [group, list] of groups) {
    const { metrics, perCase } = await evaluate(search, list, advisable, { redundant })
    out.push({ group, ...metrics })
    if (group === 'dev') {
      // Хабность на итоговой выдаче: первые 5 по очкам, как их видит агент
      const hub = hubMetrics(perCase.map((c) => c.got.slice(0, 5)))
      s['хабы топ-10 dev'] = hub.top10Share * 100
      s['хаб макс dev'] = hub.maxFreq * 100
      console.log(
        `${''.padEnd(9)} хабность: 10 частых доков занимают ${pct(hub.top10Share)} мест пятёрки, максимум ${
          pct(hub.maxFreq)
        } запросов`,
      )
    }
    console.log(
      `${group.padEnd(9)} n=${String(metrics.cases).padStart(3)}  R@5 ${pct(metrics.recall5).padStart(6)}  R@8 ${
        pct(metrics.recall8).padStart(6)
      }  Hit@8 ${pct(metrics.hit8).padStart(6)}  MRR ${metrics.mrr.toFixed(3)}  инстр. top-1 (советуемые) ${
        pct(metrics.toolTop1)
      } (${metrics.toolCases}), точн. ${pct(metrics.toolPrecision)}`,
    )
    console.log(
      `${''.padEnd(9)} нов. R@5 ${
        pct(metrics.novelRecall5)
      } (эталонов ${metrics.novelGold}, случаев ${metrics.novelCases}), нов. Hit@5 ${
        pct(metrics.novelHit5)
      }, упом. R@5 ${pct(metrics.mentionedRecall5)}, лишнее ${pct(metrics.redundancy)}`,
    )
  }
  const briefs = cases.map((c) => formatBrief(cached(c.query)!.result))
  const avgChars = briefs.reduce((n, b) => n + b.length, 0) / briefs.length
  const emptyShare = briefs.filter((b) => !b).length / briefs.length
  console.log(`справка: в среднем ${Math.round(avgChars)} симв., пустых ${pct(emptyShare)}`)
  const g = (name: string) => out.find((x) => x.group === name)!
  s['R@5 dev'] = g('dev').recall5 * 100
  s['R@5 test'] = g('test').recall5 * 100
  s['MRR'] = g('все').mrr
  s['инстр. top-1'] = g('все').toolTop1 * 100
  s['инстр. точн.'] = g('все').toolPrecision * 100
  s['нов. R@5 dev'] = g('dev').novelRecall5 * 100
  s['нов. R@5 test'] = g('test').novelRecall5 * 100
  s['лишнее'] = g('все').redundancy * 100
  s['R@5 все'] = g('все').recall5 * 100
  s['R@5 коротк.'] = g('короткие').recall5 * 100
  s['нов. R@5 test<400'] = g('test<400').novelRecall5 * 100
  s['нов. R@5 все<400'] = g('все<400').novelRecall5 * 100
  s['R@8 все'] = g('все').recall8 * 100
  s['Hit@8 все'] = g('все').hit8 * 100
  s['пустых справок'] = emptyShare * 100
  s['симв.'] = avgChars
  const result: DocsResult = { groups: out, avgChars, emptyShare }
  return { summary: s, result }
}
