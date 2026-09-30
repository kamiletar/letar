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
 * - `judge` — точность справки по меткам судьи (`judge-labels.jsonl` — кеш 9B, `judge-ref.jsonl` —
 *   эталон Sonnet, только чтение); для новых пар зовёт 9B на `SCOUT_JUDGE_URL`. Только явно.
 *
 * Запуск: bun scripts/scout/bench.ts [--label <имя>] [--suite docs,forms,latency,robust,hook]
 *   [--hook-runs 5] [--compare <путь к json | last>]
 */
import { createHash } from 'node:crypto'
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { Bm25, formatBrief, mentionedIn, type ScoutResult } from '../../libs/scout/src/index'
import { arg, readJsonl } from './cli'
import { advisableTools, type EvalCase, evaluate, type Metrics } from './eval'
import { type FormProbe, formsNegatives, scoreProbe } from './forms-eval'
import { freshIndex, scoutQuery, type ScoutQueryResult } from './hook-core'
import { findRepoRoot, indexPath } from './index-store'
import {
  JUDGE_MODEL,
  type JudgeGroup,
  judgeGroups,
  type JudgeItem,
  judgeItems,
  type JudgeLabel,
  labelKey,
  loadLabels,
} from './judge'
import { scoutDataDir, scoutHome } from './paths'
import { loadPhraseStore } from './phrases'
import { loadVectorStore } from './vectors'

export type Suite = 'docs' | 'forms' | 'latency' | 'robust' | 'hook' | 'judge'
const ALL_SUITES: Suite[] = ['docs', 'forms', 'latency', 'robust', 'hook', 'judge']
const DEFAULT_SUITES: Suite[] = ['docs', 'forms', 'latency', 'robust']

/** Детерминированное разбиение случаев: около 20% уходит в `test`, остальное — `dev` */
export function splitOf(id: string): 'dev' | 'test' {
  return createHash('sha1').update(id).digest()[0] % 5 === 0 ? 'test' : 'dev'
}

/** Проверка устойчивости: исключение внутри считается провалом */
export interface RobustCheck {
  name: string
  query: string
  check: (r: ScoutQueryResult) => boolean
}

const SERVICE_COMMANDS = [
  'end-session',
  'deploy-agent',
  'sync-env',
  'forms-dev',
  'forms-coordinator',
  'ui-coordinator',
  'animatrona-coordinator',
  'webstudio',
  'letar',
  'repo',
]

function noNaN(r: ScoutResult): boolean {
  return [...r.docs, ...r.traps].every((d) => !Number.isNaN(d.score))
}

const STACK_LINE = 'at Object.<anonymous> (C:\\web\\letar\\apps\\x\\src\\y.ts:10:5)\n'
const LONG_PASTE = `форма заявки с телефоном клиента\n${
  STACK_LINE.repeat(Math.ceil(22_000 / STACK_LINE.length)).slice(0, 22_000)
}`

export const ROBUST_CHECKS: RobustCheck[] = [
  {
    name: 'constructor',
    query: 'constructor в классе стал undefined',
    check: (r) => Boolean(formatBrief(r.result)) && noNaN(r.result),
  },
  {
    name: 'proto-words',
    query: 'toString valueOf hasOwnProperty __proto__ в объекте конфига',
    check: (r) => noNaN(r.result),
  },
  {
    name: 'long-paste',
    query: LONG_PASTE,
    check: (r) => r.forms === 'dense' && r.result.fields.some((f) => f.name === 'Form.Field.Phone'),
  },
  {
    name: 'no-service-command',
    query: 'задеплой приложение на прод после правки',
    check: (r) => !r.result.tool || !SERVICE_COMMANDS.includes(r.result.tool.name),
  },
  {
    name: 'subdir-command',
    query: 'проведи аудит безопасности приложения по OWASP',
    check: (r) => r.result.tool?.name === 'audit:security-check' || r.result.tool?.name === 'security-auditor',
  },
  {
    name: 'pattern-only',
    query: 'нужна многошаговая форма-мастер оформления заказа',
    check: (r) => r.result.pattern?.name === 'multi-step',
  },
  {
    name: 'formula-not-form',
    query: 'пересчитай формулу сметы и сформируй итог',
    check: (r) => r.result.fields.length === 0,
  },
]

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
]

type Summary = Record<string, number | null>

interface DocsGroup extends Metrics {
  group: string
}

interface FormsSet {
  name: string
  probes: number
  fieldRecall: number
  complete: number
  patternOk: number
  patternTotal: number
}

/** Пункты справки для судьи: доки и ловушки вперемешку по убыванию очков (стабильно, доки первыми) */
export function judgedItems(result: ScoutResult, limit = 5): JudgeItem[] {
  return [...result.docs, ...result.traps]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((d) => ({ path: d.path, title: d.section ? `${d.title} § ${d.section}` : d.title, summary: d.summary }))
}

interface BenchRun {
  label: string
  ts: string
  env: { gitSha: string; dirty: boolean; cards: number; vectors: boolean; embedder: boolean; suites: Suite[] }
  docs?: { groups: DocsGroup[]; avgChars: number; emptyShare: number }
  forms?: { sets: FormsSet[]; negatives: { cases: number; fieldsShare: number; patternShare: number } }
  latency?: { n: number; p50: number; p95: number; max: number }
  robust?: { passed: number; total: number; failed: string[] }
  judge?: { groups: JudgeGroup[]; newLabels: number; serverAnswered: boolean | null }
  hook?: { runs: number; p50: number; max: number; ok: boolean; problems: string[] }
  summary: Summary
}

function percentile(sorted: number[], p: number): number {
  return sorted.length ? sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)] : 0
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`
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

/** Настоящий хук отдельным процессом: время целиком, код выхода, валидность stdout */
async function runHook(root: string, home: string, runs: number): Promise<NonNullable<BenchRun['hook']>> {
  const tmp = mkdtempSync(join(tmpdir(), 'scout-bench-'))
  const times: number[] = []
  const problems: string[] = []
  try {
    for (const f of [basename(indexPath(home, root)), 'vectors.json', 'vectors.f32']) {
      if (existsSync(join(home, f))) {
        copyFileSync(join(home, f), join(tmp, f))
      }
    }
    for (let i = 0; i < runs; i++) {
      const payload = JSON.stringify({
        session_id: `bench-${Date.now()}-${i}`,
        prompt: 'сделай форму заявки: имя, телефон клиента и email',
        cwd: root,
      })
      const started = performance.now()
      const proc = Bun.spawn(['bun', join(root, '.claude', 'hooks', 'scout-brief.ts')], {
        cwd: root,
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'pipe',
        env: { ...process.env, SCOUT_HOME: tmp, SCOUT_MODE: 'on' },
      })
      proc.stdin.write(payload)
      await proc.stdin.end()
      const [out, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited])
      times.push(performance.now() - started)
      if (code !== 0) {
        problems.push(`запуск ${i}: код выхода ${code}`)
      }
      if (out.trim()) {
        try {
          JSON.parse(out)
        } catch {
          problems.push(`запуск ${i}: stdout не JSON`)
        }
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
  const sorted = [...times].sort((a, b) => a - b)
  return { runs, p50: percentile(sorted, 0.5), max: sorted.at(-1) ?? 0, ok: problems.length === 0, problems }
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
  const root = findRepoRoot()
  if (!root) {
    console.error('Не найден корень репозитория')
    process.exit(1)
  }
  const suites = (arg('--suite')?.split(',').map((s) => s.trim()).filter(Boolean) ?? DEFAULT_SUITES) as Suite[]
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
  const phrases = process.argv.includes('--no-phrases') ? null : loadPhraseStore(home) ?? null
  const deps = { store, phrases }
  const advisable = advisableTools(engine.cards)

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
  const s = result.summary
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

  if (suites.includes('docs') && cases.length) {
    const search = async (q: string) => (await run(q)).result
    const loadedPaths = new Set(engine.cards.filter((c) => c.loaded).map((c) => c.path))
    const redundant = (q: string, p: string) => mentionedIn(q, p) || loadedPaths.has(p)
    const groups: Array<[string, EvalCase[]]> = [
      ['все', cases],
      ['dev', cases.filter((c) => splitOf(c.sessionId) === 'dev')],
      ['test', cases.filter((c) => splitOf(c.sessionId) === 'test')],
      ['короткие', cases.filter((c) => c.query.length < 120)],
    ]
    const out: DocsGroup[] = []
    console.log('\n== docs ==')
    for (const [group, list] of groups) {
      const { metrics } = await evaluate(search, list, advisable, { redundant })
      out.push({ group, ...metrics })
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
    const briefs = cases.map((c) => formatBrief(cache.get(c.query)!.result))
    const avgChars = briefs.reduce((n, b) => n + b.length, 0) / briefs.length
    const emptyShare = briefs.filter((b) => !b).length / briefs.length
    console.log(`справка: в среднем ${Math.round(avgChars)} симв., пустых ${pct(emptyShare)}`)
    result.docs = { groups: out, avgChars, emptyShare }
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
    s['R@8 все'] = g('все').recall8 * 100
    s['Hit@8 все'] = g('все').hit8 * 100
    s['пустых справок'] = emptyShare * 100
    s['симв.'] = avgChars
  }

  if (suites.includes('judge') && cases.length) {
    console.log('\n== judge ==')
    const labelsFile = join(dataDir, 'judge-labels.jsonl')
    const labels = loadLabels(labelsFile)
    const ref = loadLabels(join(dataDir, 'judge-ref.jsonl'))
    const judged = cases.filter((c) => c.goldDocs.length)
    let newLabels = 0
    let serverAnswered: boolean | null = null
    for (const c of judged) {
      const items = judgedItems((await run(c.query)).result)
      const missing = items.filter((it) => !labels.has(labelKey(c.sessionId, it.path)))
      if (!missing.length || serverAnswered === false) {
        continue
      }
      const got = await judgeItems(c.query, missing)
      serverAnswered = got !== undefined
      if (!got) {
        continue
      }
      missing.forEach((it, i) => {
        const l: JudgeLabel = { sessionId: c.sessionId, path: it.path, label: got[i], judge: JUDGE_MODEL }
        labels.set(labelKey(c.sessionId, it.path), l)
        appendFileSync(labelsFile, `${JSON.stringify(l)}\n`)
        newLabels++
      })
    }
    const shown = (list: EvalCase[]) =>
      list.map((c) => ({ sessionId: c.sessionId, paths: judgedItems(cache.get(c.query)!.result).map((it) => it.path) }))
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
      `новых меток от 9B: ${newLabels}${serverAnswered === false ? '; судья не ответил — считаю по кешу' : ''}`,
    )
    result.judge = { groups: out, newLabels, serverAnswered }
    const jg = (name: string) => out.find((x) => x.group === name)!
    s['суд. по делу@3 dev'] = jg('dev').relevant3 * 100
    s['суд. по делу@3 test'] = jg('test').relevant3 * 100
    s['суд. нужен@3'] = jg('все').needed3 * 100
    s['суд. по делу@1'] = jg('все').relevant1 * 100
    s['суд. по делу@5'] = jg('все').relevant5 * 100
    s['суд. покрытие'] = jg('все').coverage * 100
    const agreement = jg('все').agreement
    s['суд. согласие'] = agreement === null ? null : agreement * 100
  }

  if (suites.includes('forms')) {
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
    result.forms = { sets, negatives: neg }
    const dev = sets.find((x) => x.name === 'dev')
    const hold = sets.find((x) => x.name === 'holdout')
    s['поля dev'] = dev ? dev.fieldRecall * 100 : null
    s['поля holdout'] = hold ? hold.fieldRecall * 100 : null
    s['полка целиком dev'] = dev?.complete ?? null
    s['полка целиком holdout'] = hold?.complete ?? null
    const patternTotal = sets.reduce((n, x) => n + x.patternTotal, 0)
    s['паттерн'] = patternTotal ? (sets.reduce((n, x) => n + x.patternOk, 0) / patternTotal) * 100 : null
    s['ложная полка'] = neg.fieldsShare * 100
    s['ложный паттерн'] = neg.patternShare * 100
  }

  if (suites.includes('latency') && cases.length) {
    const times = [...new Set(cases.map((c) => c.query))].map((q) => cache.get(q)!.ms).sort((a, b) => a - b)
    const lat = { n: times.length, p50: percentile(times, 0.5), p95: percentile(times, 0.95), max: times.at(-1) ?? 0 }
    result.latency = lat
    s['p50 мс'] = lat.p50
    s['p95 мс'] = lat.p95
    s['max мс'] = lat.max
    console.log(
      `\n== latency ==\nscoutQuery, ${lat.n} запросов: p50 ${Math.round(lat.p50)} мс, p95 ${
        Math.round(lat.p95)
      } мс, max ${Math.round(lat.max)} мс`,
    )
  }

  if (suites.includes('robust')) {
    console.log('\n== robust ==')
    const failed: string[] = []
    for (const c of ROBUST_CHECKS) {
      let ok = false
      try {
        ok = c.check(await scoutQuery(engine, home, c.query, deps, root))
      } catch {
        ok = false
      }
      console.log(`${ok ? '✓' : '✗'} ${c.name}`)
      if (!ok) {
        failed.push(c.name)
      }
    }
    result.robust = { passed: ROBUST_CHECKS.length - failed.length, total: ROBUST_CHECKS.length, failed }
    s['устойчивость'] = result.robust.passed
    console.log(
      `прошли ${result.robust.passed}/${result.robust.total}${failed.length ? `; провал: ${failed.join(', ')}` : ''}`,
    )
  }

  if (suites.includes('hook')) {
    const runs = Number(arg('--hook-runs') ?? 5)
    console.log('\n== hook ==')
    const hook = await runHook(root, home, runs)
    result.hook = hook
    s['хук p50 мс'] = hook.p50
    s['хук max мс'] = hook.max
    console.log(
      `${hook.runs} запусков процесса: p50 ${Math.round(hook.p50)} мс, max ${Math.round(hook.max)} мс, ${
        hook.ok ? 'код 0 и stdout валиден' : `проблемы: ${hook.problems.join('; ')}`
      }`,
    )
  }
  for (const { key } of SUMMARY) {
    s[key] ??= null
  }

  const benchDir = join(home, 'bench')
  const runsDir = join(benchDir, 'runs')
  mkdirSync(runsDir, { recursive: true })
  const compare = arg('--compare')
  // Самый свежий прогон берём до записи текущего
  const prevPath = compare === 'last'
    ? readdirSync(runsDir).filter((f) => f.endsWith('.json')).sort().map((f) => join(runsDir, f)).at(-1)
    : compare
  const file = join(runsDir, `${stamp(now)}-${label}.json`)
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
