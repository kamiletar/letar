import type { Hit } from './bm25'
import { briefOrder } from './brief'
import type { DenseIndex } from './dense'
import type { DocHit } from './search'
import type { IndexedCard } from './types'

/** Сырые сигналы одного пункта справки — основа для подбора порога молчания */
export interface DocSignal {
  path: string
  /** Очки раскладки как есть: RRF в гибриде, BM25 в откате */
  score: number
  /** Лучший косинус среди карточек этого пути (doc | rule | section); нет вектора запроса — undefined */
  cos?: number
  /** Лучшие очки BM25 среди карточек этого пути; нет в выдаче BM25 — undefined */
  bm25?: number
  /** Место первой карточки этого пути в выдаче BM25, с единицы */
  bm25Rank?: number
}

export interface QuerySignals {
  /** В порядке справки: один список docs + traps по убыванию score, при равных доки раньше ловушек */
  items: DocSignal[]
  /** Лучший косинус по всем карточкам doc | rule | section и путь этой карточки */
  topCos?: number
  topCosPath?: string
  /** Лучшие очки BM25 среди карточек doc | rule | section */
  topBm25?: number
}

const DOC_KINDS = new Set(['doc', 'rule', 'section'])

/**
 * Сигналы запроса для лога: насколько уверенно база отвечает на него. Чистая функция без ввода-вывода.
 * `topCos` считается по всей базе, до отсева названных в запросе и всегда загруженных:
 * это «есть ли в базе что-то близкое», а не «что показали». Округляет вызывающий.
 */
export function querySignals(
  cards: IndexedCard[],
  shown: { docs: DocHit[]; traps: DocHit[] },
  bm25: Hit[],
  dense?: DenseIndex,
  vector?: Float32Array,
): QuerySignals {
  const idsByPath = new Map<string, string[]>()
  const pathById = new Map<string, string>()
  const docIds: string[] = []
  for (const card of cards) {
    if (!DOC_KINDS.has(card.kind)) {
      continue
    }
    docIds.push(card.id)
    pathById.set(card.id, card.path)
    const list = idsByPath.get(card.path)
    if (list) {
      list.push(card.id)
    } else {
      idsByPath.set(card.path, [card.id])
    }
  }
  const bm25ByPath = new Map<string, { score: number; rank: number }>()
  let topBm25: number | undefined
  bm25.forEach((hit, i) => {
    const { card, score } = hit
    if (!DOC_KINDS.has(card.kind)) {
      return
    }
    topBm25 = topBm25 === undefined ? score : Math.max(topBm25, score)
    const prev = bm25ByPath.get(card.path)
    if (!prev) {
      bm25ByPath.set(card.path, { score, rank: i + 1 })
    } else if (score > prev.score) {
      prev.score = score
    }
  })
  const withCos = dense && vector
  const top = withCos ? dense.rank(vector, docIds)[0] : undefined
  const items = briefOrder(shown).map(({ doc }): DocSignal => {
    const signal: DocSignal = { path: doc.path, score: doc.score }
    if (withCos) {
      signal.cos = dense.rank(vector, idsByPath.get(doc.path) ?? [])[0]?.score
    }
    const b = bm25ByPath.get(doc.path)
    if (b) {
      signal.bm25 = b.score
      signal.bm25Rank = b.rank
    }
    return signal
  })
  return {
    items,
    topCos: top?.score,
    topCosPath: top ? pathById.get(top.id) : undefined,
    topBm25,
  }
}
