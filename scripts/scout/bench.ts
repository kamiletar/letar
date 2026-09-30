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
 * - `tools` — выбор инструмента по эталону судьи (`tool-gold.jsonl`): hit@1/hit@3/MRR, ложный совет; только явно.
 *
 * - `clm` — CLM-8B офлайн (нужен llama-server Qwen3-8B на 8093 и `tool-gold.jsonl`): инструменты и доки; только явно.
 *
 * Запуск: bun scripts/scout/bench.ts [--label <имя>] [--suite docs,forms,latency,robust,hook]
 *   [--hook-runs 5] [--compare <путь к json | last>]
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Bm25 } from '../../libs/scout/src/index'
import {
  appendJournal,
  type BenchRun,
  labelSlug,
  printCompare,
  resolveRunRef,
  stamp,
  SUMMARY,
  unknownMetricKeys,
} from './bench-report'
import { arg, readJsonl } from './cli'
import type { EvalCase } from './eval'
import { freshIndex, scoutQuery, type ScoutQueryResult } from './hook-core'
import { findRepoRoot } from './index-store'
import { scoutDataDir, scoutHome } from './paths'
import { loadPhraseStore } from './phrases'
import { appSuite } from './suites/app'
import { clmSuite } from './suites/clm'
import { docsSuite } from './suites/docs'
import { editSuite } from './suites/edit'
import { formsSuite } from './suites/forms'
import { hookSuite } from './suites/hook'
import { judgeSuite } from './suites/judge'
import { latencySuite } from './suites/latency'
import { robustSuite } from './suites/robust'
import { toolsSuite } from './suites/tools'
import type { Suite } from './suites/types'
import { canonicalTools } from './tool-names'
import { loadVectorStore } from './vectors'

export type SuiteName = 'docs' | 'forms' | 'latency' | 'robust' | 'hook' | 'judge' | 'app' | 'edit' | 'tools' | 'clm'

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
  tools: toolsSuite,
  clm: clmSuite,
}
// Порядок в справке и сообщении об ошибке; порядок запуска — по реестру `SUITES`
const ALL_SUITES: SuiteName[] = ['docs', 'forms', 'latency', 'robust', 'hook', 'judge', 'app', 'edit', 'tools', 'clm']
const DEFAULT_SUITES: SuiteName[] = ['docs', 'forms', 'latency', 'robust']

function git(root: string, args: string[]): string {
  return Bun.spawnSync(['git', ...args], { cwd: root }).stdout.toString().trim()
}

const USAGE = `Запуск: bun scripts/scout/bench.ts [--label <имя>] [--suite ${ALL_SUITES.join(',')}]
  [--hook-runs 5] [--compare <путь к json | last>] [--no-phrases] [--tool-variants] [--assoc] [--prf] [--help]`

/** Флаги со значением и без; неизвестный флаг — ошибка (код 2), `--help` — справка */
function checkArgs(argv: string[]): void {
  const withValue = new Set(['--label', '--suite', '--hook-runs', '--compare'])
  const bare = new Set(['--no-phrases', '--tool-variants', '--assoc', '--prf', '--help'])
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
  // Э3: расширение запроса читает scoutQuery из env; по умолчанию выключено
  if (process.argv.includes('--assoc')) {
    process.env.SCOUT_ASSOC = '1'
  }
  if (process.argv.includes('--prf')) {
    process.env.SCOUT_PRF = '1'
  }
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
  const cases = existsSync(casesFile)
    ? readJsonl<EvalCase>(casesFile).map((c) => ({ ...c, goldTools: canonicalTools(c.goldTools ?? []) }))
    : []
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
    flags: { noPhrases, toolVariants: process.argv.includes('--tool-variants') },
  }
  // Порядок запуска — как в реестре, а не как в `--suite`
  for (const name of (Object.keys(SUITES) as SuiteName[]).filter((n) => suites.includes(n))) {
    const out = await SUITES[name](ctx)
    for (const key of unknownMetricKeys(out.summary)) {
      console.log(`⚠️ метрика ${key} не описана в SUMMARY — в журнал не попадёт`)
    }
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
  const prevPath = compare ? resolveRunRef(runsDir, compare) : undefined
  // Метка бывает с `:` (например `a:b`): в имени файла на Windows это поток данных, а не часть имени
  const file = join(runsDir, `${stamp(now)}-${labelSlug(label)}.json`)
  writeFileSync(file, JSON.stringify(result, null, 2))
  appendJournal(benchDir, result)
  console.log(`\nПрогон → ${file}\nЖурнал → ${join(benchDir, 'journal.md')}`)
  if (compare) {
    if (prevPath && existsSync(prevPath)) {
      printCompare(result, prevPath)
    } else {
      console.log(
        `\nСравнивать не с чем: ${
          compare === 'last' ? 'в runs/ нет прежних прогонов' : `нет файла или прогона с меткой ${compare}`
        }`,
      )
    }
  }
}

if (import.meta.main) {
  await main()
}
