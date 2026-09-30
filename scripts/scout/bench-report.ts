import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AppResult } from './suites/app'
import type { DocsResult } from './suites/docs'
import type { EditResult } from './suites/edit'
import type { FormsResult } from './suites/forms'
import type { HookResult } from './suites/hook'
import type { JudgeResult } from './suites/judge'
import type { LatencyResult } from './suites/latency'
import type { RobustResult } from './suites/robust'
import type { ToolsResult } from './suites/tools'

/** Ключевые метрики прогона: порядок колонок журнала и единицы для сравнения */
export type Unit = 'pp' | 'ms' | 'ratio' | 'n'
export const SUMMARY: Array<{ key: string; unit: Unit; journal?: boolean }> = [
  { key: 'R@5 dev', unit: 'pp', journal: true },
  { key: 'R@5 test', unit: 'pp', journal: true },
  { key: 'MRR', unit: 'ratio', journal: true },
  { key: 'инстр. top-1', unit: 'pp', journal: true },
  { key: 'поля dev', unit: 'pp', journal: true },
  { key: 'поля holdout', unit: 'pp', journal: true },
  { key: 'паттерн', unit: 'pp', journal: true },
  { key: 'ложная полка', unit: 'pp', journal: true },
  { key: 'p95 мс', unit: 'ms', journal: true },
  { key: 'устойчивость', unit: 'n', journal: true },
  { key: 'симв.', unit: 'n', journal: true },
  { key: 'инстр. точн.', unit: 'pp', journal: true },
  { key: 'нов. R@5 dev', unit: 'pp', journal: true },
  { key: 'нов. R@5 test', unit: 'pp', journal: true },
  { key: 'хабы топ-10 dev', unit: 'pp' },
  { key: 'хаб макс dev', unit: 'pp' },
  { key: 'лишнее', unit: 'pp', journal: true },
  { key: 'суд. по делу@3 dev', unit: 'pp', journal: true },
  { key: 'суд. по делу@3 test', unit: 'pp', journal: true },
  { key: 'суд. нужен@3', unit: 'pp', journal: true },
  { key: 'суд. по делу@1', unit: 'pp' },
  { key: 'суд. по делу@5', unit: 'pp' },
  { key: 'суд. покрытие', unit: 'pp' },
  { key: 'суд. согласие', unit: 'pp' },
  { key: 'R@5 все', unit: 'pp' },
  { key: 'R@5 коротк.', unit: 'pp' },
  { key: 'R@8 все', unit: 'pp' },
  { key: 'Hit@8 все', unit: 'pp' },
  { key: 'пустых справок', unit: 'pp' },
  { key: 'полка целиком dev', unit: 'n' },
  { key: 'полка целиком holdout', unit: 'n' },
  { key: 'ложный паттерн', unit: 'pp' },
  { key: 'p50 мс', unit: 'ms' },
  { key: 'max мс', unit: 'ms' },
  { key: 'хук p50 мс', unit: 'ms' },
  { key: 'хук max мс', unit: 'ms' },
  { key: 'app полнота', unit: 'pp' },
  { key: 'app попадание', unit: 'pp' },
  { key: 'global полнота', unit: 'pp' },
  { key: 'global попадание', unit: 'pp' },
  { key: 'инстр. hit@1', unit: 'pp' },
  { key: 'инстр. hit@3', unit: 'pp' },
  { key: 'инстр. MRR', unit: 'ratio' },
  { key: 'инстр. ложный', unit: 'pp' },
]

export type Summary = Record<string, number | null>

export interface BenchRun {
  label: string
  ts: string
  env: {
    gitSha: string
    dirty: boolean
    cards: number
    vectors: boolean
    embedder: boolean
    suites: string[]
  }
  docs?: DocsResult
  forms?: FormsResult
  latency?: LatencyResult
  robust?: RobustResult
  judge?: JudgeResult
  app?: AppResult
  edit?: EditResult
  tools?: ToolsResult
  hook?: HookResult
  summary: Summary
}

export function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${
    p(d.getSeconds())
  }`
}

function fmtValue(v: number | null, unit: Unit): string {
  if (v === null) {
    return '—'
  }
  return unit === 'pp' ? `${v.toFixed(1)}%` : unit === 'ratio' ? v.toFixed(3) : String(Math.round(v))
}

function fmtDelta(d: number, unit: Unit): string {
  const sign = d > 0 ? '+' : ''
  if (unit === 'pp') {
    return `${sign}${d.toFixed(1)} п.п.`
  }
  if (unit === 'ms') {
    return `${sign}${Math.round(d)} мс`
  }
  return unit === 'ratio' ? `${sign}${d.toFixed(3)}` : `${sign}${Math.round(d)}`
}

function journalRow(run: BenchRun): string {
  const cells = SUMMARY.filter((s) => s.journal).map((s) => {
    if (s.key === 'устойчивость') {
      return run.robust ? `${run.robust.passed}/${run.robust.total}` : '—'
    }
    return fmtValue(run.summary[s.key] ?? null, s.unit)
  })
  // Локальное время машины, как и в имени файла прогона
  const t = stamp(new Date(run.ts))
  const date = `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)} ${t.slice(9, 11)}:${t.slice(11, 13)}`
  const sha = `${run.env.gitSha}${run.env.dirty ? '*' : ''}`
  return `| ${[date, run.label, sha, ...cells].join(' | ')} |\n`
}

export function appendJournal(dir: string, run: BenchRun): void {
  const file = join(dir, 'journal.md')
  const head = ['дата', 'метка', 'sha', ...SUMMARY.filter((s) => s.journal).map((s) => s.key)]
  const headLines = [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`]
  if (!existsSync(file)) {
    writeFileSync(file, `${headLines.join('\n')}\n`)
  } else {
    // Колонки добавляются со временем: заголовок обновляем, старые строки не трогаем
    const lines = readFileSync(file, 'utf8').split('\n')
    if (lines[0] !== headLines[0]) {
      lines.splice(0, 2, ...headLines)
      writeFileSync(file, lines.join('\n'))
    }
  }
  appendFileSync(file, journalRow(run))
}

export function printCompare(cur: BenchRun, prevPath: string): void {
  const prev = JSON.parse(readFileSync(prevPath, 'utf8')) as BenchRun
  console.log(`\n== Сравнение с ${prev.label} (${prevPath}) ==`)
  let shown = 0
  for (const { key, unit } of SUMMARY) {
    const a = prev.summary[key]
    const b = cur.summary[key]
    if (a === null || a === undefined || b === null || b === undefined) {
      continue
    }
    shown++
    console.log(
      `${key.padEnd(24)} ${fmtValue(a, unit).padStart(8)} → ${fmtValue(b, unit).padStart(8)}  ${fmtDelta(b - a, unit)}`,
    )
  }
  if (!shown) {
    console.log('общих метрик нет (сьюты прогонов не пересекаются)')
  }
}

/** Ключи метрик сьютов, которых нет в `SUMMARY`: в журнал и сравнение они не попадут */
export function unknownMetricKeys(summary: Summary): string[] {
  const known = new Set(SUMMARY.map((s) => s.key))
  return Object.keys(summary).filter((k) => !known.has(k))
}
