import {
  embedTexts,
  formatQuery,
  fuseWithDense,
  type Hit,
  type IndexedCard,
  layoutHits,
  mentionedIn,
  phraseRanking,
  type ScoutResult,
} from '../../../libs/scout/src/index'
import { splitOf } from '../cli'
import {
  actionText,
  CLM_NOTHING,
  CLM_QUESTION_DOCS,
  CLM_QUESTION_TOOLS,
  ClmCache,
  clmEmbed,
  dot,
  fuseWithClm,
  loadClmHead,
  projectAction,
  projectState,
  rankToolCandidates,
  situationText,
} from '../clm'
import { advisableTools, type EvalCase, evaluate, evaluateTools, type ToolMetrics, toolRanking } from '../eval'
import { loadPhraseStore } from '../phrases'
import { loadToolGold } from '../tool-gold'
import { EMBED_URL, loadVectorStore } from '../vectors'
import type { Suite } from './types'
import { EMPTY, loadedPathsOf, pct, percentile } from './util'

export interface ClmToolRow extends ToolMetrics {
  variant: string
  group: string
}

export interface ClmDocRow {
  variant: string
  group: string
  n: number
  recall5: number
  novelRecall5: number
  mrr: number
}

export interface ClmResult {
  tools: ClmToolRow[]
  docs: ClmDocRow[]
  /** Задержка одного вызова кодировщика (ситуация, без кеша), мс */
  latency: { p50: number; p95: number; n: number }
  /** Какой из трёх вариантов доков взят для `raw` */
  bestDocs: string
}

type Mode = 'head' | 'raw'

const DOC_KINDS = new Set(['doc', 'section', 'rule'])
const LATENCY_SAMPLES = 100

/**
 * CLM-8B против текущего поиска, офлайн: инструменты (эталон судьи) и доки (`нов. R@5`).
 * Хук, поиск и либа не меняются: списки CLM сливаются с текущими здесь же, в сьюте.
 */
export const clmSuite: Suite = async ({ engine, cases, run, deps, home, dataDir }) => {
  const goldRows = loadToolGold(dataDir)
  if (!cases.length || !goldRows.length) {
    console.log('\n== clm == нет eval-cases.jsonl или tool-gold.jsonl — пропущен')
    return EMPTY
  }
  try {
    await clmEmbed(['ping'])
  } catch (e) {
    console.log(`\n== clm == пропущен: ${e}`)
    return EMPTY
  }
  console.log('\n== clm ==')
  const heads = loadClmHead()
  const cache = new ClmCache(home)
  const log = (m: string) => console.log(`  ${m}`)

  // Карточки: доки/секции/правила и по одной карточке на кандидата-инструмент
  const docCards = engine.cards.filter((c) => DOC_KINDS.has(c.kind))
  const advisable = advisableTools(engine.cards)
  const toolCards: IndexedCard[] = []
  const seenTool = new Set<string>()
  for (const c of engine.cards) {
    if (
      advisable.has(c.title) && !c.scope && ['skill', 'command', 'agent'].includes(c.kind) && !seenTool.has(c.title)
    ) {
      seenTool.add(c.title)
      toolCards.push(c)
    }
  }
  const docText = docCards.map(actionText)
  const toolText = toolCards.map(actionText)
  const docSit = cases.map((c) => situationText(c.query, CLM_QUESTION_DOCS))
  const toolSit = cases.map((c) => situationText(c.query, CLM_QUESTION_TOOLS))
  const all = [...docText, ...toolText, CLM_NOTHING, ...docSit, ...toolSit]
  const started = performance.now()
  const vectorsOf = await cache.get(all, undefined, log)
  log(`векторы кодировщика: ${all.length} текстов, ${Math.round((performance.now() - started) / 1000)} с`)
  const vec = new Map(all.map((t, i) => [t, vectorsOf[i]]))
  const V = (t: string) => vec.get(t)!

  // Задержка: одиночный вызов на ситуацию, без кеша (уникальная приписка не даёт попасть в кеш сервера)
  const times: number[] = []
  for (let i = 0; i < Math.min(LATENCY_SAMPLES, cases.length); i++) {
    const t0 = performance.now()
    await clmEmbed([`${docSit[i]} #${i}`])
    times.push(performance.now() - t0)
  }
  times.sort((a, b) => a - b)
  const latency = { p50: percentile(times, 0.5), p95: percentile(times, 0.95), n: times.length }
  console.log(
    `  задержка кодировщика на запрос: p50 ${latency.p50.toFixed(0)} мс, p95 ${
      latency.p95.toFixed(0)
    } мс (n=${latency.n})`,
  )

  // Проекции: голова один раз на текст
  const projected = new Map<string, { state?: Float32Array; action?: Float32Array }>()
  const proj = (t: string, kind: 'state' | 'action') => {
    const p = projected.get(t) ?? {}
    projected.set(t, p)
    return (p[kind] ??= (kind === 'state' ? projectState : projectAction)(heads, V(t)))
  }
  const score = (sit: string, act: string, mode: Mode) =>
    mode === 'head' ? dot(proj(sit, 'state'), proj(act, 'action')) : dot(V(sit), V(act))

  const gold = new Map(goldRows.map((r) => [r.sessionId, r.tools]))
  const groups: Array<[string, EvalCase[]]> = [
    ['dev', cases.filter((c) => splitOf(c.sessionId) === 'dev')],
    ['test', cases.filter((c) => splitOf(c.sessionId) === 'test')],
  ]
  const index = new Map(cases.map((c, i) => [c.query, i]))

  // --- Инструменты ---
  const toolRows: ClmToolRow[] = []
  const toolVariants: Array<[string, (q: string) => Promise<{ list: string[]; shown: boolean }>]> = [
    [
      'база (BM25)',
      async (q) => ({ list: toolRanking(engine.search(q, 500)), shown: Boolean((await run(q)).result.tool) }),
    ],
    ...(['head', 'raw'] as Mode[]).map((mode): [string, (q: string) => Promise<{ list: string[]; shown: boolean }>] => [
      mode === 'head' ? 'clm' : 'clm-raw',
      async (q) => {
        const sit = toolSit[index.get(q)!]
        return rankToolCandidates(
          toolCards.map((c) => c.title),
          toolText.map((t) => score(sit, t, mode)),
          score(sit, CLM_NOTHING, mode),
        )
      },
    ]),
  ]
  for (const [variant, fn] of toolVariants) {
    for (const [group, list] of [['все', cases] as [string, EvalCase[]], ...groups]) {
      const m = await evaluateTools(async (q) => (await fn(q)).list, list, gold, {
        shown: async (q) => (await fn(q)).shown,
        advisable,
      })
      toolRows.push({ variant, group, ...m })
    }
  }
  console.log('  инструменты (кандидатов ' + toolCards.length + '):')
  for (const r of toolRows) {
    console.log(
      `    ${r.variant.padEnd(12)} ${r.group.padEnd(5)} с эталоном ${String(r.goldCases).padStart(3)}  hit@1 ${
        pct(r.hit1).padStart(6)
      }  hit@3 ${pct(r.hit3).padStart(6)}  MRR ${r.mrr.toFixed(3)}  ложный ${pct(r.falseAdvice).padStart(6)}`,
    )
  }

  // --- Доки ---
  const loadedPaths = loadedPathsOf(engine)
  const redundant = (q: string, p: string) => mentionedIn(q, p) || loadedPaths.has(p)
  const docRows: ClmDocRow[] = []
  const measure = async (variant: string, results: Map<string, ScoutResult>) => {
    for (const [group, list] of [['все', cases] as [string, EvalCase[]], ...groups]) {
      const { metrics } = await evaluate((q) => results.get(q)!, list, advisable, { redundant })
      docRows.push({
        variant,
        group,
        n: metrics.cases,
        recall5: metrics.recall5,
        novelRecall5: metrics.novelRecall5,
        mrr: metrics.mrr,
      })
    }
  }
  const clmHits = (q: string, mode: Mode): Hit[] => {
    const sit = docSit[index.get(q)!]
    return docCards
      .map((card, i) => ({ card, score: 1 + score(sit, docText[i], mode) }))
      .sort((a, b) => b.score - a.score)
  }
  const layout = (q: string, hits: Hit[]) => layoutHits(engine.cards, hits, q)

  const baseResults = new Map<string, ScoutResult>()
  for (const c of cases) {
    baseResults.set(c.query, (await run(c.query)).result)
  }
  await measure('база (хук)', baseResults)
  const clmOnly = new Map(cases.map((c) => [c.query, layout(c.query, clmHits(c.query, 'head'))] as const))
  await measure('clm-only', clmOnly)

  // Слияние и переранжирование нужны текущие списки: векторы запроса с эмбеддера и векторы карточек хука
  const store = deps.store === undefined ? loadVectorStore(home) : deps.store ?? undefined
  const phrases = deps.phrases === undefined ? loadPhraseStore(home) : deps.phrases ?? undefined
  let bestDocs = ''
  const queryVec = new Map<string, Float32Array>()
  let embedderOk = Boolean(store)
  if (store) {
    try {
      for (const c of cases) {
        queryVec.set(c.query, (await embedTexts([formatQuery(c.query)], { url: EMBED_URL, timeoutMs: 30_000 }))[0])
      }
    } catch {
      embedderOk = false
    }
  }
  if (store && embedderOk) {
    const extraOf = (q: string) =>
      phrases ? [phraseRanking(engine.cards, phrases.index, store.dense, queryVec.get(q)!)] : []
    const fusedOf = (q: string) =>
      fuseWithDense(engine.cards, engine.search(q, 500), store.dense, queryVec.get(q)!, { extra: extraOf(q) })
    const rrfOf = (q: string, mode: Mode) =>
      fuseWithClm(
        engine.cards,
        engine.search(q, 500),
        store.dense,
        queryVec.get(q)!,
        extraOf(q),
        clmHits(q, mode).slice(0, 100).map((h) => h.card.id),
      )
    const rerankOf = (q: string, mode: Mode) => {
      const fused = fusedOf(q)
      const head = fused.filter((h) => DOC_KINDS.has(h.card.kind)).slice(0, 30)
      const sit = docSit[index.get(q)!]
      const reranked = new Map(head.map((h) => [h.card.id, 1 + score(sit, actionText(h.card), mode)]))
      return fused
        .map((h) => ({ card: h.card, score: reranked.get(h.card.id) ?? h.score }))
        .sort((a, b) => b.score - a.score)
    }
    const variants: Array<[string, (q: string, mode: Mode) => Hit[]]> = [
      ['clm-rrf', rrfOf],
      ['clm-rerank', rerankOf],
    ]
    await measure('гибрид (повтор)', new Map(cases.map((c) => [c.query, layout(c.query, fusedOf(c.query))] as const)))
    for (const [name, fn] of variants) {
      await measure(name, new Map(cases.map((c) => [c.query, layout(c.query, fn(c.query, 'head'))] as const)))
    }
    const candidates = ['clm-only', 'clm-rrf', 'clm-rerank']
    const devNovel = (v: string) => docRows.find((r) => r.variant === v && r.group === 'dev')!.novelRecall5
    bestDocs = candidates.reduce((a, b) => (devNovel(b) > devNovel(a) ? b : a))
    const bestFn = bestDocs === 'clm-only'
      ? (q: string, mode: Mode) => clmHits(q, mode)
      : variants.find(([n]) => n === bestDocs)![1]
    await measure(
      `${bestDocs}-raw`,
      new Map(cases.map((c) => [c.query, layout(c.query, bestFn(c.query, 'raw'))] as const)),
    )
  } else {
    console.log('  эмбеддер (8090) или векторы карточек недоступны — clm-rrf, clm-rerank и raw-версия доков пропущены')
    bestDocs = 'clm-only'
    await measure(
      'clm-only-raw',
      new Map(cases.map((c) => [c.query, layout(c.query, clmHits(c.query, 'raw'))] as const)),
    )
  }
  cache.flush()

  console.log('  доки:')
  for (const r of docRows) {
    console.log(
      `    ${r.variant.padEnd(16)} ${r.group.padEnd(5)} n=${String(r.n).padStart(3)}  R@5 ${
        pct(r.recall5).padStart(6)
      }  нов. R@5 ${pct(r.novelRecall5).padStart(6)}  MRR ${r.mrr.toFixed(3)}`,
    )
  }

  const tool = (v: string, g: string) => toolRows.find((r) => r.variant === v && r.group === g)!
  const doc = (v: string) => docRows.find((r) => r.variant === v && r.group === 'все')
  const s: Record<string, number | null> = {
    'clm инстр. hit@1': tool('clm', 'все').hit1 * 100,
    'clm инстр. hit@3': tool('clm', 'все').hit3 * 100,
    'clm инстр. ложный': tool('clm', 'все').falseAdvice * 100,
    'clm-raw инстр. hit@1': tool('clm-raw', 'все').hit1 * 100,
    'clm-only нов. R@5': (doc('clm-only')?.novelRecall5 ?? 0) * 100,
    'clm-rrf нов. R@5': doc('clm-rrf') ? doc('clm-rrf')!.novelRecall5 * 100 : null,
    'clm-rerank нов. R@5': doc('clm-rerank') ? doc('clm-rerank')!.novelRecall5 * 100 : null,
    'clm p95 мс': latency.p95,
  }
  const result: ClmResult = { tools: toolRows, docs: docRows, latency, bestDocs }
  return { summary: s, result }
}
