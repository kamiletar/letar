#!/usr/bin/env bun
/**
 * Замер полки «Поля формы» и строки «Паттерн формы» на ручном наборе проб.
 *
 * Проба — задача языком разработчика и ожидаемые компоненты `Form.Field.*`/`Form.Document.*` и
 * паттерн `get_form_pattern`. Набор лежит вне репозитория (`SCOUT_DATA/forms-probes.jsonl`):
 * `{"query", "fields": [...], "any"?: true, "pattern"?}`; `any` — хватит одного из списка.
 *
 * Метрики: полнота полей (доля ожидаемых на полке), пробы с полкой целиком, точность паттерна,
 * и ложные срабатывания — доля реальных задач без доков форм в эталоне, где полка всё же
 * появилась (`eval-cases.jsonl` из `eval.ts --out`).
 *
 * Запуск: bun scripts/scout/forms-eval.ts [--backend all|bm25|hybrid|rerank] [--probes <jsonl>] [--show]
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { Bm25, buildIndex, collectCards, type ScoutResult } from '../../libs/scout/src/index'
import { arg, readJsonl } from './cli'
import { backendsFor, type EvalCase, type Searcher } from './eval'
import { findRepoRoot } from './index-store'
import { scoutDataDir } from './paths'

export interface FormProbe {
  query: string
  fields: string[]
  any?: boolean
  pattern?: string
}

export interface ProbeScore {
  fieldRecall: number
  complete: boolean
  patternOk?: boolean
}

/** Оценка одной пробы по разложенной справке */
export function scoreProbe(probe: FormProbe, result: ScoutResult): ProbeScore {
  const shown = new Set(result.fields.map((f) => f.name))
  const found = probe.fields.filter((f) => shown.has(f)).length
  const fieldRecall = !probe.fields.length ? 1 : probe.any ? (found ? 1 : 0) : found / probe.fields.length
  return {
    fieldRecall,
    complete: fieldRecall === 1,
    patternOk: probe.pattern ? result.pattern?.name === probe.pattern : undefined,
  }
}

/** Отрицательные задачи: эталон есть, но это не формы — полки полей и паттерна там быть не должно */
export function formsNegatives(cases: EvalCase[]): EvalCase[] {
  return cases.filter((c) =>
    c.goldDocs.length && !c.goldDocs.some((d) => /forms?[-./]/.test(d)) && !/форм|form/i.test(c.query)
  )
}

async function main() {
  const probesFile = arg('--probes') ?? join(scoutDataDir(), 'forms-probes.jsonl')
  const casesFile = join(scoutDataDir(), 'eval-cases.jsonl')
  const root = findRepoRoot()
  if (!root || !existsSync(probesFile)) {
    console.error(`Нужны корень репозитория и ${probesFile}`)
    process.exit(1)
  }
  const probes = readJsonl<FormProbe>(probesFile)
  const negatives = existsSync(casesFile)
    ? formsNegatives(readJsonl<EvalCase>(casesFile))
    : []
  const engine = new Bm25(buildIndex(collectCards(root)))
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`
  console.log(`Проб: ${probes.length}, отрицательных задач: ${negatives.length}`)
  for (const [name, search] of backendsFor(engine, arg('--backend') ?? 'all') as Array<[string, Searcher]>) {
    let recall = 0
    let complete = 0
    let patternOk = 0
    let patternCases = 0
    const misses: string[] = []
    for (const probe of probes) {
      const result = await search(probe.query)
      const s = scoreProbe(probe, result)
      recall += s.fieldRecall
      complete += s.complete ? 1 : 0
      if (s.patternOk !== undefined) {
        patternCases++
        patternOk += s.patternOk ? 1 : 0
      }
      if (!s.complete || s.patternOk === false) {
        misses.push(
          `✗ ${probe.query}\n  ждали: ${probe.fields.join(', ') || '—'}${
            probe.pattern ? ` / ${probe.pattern}` : ''
          }\n  дали:  ${result.fields.map((f) => f.name).join(', ') || '—'}${
            result.pattern ? ` / ${result.pattern.name}` : ''
          }`,
        )
      }
    }
    let falsePositive = 0
    for (const c of negatives) {
      falsePositive += (await search(c.query)).fields.length ? 1 : 0
    }
    console.log(
      `${name.padEnd(8)} полнота полей ${
        pct(recall / probes.length)
      }  полка целиком ${complete}/${probes.length}  паттерн ${patternOk}/${patternCases}  ложная полка ${
        pct(negatives.length ? falsePositive / negatives.length : 0)
      }`,
    )
    if (process.argv.includes('--show')) {
      console.log(misses.join('\n'))
    }
  }
}

if (import.meta.main) {
  await main()
}
