import type { Bm25, Hit } from './bm25'
import { tokenize } from './text'

/** Словарь ассоциаций «слово запроса → термы доков»: строится по истории сессий, хранится вне репо */
export interface AssocDict {
  version: 1
  builtAt: string
  /** Сессий в обучающей части */
  sessions: number
  /** слово запроса (основа) → [терм дока, PMI], по убыванию */
  terms: Record<string, Array<[string, number]>>
}

export interface AssocPair {
  queryTerms: string[]
  docTerms: string[]
}

export interface AssocOptions {
  /** Минимум сессий со словом запроса */
  minQuery?: number
  /** Минимум совместных сессий «слово запроса — терм дока» */
  minJoint?: number
  /** Сколько термов хранить на слово запроса */
  topN?: number
  /** Нижняя граница PMI */
  minPmi?: number
}

/** Словарь по парам (термы задачи, термы прочитанных доков): PMI с порогами частоты */
export function buildAssoc(
  pairs: AssocPair[],
  options: AssocOptions = {},
  builtAt = new Date().toISOString(),
): AssocDict {
  const { minQuery = 5, minJoint = 3, topN = 5, minPmi = 1 } = options
  const n = pairs.length
  const qCount = new Map<string, number>()
  const dCount = new Map<string, number>()
  const joint = new Map<string, Map<string, number>>()
  for (const { queryTerms, docTerms } of pairs) {
    const qs = [...new Set(queryTerms)]
    const ds = [...new Set(docTerms)]
    for (const d of ds) {
      dCount.set(d, (dCount.get(d) ?? 0) + 1)
    }
    for (const q of qs) {
      qCount.set(q, (qCount.get(q) ?? 0) + 1)
      let row = joint.get(q)
      if (!row) {
        row = new Map()
        joint.set(q, row)
      }
      for (const d of ds) {
        row.set(d, (row.get(d) ?? 0) + 1)
      }
    }
  }
  const terms: AssocDict['terms'] = Object.create(null)
  for (const [q, row] of joint) {
    const cq = qCount.get(q)!
    if (cq < minQuery) {
      continue
    }
    const scored: Array<[string, number]> = []
    for (const [d, cj] of row) {
      if (cj < minJoint || d === q) {
        continue
      }
      const pmi = Math.log((cj * n) / (cq * dCount.get(d)!))
      if (pmi >= minPmi) {
        // Поправка на частоту: редкие совпадения с высоким PMI ненадёжнее
        scored.push([d, pmi * Math.log(1 + cj)])
      }
    }
    scored.sort((a, b) => b[1] - a[1])
    if (scored.length) {
      terms[q] = scored.slice(0, topN).map(([d, s]) => [d, Math.round(s * 1000) / 1000])
    }
  }
  return { version: 1, builtAt, sessions: n, terms }
}

/** Термы-расширения запроса из словаря: вес `w` × доля от лучшего очка слова, максимум по словам */
export function assocExpansion(query: string, dict: AssocDict, w: number): Map<string, number> {
  const own = new Set(tokenize(query))
  const out = new Map<string, number>()
  for (const q of own) {
    const row = Object.hasOwn(dict.terms, q) ? dict.terms[q] : undefined
    if (!row?.length) {
      continue
    }
    const top = row[0][1]
    for (const [d, s] of row) {
      if (own.has(d)) {
        continue
      }
      const weight = w * (top > 0 ? s / top : 1)
      out.set(d, Math.max(out.get(d) ?? 0, weight))
    }
  }
  return out
}

/** RM3-подобное расширение: термы из топ-k карточек первого прохода, вес `w` × доля от лучшего терма */
export function prfExpansion(
  engine: Bm25,
  query: string,
  hits: Hit[],
  k: number,
  n: number,
  w: number,
): Map<string, number> {
  const own = new Set(tokenize(query))
  const scores = new Map<string, number>()
  const top = hits.filter((h) => h.card.kind === 'doc').slice(0, k)
  const best = top[0]?.score ?? 0
  if (!best) {
    return new Map()
  }
  for (const { card, score } of top) {
    const rel = score / best
    for (const term of Object.keys(card.tf)) {
      if (own.has(term)) {
        continue
      }
      scores.set(term, (scores.get(term) ?? 0) + rel * (card.tf[term] / card.len) * engine.idf(term))
    }
  }
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
  const max = ranked[0]?.[1] ?? 0
  return new Map(ranked.map(([t, s]) => [t, w * (s / max)]))
}
