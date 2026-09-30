import { tokenize } from './text'
import type { Card, IndexedCard, ScoutIndex } from './types'

/** Карточки → сериализуемый индекс с частотами термов (поля взвешены повтором) */
export function buildIndex(cards: Card[], builtAt = new Date().toISOString()): ScoutIndex {
  const indexed = cards.map(({ fields, ...card }): IndexedCard => {
    const tf: Record<string, number> = {}
    let len = 0
    for (const field of fields) {
      for (const term of tokenize(field.text)) {
        tf[term] = (tf[term] ?? 0) + field.weight
        len += field.weight
      }
    }
    return { ...card, tf, len }
  })
  return { version: 1, builtAt, cards: indexed }
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

  search(query: string, limit = 50): Hit[] {
    const terms = [...new Set(tokenize(query))]
    const scores = new Map<number, number>()
    for (const term of terms) {
      const list = this.postings.get(term)
      if (!list) {
        continue
      }
      const idf = this.idf(term)
      for (const i of list) {
        const card = this.cards[i]
        const tf = card.tf[term]
        const norm = (tf * (this.k1 + 1)) / (tf + this.k1 * (1 - this.b + (this.b * card.len) / this.avgLen))
        scores.set(i, (scores.get(i) ?? 0) + idf * norm)
      }
    }
    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([i, score]) => ({ card: this.cards[i], score }))
  }
}
