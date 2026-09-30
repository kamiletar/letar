import { createHash } from 'node:crypto'
import type { Bm25, Hit } from './bm25'
import type { Card, IndexedCard } from './types'

/**
 * Плотный поиск через локальный llama-server (OpenAI-совместимый `/v1/embeddings` и `/v1/rerank`).
 * Модели: Qwen3-Embedding-0.6B (последний токен, 1024 измерения) и Qwen3-Reranker-0.6B.
 * Сервер недоступен — вызывающий откатывается на чистый BM25, поэтому все клиенты бросают быстро.
 */

/** Инструкция для запроса: Qwen3-Embedding асимметричен — запросу нужна задача, документу нет */
export const QUERY_INSTRUCTION =
  'Given a developer task description in Russian or English, retrieve monorepo documentation that helps to complete it'

/** Сколько символов карточки отдаём эмбеддеру: хватает на заголовок, аннотацию и начало секции */
export const EMBED_TEXT_CHARS = 1600

/** Текст карточки для эмбеддинга: поля в порядке веса, без повторов */
export function cardEmbedText(card: Card): string {
  const ordered = [...card.fields].sort((a, b) => b.weight - a.weight).map((f) => f.text.trim()).filter(Boolean)
  const head = card.kind === 'section' ? `${card.title} (${card.path})` : card.path
  return [head, card.summary, ...ordered].join('\n').slice(0, EMBED_TEXT_CHARS)
}

/** Хеш текста для эмбеддинга: первые 16 hex sha1 от `cardEmbedText` */
export function embedHash(card: Card): string {
  return createHash('sha1').update(cardEmbedText(card)).digest('hex').slice(0, 16)
}

/** Длиннее — эмбеддер отвечает HTTP 400 (лимит токенов на слот), поэтому запрос сжимаем */
export const QUERY_CHARS = 1500

/** Длинный запрос: начало (там обычно задача) и конец (после вставленного лога) */
export function formatQuery(query: string): string {
  const body = query.length > QUERY_CHARS ? `${query.slice(0, 1200)}\n…\n${query.slice(-300)}` : query
  return `Instruct: ${QUERY_INSTRUCTION}\nQuery: ${body}`
}

export interface ServerOptions {
  /** Базовый адрес llama-server, например `http://127.0.0.1:8090` */
  url: string
  timeoutMs?: number
}

async function postJson<T>(options: ServerOptions, path: string, body: unknown): Promise<T> {
  const response = await fetch(`${options.url}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(options.timeoutMs ?? 2000),
  })
  if (!response.ok) {
    throw new Error(`${path}: HTTP ${response.status} ${await response.text().catch(() => '')}`.slice(0, 300))
  }
  return (await response.json()) as T
}

/** Нормированные эмбеддинги в порядке входа */
export async function embedTexts(texts: string[], options: ServerOptions): Promise<Float32Array[]> {
  const result = await postJson<{ data: Array<{ index: number; embedding: number[] }> }>(options, '/v1/embeddings', {
    input: texts,
  })
  return [...result.data].sort((a, b) => a.index - b.index).map((d) => normalize(Float32Array.from(d.embedding)))
}

/** Оценки релевантности документов запросу, в порядке входа */
export async function rerankTexts(query: string, documents: string[], options: ServerOptions): Promise<number[]> {
  const result = await postJson<{ results: Array<{ index: number; relevance_score: number }> }>(options, '/v1/rerank', {
    query,
    documents,
    top_n: documents.length,
  })
  const scores = new Array<number>(documents.length).fill(-Infinity)
  for (const r of result.results) {
    scores[r.index] = r.relevance_score
  }
  return scores
}

export function normalize(vector: Float32Array): Float32Array {
  let sum = 0
  for (const x of vector) {
    sum += x * x
  }
  const norm = Math.sqrt(sum) || 1
  return vector.map((x) => x / norm)
}

/** Матрица эмбеддингов карточек: строка на карточку, векторы нормированы — косинус равен скалярному произведению */
export class DenseIndex {
  private readonly rowById = new Map<string, number>()

  constructor(readonly ids: string[], readonly matrix: Float32Array, readonly dims: number) {
    ids.forEach((id, i) => this.rowById.set(id, i))
  }

  has(id: string): boolean {
    return this.rowById.has(id)
  }

  search(query: Float32Array, limit: number): Array<{ id: string; score: number }> {
    const scores: Array<{ id: string; score: number }> = []
    for (let row = 0; row < this.ids.length; row++) {
      let dot = 0
      const offset = row * this.dims
      for (let d = 0; d < this.dims; d++) {
        dot += this.matrix[offset + d] * query[d]
      }
      scores.push({ id: this.ids[row], score: dot })
    }
    return scores.sort((a, b) => b.score - a.score).slice(0, limit)
  }

  /** Косинусы только для выбранных карточек, по убыванию; карточки без вектора пропускаются */
  rank(query: Float32Array, ids: Iterable<string>): Array<{ id: string; score: number }> {
    const scores: Array<{ id: string; score: number }> = []
    for (const id of ids) {
      const row = this.rowById.get(id)
      if (row === undefined) {
        continue
      }
      let dot = 0
      const offset = row * this.dims
      for (let d = 0; d < this.dims; d++) {
        dot += this.matrix[offset + d] * query[d]
      }
      scores.push({ id, score: dot })
    }
    return scores.sort((a, b) => b.score - a.score)
  }
}

/**
 * Reciprocal Rank Fusion: сумма `1 / (k + ранг)` по спискам. Шкалы BM25 и косинуса несравнимы,
 * RRF берёт только ранги — поэтому не требует калибровки. `k = 60` — значение из исходной статьи.
 */
export function reciprocalRankFusion(rankings: string[][], k = 60): Map<string, number> {
  const fused = new Map<string, number>()
  for (const ranking of rankings) {
    ranking.forEach((id, rank) => fused.set(id, (fused.get(id) ?? 0) + 1 / (k + rank + 1)))
  }
  return fused
}

/** Слитая выдача в форме `Hit[]` для `layoutHits` */
export function fusedHits(cards: IndexedCard[], fused: Map<string, number>, limit: number): Hit[] {
  const byId = new Map(cards.map((c) => [c.id, c]))
  return [...fused.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .flatMap(([id, score]) => {
      const card = byId.get(id)
      return card ? [{ card, score }] : []
    })
}

export interface HybridOptions {
  dense?: DenseIndex
  embed?: ServerOptions
  rerank?: ServerOptions
  /** Сколько первых карточек каждого списка идёт в слияние */
  fuseDepth?: number
  /** Сколько первых карточек слитой выдачи переоценивает реранкер */
  rerankDepth?: number
}

/** Отдельный рейтинг полей и паттернов форм по косинусу: в общей выдаче их тонкие карточки тонут */
export interface FormRanking {
  fields: Hit[]
  patterns: Hit[]
}

export interface HybridResult {
  hits: Hit[]
  /** Есть, только если отработали эмбеддинги */
  forms?: FormRanking
  /** Какие ступени отработали: `bm25`, `dense`, `rerank` — для лога и отката */
  stages: string[]
}

/** Текст карточки для реранкера: короткий, чтобы 40 пар укладывались в сотни миллисекунд */
export function cardRerankText(card: IndexedCard): string {
  const where = card.kind === 'section' ? `${card.topic ?? card.path} § ${card.title}` : `${card.title} (${card.path})`
  return `${where}\n${card.summary}`.slice(0, 600)
}

/**
 * Гибрид: BM25 + плотный поиск → RRF → реранк верхушки. Каждая ступень необязательна и
 * падает молча: нет сервера эмбеддингов — чистый BM25, нет реранкера — слияние без реранка.
 * Реранкнутые карточки получают очки `1 + оценка` и встают выше остальных.
 */
export async function hybridHits(engine: Bm25, query: string, options: HybridOptions): Promise<HybridResult> {
  const { fuseDepth = 100, rerankDepth = 40 } = options
  const bm25 = engine.search(query, 500)
  const stages = ['bm25']
  let hits = bm25
  let forms: FormRanking | undefined
  if (options.dense && options.embed) {
    try {
      const [vector] = await embedTexts([formatQuery(query)], options.embed)
      forms = formRanking(engine.cards, options.dense, vector)
      const dense = options.dense.search(vector, fuseDepth).map((d) => d.id)
      const fused = reciprocalRankFusion([bm25.slice(0, fuseDepth).map((h) => h.card.id), dense])
      const head = fusedHits(engine.cards, fused, fused.size)
      const inHead = new Set(head.map((h) => h.card.id))
      // Хвост BM25 нужен для инструментов: их короткие карточки редко попадают в верхушку
      const tail = bm25.filter((h) => !inHead.has(h.card.id)).map((h) => ({ card: h.card, score: 0 }))
      hits = [...head, ...tail]
      stages.push('dense')
    } catch {
      // сервер эмбеддингов недоступен — остаёмся на BM25
    }
  }
  if (options.rerank) {
    try {
      const candidates = hits.filter((h) => !['skill', 'command', 'agent'].includes(h.card.kind)).slice(0, rerankDepth)
      const scores = await rerankTexts(query, candidates.map((h) => cardRerankText(h.card)), options.rerank)
      const reranked = new Map(candidates.map((h, i) => [h.card.id, 1 + scores[i]]))
      hits = hits
        .map((h) => ({ card: h.card, score: reranked.get(h.card.id) ?? h.score }))
        .sort((a, b) => b.score - a.score)
      stages.push('rerank')
    } catch {
      // реранкер недоступен — остаётся слитая выдача
    }
  }
  return { hits, stages, forms }
}

/** Косинусный рейтинг карточек полей и паттернов */
export function formRanking(cards: IndexedCard[], dense: DenseIndex, vector: Float32Array): FormRanking {
  const byId = new Map(cards.map((c) => [c.id, c]))
  const ranked = (kind: string) =>
    dense.rank(vector, cards.filter((c) => c.kind === kind).map((c) => c.id)).flatMap(({ id, score }) => {
      const card = byId.get(id)
      return card ? [{ card, score }] : []
    })
  return { fields: ranked('field'), patterns: ranked('pattern') }
}
