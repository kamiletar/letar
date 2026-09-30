import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readJsonl } from '../cli'
import { type FormProbe, formsNegatives, scoreProbe } from '../forms-eval'
import type { Suite } from './types'
import { pct } from './util'

export interface FormsSet {
  name: string
  probes: number
  fieldRecall: number
  complete: number
  patternOk: number
  patternTotal: number
}

export interface FormsResult {
  sets: FormsSet[]
  negatives: { cases: number; fieldsShare: number; patternShare: number }
}

/** Полнота полей, полка целиком, паттерн; ложная полка на отрицательных задачах */
export const formsSuite: Suite = async ({ dataDir, cases, run }) => {
  console.log('\n== forms ==')
  const sets: FormsSet[] = []
  const files: Array<[string, string]> = [
    ['dev', join(dataDir, 'forms-probes.jsonl')],
    ['holdout', join(dataDir, 'forms-probes-holdout.jsonl')],
  ]
  for (const [name, file] of files) {
    if (!existsSync(file)) {
      console.log(`${name}: нет ${file}`)
      continue
    }
    const probes = readJsonl<FormProbe>(file)
    let recall = 0
    let complete = 0
    let patternOk = 0
    let patternTotal = 0
    for (const probe of probes) {
      const sc = scoreProbe(probe, (await run(probe.query)).result)
      recall += sc.fieldRecall
      complete += sc.complete ? 1 : 0
      if (sc.patternOk !== undefined) {
        patternTotal++
        patternOk += sc.patternOk ? 1 : 0
      }
    }
    const set = {
      name,
      probes: probes.length,
      fieldRecall: recall / probes.length,
      complete,
      patternOk,
      patternTotal,
    }
    sets.push(set)
    console.log(
      `${name.padEnd(8)} проб ${probes.length}  полнота полей ${
        pct(set.fieldRecall)
      }  полка целиком ${complete}/${probes.length}  паттерн ${patternOk}/${patternTotal}`,
    )
  }
  const negatives = formsNegatives(cases)
  let withFields = 0
  let withPattern = 0
  for (const c of negatives) {
    const r = (await run(c.query)).result
    withFields += r.fields.length ? 1 : 0
    withPattern += r.pattern ? 1 : 0
  }
  const neg = {
    cases: negatives.length,
    fieldsShare: negatives.length ? withFields / negatives.length : 0,
    patternShare: negatives.length ? withPattern / negatives.length : 0,
  }
  console.log(
    `ложная полка на ${neg.cases} отрицательных: поля ${pct(neg.fieldsShare)}, паттерн ${pct(neg.patternShare)}`,
  )
  const dev = sets.find((x) => x.name === 'dev')
  const hold = sets.find((x) => x.name === 'holdout')
  const patternTotal = sets.reduce((n, x) => n + x.patternTotal, 0)
  const result: FormsResult = { sets, negatives: neg }
  return {
    summary: {
      'поля dev': dev ? dev.fieldRecall * 100 : null,
      'поля holdout': hold ? hold.fieldRecall * 100 : null,
      'полка целиком dev': dev?.complete ?? null,
      'полка целиком holdout': hold?.complete ?? null,
      паттерн: patternTotal ? (sets.reduce((n, x) => n + x.patternOk, 0) / patternTotal) * 100 : null,
      'ложная полка': neg.fieldsShare * 100,
      'ложный паттерн': neg.patternShare * 100,
    },
    result,
  }
}
