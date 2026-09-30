#!/usr/bin/env bun
/**
 * Хабы в выдаче скаута: какие доки занимают первую пятёрку чаще, чем заслуживают, и из какого списка
 * (BM25, эмбеддинги карточек, формулировки) они приходят. Считается на итоговой выдаче боевого
 * пути `scoutQuery` (доки и ловушки вместе, по очкам), на запросах набора `eval-cases.jsonl` —
 * только dev по `splitOf`.
 *
 * Запуск: bun scripts/scout/hubs.ts [--top 10] [--json]
 * В печать попадают только пути доков, тексты запросов — нет.
 */
import { join } from 'node:path'
import {
  Bm25,
  embedTexts,
  formatQuery,
  type IndexedCard,
  phraseRanking,
  type ScoutResult,
} from '../../libs/scout/src/index'
import { arg, readJsonl, splitOf } from './cli'
import type { EvalCase } from './eval'
import { freshIndex, scoutQuery } from './hook-core'
import { findRepoRoot } from './index-store'
import { scoutDataDir, scoutHome } from './paths'
import { loadPhraseStore } from './phrases'
import { EMBED_URL, loadVectorStore } from './vectors'

const TOP = 5

/** Доки первой пятёрки итоговой выдачи: доки и ловушки вместе, по очкам */
export function topPaths(result: ScoutResult, top = TOP): string[] {
  return [...result.docs, ...result.traps].sort((a, b) => b.score - a.score).slice(0, top).map((d) => d.path)
}

/** Сколько раз каждый док оказался в первой пятёрке (один раз на запрос) */
export function topFrequency(rankings: string[][]): Map<string, number> {
  const freq = new Map<string, number>()
  for (const paths of rankings) {
    for (const p of new Set(paths)) {
      freq.set(p, (freq.get(p) ?? 0) + 1)
    }
  }
  return freq
}

/** Метрики хабности: доля мест пятёрки, занятых 10 самыми частыми доками, и частота самого частого дока */
export function hubMetrics(rankings: string[][], top = 10): { top10Share: number; maxFreq: number } {
  const freq = [...topFrequency(rankings).values()].sort((a, b) => b - a)
  const slots = rankings.reduce((n, r) => n + new Set(r).size, 0)
  return {
    top10Share: slots ? freq.slice(0, top).reduce((n, x) => n + x, 0) / slots : 0,
    maxFreq: rankings.length ? (freq[0] ?? 0) / rankings.length : 0,
  }
}

function ranks(values: number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0])
  const out = new Array<number>(values.length)
  for (let i = 0; i < order.length;) {
    let j = i
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) {
      j++
    }
    // Средний ранг для равных значений
    for (let m = i; m <= j; m++) {
      out[order[m][1]] = (i + j) / 2 + 1
    }
    i = j + 1
  }
  return out
}

/** Корреляция Спирмена: Пирсон по рангам; при нулевом разбросе — 0 */
export function spearman(x: number[], y: number[]): number {
  const rx = ranks(x)
  const ry = ranks(y)
  const n = x.length
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / (n || 1)
  const mx = mean(rx)
  const my = mean(ry)
  let cov = 0
  let vx = 0
  let vy = 0
  for (let i = 0; i < n; i++) {
    cov += (rx[i] - mx) * (ry[i] - my)
    vx += (rx[i] - mx) ** 2
    vy += (ry[i] - my) ** 2
  }
  return vx && vy ? cov / Math.sqrt(vx * vy) : 0
}

function median(values: number[]): number | null {
  if (!values.length) {
    return null
  }
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const DOC_KINDS = new Set(['doc', 'section', 'rule'])

interface SourceStat {
  /** Медиана места лучшей карточки дока по запросам, где док в топ-5 (1 — первое); `null` — нигде в списке */
  medianRank: number | null
  /** Среднее число карточек дока в первых 100 списка по тем же запросам */
  cardsIn100: number
}

interface HubRow {
  path: string
  top5: number
  share: number
  gold: number
  cards: number
  bm25: SourceStat
  dense: SourceStat
  /** У формулировок список по докам: место дока, карточка одна */
  phrases: { medianRank: number | null }
}

/** Место лучшей карточки каждого дока в списке карточек и число его карточек в первой сотне */
function docPlaces(ids: string[], byId: Map<string, IndexedCard>): Map<string, { best: number; in100: number }> {
  const places = new Map<string, { best: number; in100: number }>()
  ids.forEach((id, i) => {
    const card = byId.get(id)
    if (!card || !DOC_KINDS.has(card.kind)) {
      return
    }
    const p = places.get(card.path) ?? { best: i + 1, in100: 0 }
    if (i < 100) {
      p.in100++
    }
    places.set(card.path, p)
  })
  return places
}

async function main() {
  const root = findRepoRoot()
  if (!root) {
    console.error('Не найден корень репозитория')
    process.exit(1)
  }
  const home = scoutHome()
  const engine = new Bm25(freshIndex(root, home))
  const store = loadVectorStore(home)
  const phrases = loadPhraseStore(home)
  if (!store || !phrases) {
    console.error('Нет векторов или формулировок — сначала vectors.ts и phrases.ts')
    process.exit(1)
  }
  const cases = readJsonl<EvalCase>(join(scoutDataDir(), 'eval-cases.jsonl')).filter((c) =>
    splitOf(c.sessionId) === 'dev'
  )
  const byId = new Map(engine.cards.map((c) => [c.id, c]))
  const docKinds = engine.cards.filter((c) => DOC_KINDS.has(c.kind))
  const cardCount = new Map<string, number>()
  for (const c of docKinds) {
    cardCount.set(c.path, (cardCount.get(c.path) ?? 0) + 1)
  }

  const rankings: string[][] = []
  const goldSets: Array<Set<string>> = []
  const perDoc = new Map<
    string,
    { bm25: number[]; bm25n: number[]; dense: number[]; densen: number[]; phrases: number[] }
  >()
  for (const c of cases) {
    const { result } = await scoutQuery(engine, home, c.query, { store, phrases }, root)
    const top = topPaths(result)
    rankings.push(top)
    goldSets.push(new Set(c.goldDocs))
    const [vector] = await embedTexts([formatQuery(c.query)], { url: EMBED_URL, timeoutMs: 10_000 })
    const bm25 = docPlaces(engine.search(c.query, 500).map((h) => h.card.id), byId)
    const dense = docPlaces(store.dense.search(vector, store.dense.ids.length).map((d) => d.id), byId)
    const phraseList = phraseRanking(engine.cards, phrases.index, store.dense, vector, 10_000)
    for (const path of top) {
      const row = perDoc.get(path) ?? { bm25: [], bm25n: [], dense: [], densen: [], phrases: [] }
      const b = bm25.get(path)
      const d = dense.get(path)
      if (b) {
        row.bm25.push(b.best)
        row.bm25n.push(b.in100)
      }
      if (d) {
        row.dense.push(d.best)
        row.densen.push(d.in100)
      }
      const at = phraseList.findIndex((id) => id.slice(id.indexOf(':') + 1) === path)
      if (at !== -1) {
        row.phrases.push(at + 1)
      }
      perDoc.set(path, row)
    }
  }

  const freq = topFrequency(rankings)
  const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0)
  const rows: HubRow[] = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, Number(arg('--top') ?? 10)).map(
    ([path, top5]) => {
      const p = perDoc.get(path)!
      const gold = rankings.reduce((n, r, i) => n + (r.includes(path) && goldSets[i].has(path) ? 1 : 0), 0)
      return {
        path,
        top5,
        share: top5 / cases.length,
        gold,
        cards: cardCount.get(path) ?? 0,
        bm25: { medianRank: median(p.bm25), cardsIn100: mean(p.bm25n) },
        dense: { medianRank: median(p.dense), cardsIn100: mean(p.densen) },
        phrases: { medianRank: median(p.phrases) },
      }
    },
  )
  // Спирмен по всем докам корпуса: частота в топ-5 (0, если не попадал) против числа карточек
  const paths = [...cardCount.keys()]
  const rho = spearman(paths.map((p) => freq.get(p) ?? 0), paths.map((p) => cardCount.get(p) ?? 0))
  const metrics = hubMetrics(rankings)

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ cases: cases.length, spearman: rho, ...metrics, rows }, null, 2))
    return
  }
  console.log(`Хабы: dev ${cases.length} запросов`)
  console.log(
    `10 самых частых занимают ${(metrics.top10Share * 100).toFixed(1)}% мест пятёрки, максимум ${
      (metrics.maxFreq * 100).toFixed(1)
    }% запросов; Спирмен(частота, карточек) = ${rho.toFixed(2)} по ${paths.length} докам`,
  )
  const f = (x: number | null) => (x === null ? '—' : x % 1 ? x.toFixed(1) : String(x)).padStart(5)
  console.log(
    `\n${'док'.padEnd(58)} ${'топ5'.padStart(4)} ${'%'.padStart(5)} ${'эт.'.padStart(3)} ${
      'карт'.padStart(4)
    } | BM25 место/в100 | эмб. место/в100 | формул. место`,
  )
  for (const r of rows) {
    console.log(
      `${r.path.replace(/^\.claude\//, '').slice(0, 58).padEnd(58)} ${String(r.top5).padStart(4)} ${
        (r.share * 100).toFixed(1).padStart(5)
      } ${String(r.gold).padStart(3)} ${String(r.cards).padStart(4)} | ${f(r.bm25.medianRank)} ${
        f(r.bm25.cardsIn100)
      }   | ${f(r.dense.medianRank)} ${f(r.dense.cardsIn100)}   | ${f(r.phrases.medianRank)}`,
    )
  }
}

if (import.meta.main) {
  await main()
}
