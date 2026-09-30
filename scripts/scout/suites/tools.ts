import { splitOf } from '../cli'
import { advisableTools, type EvalCase, evaluateTools, type ToolMetrics, toolRanking } from '../eval'
import { loadToolGold } from '../tool-gold'
import type { Suite } from './types'
import { EMPTY, pct } from './util'

export interface ToolsResult {
  groups: Array<{ group: string } & ToolMetrics>
  /** Сколько задач, где показанный `result.tool` не совпал с первым в списке (должно быть 0) */
  toolMismatch: number
  /** Задач с непустым эталоном судьи */
  goldCases: number
}

/**
 * Выбор инструмента по эталону судьи (`tool-gold.jsonl`): hit@1, hit@3, MRR на задачах с непустым
 * эталоном, ложный совет — на пустых. Ранкер — порядок карточек инструментов в BM25-выдаче, как
 * `layoutHits` выбирает `tool`. Чужой поиск подставляется другим `rank` в `evaluateTools`.
 */
export const toolsSuite: Suite = async ({ engine, cases, run, dataDir }) => {
  const goldRows = loadToolGold(dataDir)
  if (!cases.length || !goldRows.length) {
    console.log('\n== tools == нет tool-gold.jsonl или eval-cases.jsonl — пропущен (bun scripts/scout/tool-gold.ts)')
    return EMPTY
  }
  const gold = new Map(goldRows.map((r) => [r.sessionId, r.tools]))
  const advisable = advisableTools(engine.cards)
  const rank = async (q: string) => toolRanking(engine.search(q, 500))
  const shown = async (q: string) => Boolean((await run(q)).result.tool)
  // Показанный `result.tool` обязан быть первым в списке
  let toolMismatch = 0
  for (const c of cases) {
    const tool = (await run(c.query)).result.tool?.name
    if (tool && tool !== (await rank(c.query))[0]) {
      toolMismatch++
    }
  }
  const groups: Array<[string, EvalCase[]]> = [
    ['все', cases],
    ['dev', cases.filter((c) => splitOf(c.sessionId) === 'dev')],
    ['test', cases.filter((c) => splitOf(c.sessionId) === 'test')],
  ]
  const out: ToolsResult['groups'] = []
  console.log('\n== tools ==')
  for (const [group, list] of groups) {
    const m = await evaluateTools(rank, list, gold, { shown, advisable })
    out.push({ group, ...m })
    console.log(
      `${group.padEnd(5)} n=${String(m.cases).padStart(3)}  с эталоном ${String(m.goldCases).padStart(3)}  hit@1 ${
        pct(m.hit1).padStart(6)
      }  hit@3 ${pct(m.hit3).padStart(6)}  MRR ${m.mrr.toFixed(3)}  ложный совет ${
        pct(m.falseAdvice)
      } (пустых ${m.emptyCases})  согласие с вызовами ${pct(m.agree)} (${m.agreeCases})`,
    )
  }
  console.log(`result.tool ≠ первый в списке: ${toolMismatch}`)
  const g = (name: string) => out.find((x) => x.group === name)!
  const s: Record<string, number | null> = {
    'инстр. hit@1': g('все').hit1 * 100,
    'инстр. hit@3': g('все').hit3 * 100,
    'инстр. MRR': g('все').mrr,
    'инстр. ложный': g('все').falseAdvice * 100,
  }
  const result: ToolsResult = { groups: out, toolMismatch, goldCases: g('все').goldCases }
  return { summary: s, result }
}
