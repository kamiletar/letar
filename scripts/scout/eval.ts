#!/usr/bin/env bun
/**
 * Замер качества скаута на реальных сессиях.
 *
 * Случай = задача сессии → доки, которые агент прочитал до первой правки (эталон),
 * и проектные скилы/субагенты, которые он позвал. Метрики:
 * - Recall@5 / Recall@8 — доля эталонных доков в первых 5 / в справке целиком (5 доков + 3 ловушки);
 * - Hit@8 — в справке есть хоть один эталонный док;
 * - MRR — обратный ранг первого эталонного дока;
 * - top-1 инструмента — среди случаев, где агент звал проектный инструмент.
 *
 * ⚠️ Эталон смещён: агент читал то, что нашёл по карте в CLAUDE.md, а не всё, что было нужно.
 * Метрика меряет «догоняет ли скаут агента», а не абсолютную полноту.
 *
 * Бэкенды (`--backend`, по умолчанию все доступные): `bm25`; `dense` — только эмбеддинги;
 * `hybrid` — BM25 + эмбеддинги через RRF; `rerank` — гибрид + реранкер. Без llama-server
 * меряется только BM25. Отдельно печатается корзина коротких задач (< `--short` символов):
 * на них BM25 слабее всего.
 *
 * Запуск: bun scripts/scout/eval.ts [--backend all|bm25|dense|hybrid|rerank] [--short 120]
 *   [--sessions <jsonl>] [--min-task 15] [--show 5] [--out <cases.jsonl>]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  Bm25,
  buildIndex,
  collectCards,
  type DenseIndex,
  embedTexts,
  formatQuery,
  fusedHits,
  hybridHits,
  type IndexedCard,
  layoutHits,
  scout,
  type ScoutResult,
} from '../../libs/scout/src/index'
import { arg } from './cli'
import { findRepoRoot } from './index-store'
import type { SessionRecord } from './mine-transcripts'
import { scoutDataDir } from './paths'
import { EMBED_URL, loadDense, RERANK_URL } from './vectors'

export interface EvalCase {
  sessionId: string
  query: string
  goldDocs: string[]
  goldTools: string[]
}

/** Встроенные агенты харнесса — не проектные инструменты, скаут их не советует */
const BUILTIN_AGENTS = new Set([
  'general-purpose',
  'Explore',
  'Plan',
  'claude',
  'statusline-setup',
  'claude-code-guide',
])

export function buildCases(
  sessions: SessionRecord[],
  knownPaths: Set<string>,
  knownTools: Set<string>,
  minTask = 15,
): EvalCase[] {
  const cases: EvalCase[] = []
  for (const s of sessions) {
    const query = [s.command ? `/${s.command}` : '', s.task].join(' ').trim()
    if (s.task.length < minTask) {
      continue
    }
    const goldDocs = [...new Set(s.docsRead.filter((d) => d.beforeEdit && knownPaths.has(d.path)).map((d) => d.path))]
    const goldTools = [...new Set([...s.skills, ...s.agents])].filter((t) =>
      !BUILTIN_AGENTS.has(t) && knownTools.has(t)
    )
    if (!goldDocs.length && !goldTools.length) {
      continue
    }
    cases.push({ sessionId: s.sessionId, query, goldDocs, goldTools })
  }
  return cases
}

export interface Metrics {
  cases: number
  recall5: number
  recall8: number
  hit8: number
  mrr: number
  toolCases: number
  toolTop1: number
  toolShown: number
  /** Среди случаев с советуемым эталоном: доля угаданных среди показанных инструментов */
  toolPrecision: number
}

/** Доки справки в порядке очков: доки и ловушки вперемешку, как их ранжировал поиск */
function rankedPaths(result: ScoutResult): string[] {
  return [...result.docs, ...result.traps].sort((a, b) => b.score - a.score).map((d) => d.path)
}

/** Поиск под замером: запрос → разложенная справка */
export type Searcher = (query: string) => ScoutResult | Promise<ScoutResult>

/** Инструменты, которые скаут вообще может советовать: скилы, команды и агенты без `scope` (не команды приложений и ролей) */
export function advisableTools(cards: IndexedCard[]): Set<string> {
  return new Set(
    cards.filter((c) => (c.kind === 'skill' || c.kind === 'command' || c.kind === 'agent') && !c.scope).map((c) =>
      c.title
    ),
  )
}

/**
 * С `advisable` эталон инструментов сужается до советуемых: `end-session` и команды приложений
 * скаут не советует по замыслу, и без фильтра они занижают top-1.
 */
export async function evaluate(
  search: Searcher,
  cases: EvalCase[],
  advisable?: Set<string>,
): Promise<{ metrics: Metrics; perCase: Array<EvalCase & { got: string[]; tool?: string }> }> {
  let recall5 = 0
  let recall8 = 0
  let hit8 = 0
  let mrr = 0
  let docCases = 0
  let toolCases = 0
  let toolTop1 = 0
  let toolShown = 0
  let precisionShown = 0
  let precisionHit = 0
  const perCase: Array<EvalCase & { got: string[]; tool?: string }> = []
  for (const c of cases) {
    const result = await search(c.query)
    const got = rankedPaths(result)
    const tool = result.tool?.name
    if (tool) {
      toolShown++
    }
    perCase.push({ ...c, got, tool })
    if (c.goldDocs.length) {
      docCases++
      const gold = new Set(c.goldDocs)
      const inTop = (k: number) => got.slice(0, k).filter((p) => gold.has(p)).length
      recall5 += inTop(5) / gold.size
      recall8 += inTop(8) / gold.size
      hit8 += inTop(8) > 0 ? 1 : 0
      const rank = got.findIndex((p) => gold.has(p))
      mrr += rank === -1 ? 0 : 1 / (rank + 1)
    }
    const goldTools = advisable ? c.goldTools.filter((t) => advisable.has(t)) : c.goldTools
    if (goldTools.length) {
      toolCases++
      const hit = Boolean(tool && goldTools.includes(tool))
      toolTop1 += hit ? 1 : 0
      if (tool) {
        precisionShown++
        precisionHit += hit ? 1 : 0
      }
    }
  }
  const avg = (x: number) => (docCases ? x / docCases : 0)
  return {
    metrics: {
      cases: docCases,
      recall5: avg(recall5),
      recall8: avg(recall8),
      hit8: avg(hit8),
      mrr: avg(mrr),
      toolCases,
      toolTop1: toolCases ? toolTop1 / toolCases : 0,
      toolShown: cases.length ? toolShown / cases.length : 0,
      toolPrecision: precisionShown ? precisionHit / precisionShown : 0,
    },
    perCase,
  }
}

async function main() {
  const sessionsFile = arg('--sessions') ?? join(scoutDataDir(), 'sessions.jsonl')
  if (!existsSync(sessionsFile)) {
    console.error(`Нет ${sessionsFile} — сначала bun scripts/scout/mine-transcripts.ts`)
    process.exit(1)
  }
  const root = findRepoRoot()
  if (!root) {
    console.error('Не найден корень репозитория')
    process.exit(1)
  }
  const index = buildIndex(collectCards(root))
  const engine = new Bm25(index)
  const knownPaths = new Set(index.cards.filter((c) => c.kind === 'doc' || c.kind === 'rule').map((c) => c.path))
  const knownTools = new Set(
    index.cards.filter((c) => ['skill', 'command', 'agent'].includes(c.kind)).map((c) => c.title),
  )
  const sessions = readFileSync(sessionsFile, 'utf8').split('\n').filter(Boolean).map((l) =>
    JSON.parse(l) as SessionRecord
  )
  const cases = buildCases(sessions, knownPaths, knownTools, Number(arg('--min-task') ?? 15))
  const shortLimit = Number(arg('--short') ?? 120)
  const shortCases = cases.filter((c) => c.query.length < shortLimit)
  console.log(
    `Сессий: ${sessions.length}, случаев: ${cases.length} (коротких < ${shortLimit} симв.: ${shortCases.length})`,
  )
  const backends = backendsFor(engine, arg('--backend') ?? 'all')
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`
  const row = (name: string, m: Metrics) =>
    `${name.padEnd(16)} R@5 ${pct(m.recall5).padStart(6)}  R@8 ${pct(m.recall8).padStart(6)}  Hit@8 ${
      pct(m.hit8).padStart(6)
    }  MRR ${m.mrr.toFixed(3)}  инстр. top-1 ${pct(m.toolTop1)} (${m.toolCases})`
  let perCase: Array<EvalCase & { got: string[]; tool?: string }> = []
  for (const [name, raw] of backends) {
    // Короткие случаи — подмножество общих: второй прогон берёт готовый ответ из кеша
    const cache = new Map<string, ScoutResult>()
    const search: Searcher = async (q) => cache.get(q) ?? cache.set(q, await raw(q)).get(q)!
    const started = performance.now()
    const all = await evaluate(search, cases)
    const ms = (performance.now() - started) / cases.length
    const short = await evaluate(search, shortCases)
    console.log(`${row(name, all.metrics)}  ${ms.toFixed(0)} мс/запрос`)
    console.log(row(`  короткие`, short.metrics))
    perCase = all.perCase
  }
  const out = arg('--out')
  if (out) {
    writeFileSync(out, perCase.map((c) => JSON.stringify(c)).join('\n') + '\n')
    console.log(`Разбор по случаям → ${out}`)
  }
  const show = Number(arg('--show') ?? 0)
  for (
    const c of perCase.filter((c) => c.goldDocs.length && !c.got.some((p) => c.goldDocs.includes(p))).slice(0, show)
  ) {
    console.log(
      `\n✗ ${c.query.slice(0, 160).replace(/\s+/g, ' ')}\n  эталон: ${c.goldDocs.join(', ')}\n  скаут:  ${
        c.got.slice(0, 5).join(', ')
      }`,
    )
  }
}

/** Доступные бэкенды: без векторов или серверов остаётся только BM25 */
export function backendsFor(engine: Bm25, wanted: string): Array<[string, Searcher]> {
  const dense: DenseIndex | undefined = loadDense()
  const embed = { url: EMBED_URL, timeoutMs: 10_000 }
  const rerank = { url: RERANK_URL, timeoutMs: 30_000 }
  const all: Array<[string, Searcher | undefined]> = [
    ['bm25', (q) => scout(engine, q)],
    [
      'dense',
      dense
      && (async (q) => {
        const [vector] = await embedTexts([formatQuery(q)], embed)
        const ranked = new Map(dense.search(vector, 500).map((d) => [d.id, d.score]))
        return layoutHits(engine.cards, fusedHits(engine.cards, ranked, ranked.size), q)
      }),
    ],
    [
      'hybrid',
      dense && (async (q) => {
        const { hits, forms } = await hybridHits(engine, q, { dense, embed })
        return layoutHits(engine.cards, hits, q, { forms })
      }),
    ],
    [
      'rerank',
      dense
      && (async (q) => {
        const { hits, forms } = await hybridHits(engine, q, { dense, embed, rerank })
        return layoutHits(engine.cards, hits, q, { forms })
      }),
    ],
  ]
  if (!dense) {
    console.log('Векторов нет (bun scripts/scout/vectors.ts) — меряю только BM25')
  }
  return all.filter((b): b is [string, Searcher] => Boolean(b[1]) && (wanted === 'all' || wanted === b[0]))
}

if (import.meta.main) {
  await main()
}
