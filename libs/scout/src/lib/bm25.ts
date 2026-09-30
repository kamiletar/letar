import { embedHash } from './dense'
import { tokenize } from './text'
import { type Card, INDEX_VERSION, type IndexedCard, type ScoutIndex } from './types'

/** Карточки → сериализуемый индекс с частотами термов (поля взвешены повтором) */
export function buildIndex(cards: Card[], builtAt = new Date().toISOString()): ScoutIndex {
  const indexed = cards.map((full): IndexedCard => {
    const { fields, ...card } = full
    // Без прототипа: иначе `tf['constructor']` — функция, и очки превращаются в NaN
    const tf: Record<string, number> = Object.create(null)
    let len = 0
    for (const field of fields) {
      for (const term of tokenize(field.text)) {
        tf[term] = (tf[term] ?? 0) + field.weight
        len += field.weight
      }
    }
    return { ...card, tf, len, embedHash: embedHash(full) }
  })
  return { version: INDEX_VERSION, builtAt, cards: indexed }
}

export interface Hit {
  card: IndexedCard
  score: number
}

export interface Bm25Options {
  k1?: number
  b?: number
}

/** Okapi BM25 поверх готового индекса; инвертированный список строится при загрузке */
export class Bm25 {
  readonly cards: IndexedCard[]
  private readonly postings = new Map<string, number[]>()
  private readonly avgLen: number
  private readonly k1: number
  private readonly b: number

  constructor(index: ScoutIndex, options: Bm25Options = {}) {
    this.cards = index.cards
    this.k1 = options.k1 ?? 1.2
    // b=0.9 выбран замером на проверочном наборе: длинные доки-хабы иначе всплывают на любой запрос
    this.b = options.b ?? 0.9
    let total = 0
    this.cards.forEach((card, i) => {
      total += card.len
      for (const term of Object.keys(card.tf)) {
        const list = this.postings.get(term)
        if (list) {
          list.push(i)
        } else {
          this.postings.set(term, [i])
        }
      }
    })
    this.avgLen = this.cards.length ? total / this.cards.length : 1
  }

  /** Обратная частота терма: редкие термы весят больше */
  idf(term: string): number {
    const df = this.postings.get(term)?.length ?? 0
    const n = this.cards.length
    return Math.log(1 + (n - df + 0.5) / (df + 0.5))
  }

  /** `extra` — дополнительные термы с весом (обычно < 1): расширение запроса словарём или PRF */
  search(query: string, limit = 50, extra?: ReadonlyMap<string, number>): Hit[] {
    const weights = new Map<string, number>()
    for (const term of new Set(tokenize(query))) {
      weights.set(term, 1)
    }
    for (const [term, w] of extra ?? []) {
      weights.set(term, Math.max(weights.get(term) ?? 0, w))
    }
    const scores = new Map<number, number>()
    for (const [term, weight] of weights) {
      const list = this.postings.get(term)
      if (!list) {
        continue
      }
      const idf = this.idf(term)
      for (const i of list) {
        const card = this.cards[i]
        // Индекс из JSON — обычный объект: берём только собственную частоту
        const tf = Object.hasOwn(card.tf, term) ? card.tf[term] : 0
        if (!tf) {
          continue
        }
        const norm = (tf * (this.k1 + 1)) / (tf + this.k1 * (1 - this.b + (this.b * card.len) / this.avgLen))
        scores.set(i, (scores.get(i) ?? 0) + weight * idf * norm)
      }
    }
    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([i, score]) => ({ card: this.cards[i], score }))
  }
}
