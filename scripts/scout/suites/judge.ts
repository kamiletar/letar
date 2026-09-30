import { appendFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ScoutResult } from '../../../libs/scout/src/index'
import { splitOf } from '../cli'
import type { EvalCase } from '../eval'
import {
  JUDGE_MODEL,
  type JudgeGroup,
  judgeGroups,
  type JudgeItem,
  judgeItems,
  type JudgeLabel,
  labelKey,
  loadLabels,
} from '../judge'
import type { Suite } from './types'
import { EMPTY, pct } from './util'

export interface JudgeResult {
  groups: JudgeGroup[]
  newLabels: number
  serverAnswered: boolean | null
  unparsed: number
}

/** Пункты справки для судьи: доки и ловушки вперемешку по убыванию очков (стабильно, доки первыми) */
export function judgedItems(result: ScoutResult, limit = 5): JudgeItem[] {
  return [...result.docs, ...result.traps]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((d) => ({ path: d.path, title: d.section ? `${d.title} § ${d.section}` : d.title, summary: d.summary }))
}

/** Точность справки по меткам судьи: кеш 9B, эталон Sonnet — только чтение; для новых пар зовёт 9B */
export const judgeSuite: Suite = async ({ dataDir, cases, run, cached }) => {
  if (!cases.length) {
    return EMPTY
  }
  console.log('\n== judge ==')
  const labelsFile = join(dataDir, 'judge-labels.jsonl')
  const labels = loadLabels(labelsFile)
  const ref = loadLabels(join(dataDir, 'judge-ref.jsonl'))
  const judged = cases.filter((c) => c.goldDocs.length)
  let newLabels = 0
  let serverAnswered: boolean | null = null
  let unparsed = 0
  const record = (c: EvalCase, it: JudgeItem, label: 0 | 1 | 2) => {
    const l: JudgeLabel = { sessionId: c.sessionId, path: it.path, label, judge: JUDGE_MODEL }
    labels.set(labelKey(c.sessionId, it.path), l)
    appendFileSync(
      labelsFile,
      `${JSON.stringify(l)}
`,
    )
    newLabels++
  }
  // Случаи, где 9B ответила, но пачку не разобрали: переспрашиваем в конце по одному пункту
  const retry: Array<{ c: EvalCase; items: JudgeItem[] }> = []
  for (const c of judged) {
    const items = judgedItems((await run(c.query)).result)
    const missing = items.filter((it) => !labels.has(labelKey(c.sessionId, it.path)))
    if (!missing.length || serverAnswered === false) {
      continue
    }
    const got = await judgeItems(c.query, missing)
    if ('error' in got) {
      // Сервер лёг — больше не зовём; ответ не разобран — переспросим во втором проходе
      if (got.error === 'unreachable') {
        serverAnswered = false
      } else {
        retry.push({ c, items: missing })
      }
      continue
    }
    serverAnswered = true
    missing.forEach((it, i) => record(c, it, got.labels[i]))
  }
  let stillUnparsed = 0
  for (const { c, items } of serverAnswered === false ? [] : retry) {
    for (const it of items) {
      const one = await judgeItems(c.query, [it])
      if ('error' in one) {
        stillUnparsed++
      } else {
        record(c, it, one.labels[0])
      }
    }
  }
  unparsed = stillUnparsed
  const shown = (list: EvalCase[]) =>
    list.map((c) => ({ sessionId: c.sessionId, paths: judgedItems(cached(c.query)!.result).map((it) => it.path) }))
  const out = judgeGroups(
    [
      { group: 'dev', cases: shown(judged.filter((c) => splitOf(c.sessionId) === 'dev')) },
      { group: 'test', cases: shown(judged.filter((c) => splitOf(c.sessionId) === 'test')) },
      { group: 'все', cases: shown(judged) },
    ],
    labels,
    ref,
  )
  for (const g of out) {
    console.log(
      `${g.group.padEnd(5)} n=${String(g.cases).padStart(3)}  по делу@1 ${pct(g.relevant1)}  @3 ${
        pct(g.relevant3)
      }  @5 ${pct(g.relevant5)}  нужен@3 ${pct(g.needed3)}  покрытие ${pct(g.coverage)}  согласие с эталоном ${
        g.agreement === null ? '—' : `${pct(g.agreement)} (${g.agreementPairs} пар)`
      }`,
    )
  }
  console.log(
    `новых меток от 9B: ${newLabels}${
      serverAnswered === false ? '; судья не ответил — считаю по кешу' : ''
    }; пар не разобрано после переспроса: ${unparsed}`,
  )
  const jg = (name: string) => out.find((x) => x.group === name)!
  const agreement = jg('все').agreement
  const result: JudgeResult = { groups: out, newLabels, serverAnswered, unparsed }
  return {
    summary: {
      'суд. по делу@3 dev': jg('dev').relevant3 * 100,
      'суд. по делу@3 test': jg('test').relevant3 * 100,
      'суд. нужен@3': jg('все').needed3 * 100,
      'суд. по делу@1': jg('все').relevant1 * 100,
      'суд. по делу@5': jg('все').relevant5 * 100,
      'суд. покрытие': jg('все').coverage * 100,
      'суд. согласие': agreement === null ? null : agreement * 100,
    },
    result,
  }
}
