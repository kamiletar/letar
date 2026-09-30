#!/usr/bin/env bun
/**
 * Бенч скаута на боевом пути хука: всё идёт через `scoutQuery` (тот же таймаут эмбеддера, та же
 * выдача для кворума), векторы загружаются один раз. Результаты — JSON в `SCOUT_HOME/bench/runs/`
 * и строка в `SCOUT_HOME/bench/journal.md`, чтобы прогоны можно было сравнивать.
 *
 * Данные лежат в `scoutDataDir()` и читаются как есть (зафиксированный снимок):
 * `eval-cases.jsonl` (docs, полка форм на отрицательных), `forms-probes.jsonl` (dev),
 * `forms-probes-holdout.jsonl` (holdout).
 *
 * Сьюты (`--suite`, по умолчанию все, кроме `hook`):
 * - `docs` — метрики `evaluate()` отдельно для dev, test (по `splitOf(sessionId)`) и коротких задач;
 * - `forms` — полнота полей, полка целиком, паттерн; ложная полка на отрицательных задачах;
 * - `latency` — время `scoutQuery` на тёплом процессе (p50/p95/max);
 * - `robust` — проверки устойчивости; проваленные не роняют бенч, а считаются и печатаются;
 * - `hook` — настоящий процесс хука `.claude/hooks/scout-brief.ts`, `--hook-runs N` запусков;
 * - `app` — справка приложения по голой `/<app>`: `sessions.jsonl` (снимок, не `-live`), сессии с командой
 *   делятся по дате 70/30; справки строятся на первой части, полнота и «сессий с попаданием» — на второй,
 *   и то же для общего списка. Только явно.
 * - `judge` — точность справки по меткам судьи (`judge-labels.jsonl` — кеш 9B, `judge-ref.jsonl` —
 *   эталон Sonnet, только чтение); для новых пар зовёт 9B на `SCOUT_JUDGE_URL`. Только явно.
 *
 * Запуск: bun scripts/scout/bench.ts [--label <имя>] [--suite docs,forms,latency,robust,hook]
 *   [--hook-runs 5] [--compare <путь к json | last>]
 */
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Bm25 } from '../../libs/scout/src/index'
import { arg, readJsonl } from './cli'
import type { EvalCase } from './eval'
import { freshIndex, scoutQuery, type ScoutQueryResult } from './hook-core'
import { findRepoRoot } from './index-store'
import { scoutDataDir, scoutHome } from './paths'
import { loadPhraseStore } from './phrases'
import { type AppResult, appSuite } from './suites/app'
import { type DocsResult, docsSuite } from './suites/docs'
import { type EditResult, editSuite } from './suites/edit'
import { type FormsResult, formsSuite } from './suites/forms'
import { type HookResult, hookSuite } from './suites/hook'
import { type JudgeResult, judgeSuite } from './suites/judge'
import { type LatencyResult, latencySuite } from './suites/latency'
import { type RobustResult, robustSuite } from './suites/robust'
import type { Suite } from './suites/types'
import { loadVectorStore } from './vectors'

export type SuiteName = 'docs' | 'forms' | 'latency' | 'robust' | 'hook' | 'judge' | 'app' | 'edit'

/** Реестр сьютов в порядке запуска: новый сьют — новый файл в `suites/` и строка здесь */
const SUITES: Record<SuiteName, Suite> = {
  docs: docsSuite,
  judge: judgeSuite,
  forms: formsSuite,
  latency: latencySuite,
  robust: robustSuite,
  hook: hookSuite,
  app: appSuite,
  edit: editSuite,
}
// Порядок в справке и сообщении об ошибке; порядок запуска — по реестру `SUITES`
const ALL_SUITES: SuiteName[] = ['docs', 'forms', 'latency', 'robust', 'hook', 'judge', 'app', 'edit']
const DEFAULT_SUITES: SuiteName[] = ['docs', 'forms', 'latency', 'robust']

/** Ключевые метрики прогона: порядок колонок журнала и единицы для сравнения */
type Unit = 'pp' | 'ms' | 'ratio' | 'n'
const SUMMARY: Array<{ key: string; unit: Unit; journal?: boolean }> = [
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
]

type Summary = Record<string, number | null>

interface BenchRun {
  label: string
  ts: string
  env: {
    gitSha: string
    dirty: boolean
    cards: number
    vectors: boolean
    embedder: boolean
    suites: SuiteName[]
  }
  docs?: DocsResult
  forms?: FormsResult
  latency?: LatencyResult
  robust?: RobustResult
  judge?: JudgeResult
  app?: AppResult
  edit?: EditResult
  hook?: HookResult
  summary: Summary
}

function git(root: string, args: string[]): string {
  return Bun.spawnSync(['git', ...args], { cwd: root }).stdout.toString().trim()
}

function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${
    p(d.getSeconds())
  }`
}

const USAGE = `Запуск: bun scripts/scout/bench.ts [--label <имя>] [--suite ${ALL_SUITES.join(',')}]
  [--hook-runs 5] [--compare <путь к json | last>] [--no-phrases] [--help]`

/** Флаги со значением и без; неизвестный флаг — ошибка (код 2), `--help` — справка */
function checkArgs(argv: string[]): void {
  const withValue = new Set(['--label', '--suite', '--hook-runs', '--compare'])
  const bare = new Set(['--no-phrases', '--help'])
  if (argv.includes('--help')) {
    console.log(USAGE)
    process.exit(0)
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (withValue.has(a)) {
      i++
    } else if (!bare.has(a)) {
      console.error(`Неизвестный аргумент: ${a}\n${USAGE}`)
      process.exit(2)
    }
  }
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

function appendJournal(dir: string, run: BenchRun): void {
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

function printCompare(cur: BenchRun, prevPath: string): void {
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

async function main() {
  checkArgs(process.argv.slice(2))
  const root = findRepoRoot()
  if (!root) {
    console.error('Не найден корень репозитория')
    process.exit(1)
  }
  const suites = (arg('--suite')?.split(',').map((s) => s.trim()).filter(Boolean) ?? DEFAULT_SUITES) as SuiteName[]
  const unknown = suites.filter((s) => !ALL_SUITES.includes(s))
  if (unknown.length) {
    console.error(`Неизвестные сьюты: ${unknown.join(', ')}. Есть: ${ALL_SUITES.join(', ')}`)
    process.exit(1)
  }
  const label = arg('--label') ?? 'run'
  const home = scoutHome()
  const dataDir = scoutDataDir()
  const engine = new Bm25(freshIndex(root, home))
  const store = loadVectorStore(home) ?? null
  // `--no-phrases` — прогон без третьего списка слияния, для сравнения
  const noPhrases = process.argv.includes('--no-phrases')
  const phrases = noPhrases ? null : loadPhraseStore(home) ?? null
  const deps = { store, phrases }

  // Кеш по тексту запроса: сьюты делят общие запросы и не гоняют эмбеддер дважды
  const cache = new Map<string, ScoutQueryResult>()
  const run = async (q: string): Promise<ScoutQueryResult> => {
    const hit = cache.get(q)
    if (hit) {
      return hit
    }
    const r = await scoutQuery(engine, home, q, deps, root)
    cache.set(q, r)
    return r
  }

  // Прогрев: первый запрос платит за JIT и заодно показывает, отвечает ли эмбеддер
  const warm = await scoutQuery(engine, home, 'сделай форму заявки с телефоном клиента', deps, root)
  const dirty = git(root, ['status', '--porcelain', '--', 'libs/scout', 'scripts/scout']).length > 0
  const now = new Date()
  const result: BenchRun = {
    label,
    ts: now.toISOString(),
    env: {
      gitSha: git(root, ['rev-parse', '--short', 'HEAD']),
      dirty,
      cards: engine.cards.length,
      vectors: store !== null,
      embedder: warm.forms === 'dense',
      suites,
    },
    summary: {},
  }
  console.log(
    `== Окружение: ${result.env.gitSha}${dirty ? ' (есть правки)' : ''}, карточек ${result.env.cards}, векторы ${
      store ? 'есть' : 'нет'
    }, эмбеддер ${result.env.embedder ? 'отвечает' : 'молчит'} ==`,
  )

  const casesFile = join(dataDir, 'eval-cases.jsonl')
  const cases = existsSync(casesFile) ? readJsonl<EvalCase>(casesFile) : []
  if (!cases.length && suites.some((x) => ['docs', 'latency', 'forms'].includes(x))) {
    console.error(`Нет случаев в ${casesFile} — docs и latency пропущены (bun scripts/scout/eval.ts --out ...)`)
  }
  if (suites.some((x) => x === 'docs' || x === 'latency' || x === 'judge')) {
    for (const c of cases) {
      await run(c.query)
    }
  }

  const ctx = {
    root,
    home,
    dataDir,
    engine,
    deps,
    run,
    cached: (q: string) => cache.get(q),
    cases,
    flags: { noPhrases },
  }
  // Порядок запуска — как в реестре, а не как в `--suite`
  for (const name of (Object.keys(SUITES) as SuiteName[]).filter((n) => suites.includes(n))) {
    const out = await SUITES[name](ctx)
    Object.assign(result.summary, out.summary)
    if (out.result !== undefined) {
      ;(result as unknown as Record<string, unknown>)[name] = out.result
    }
  }
  for (const { key } of SUMMARY) {
    result.summary[key] ??= null
  }

  const benchDir = join(home, 'bench')
  const runsDir = join(benchDir, 'runs')
  mkdirSync(runsDir, { recursive: true })
  const compare = arg('--compare')
  // Самый свежий прогон берём до записи текущего
  const prevPath = compare === 'last'
    ? readdirSync(runsDir).filter((f) => f.endsWith('.json')).sort().map((f) => join(runsDir, f)).at(-1)
    : compare
  // Метка бывает с `:` (например `a:b`): в имени файла на Windows это поток данных, а не часть имени
  const file = join(runsDir, `${stamp(now)}-${label.replace(/[^\w.=+-]+/g, '_')}.json`)
  writeFileSync(file, JSON.stringify(result, null, 2))
  appendJournal(benchDir, result)
  console.log(`\nПрогон → ${file}\nЖурнал → ${join(benchDir, 'journal.md')}`)
  if (compare) {
    if (prevPath && existsSync(prevPath)) {
      printCompare(result, prevPath)
    } else {
      console.log(
        `\nСравнивать не с чем: ${compare === 'last' ? 'в runs/ нет прежних прогонов' : `нет файла ${compare}`}`,
      )
    }
  }
}

if (import.meta.main) {
  await main()
}
