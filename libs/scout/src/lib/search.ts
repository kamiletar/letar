import type { Bm25, Hit } from './bm25'
import type { IndexedCard } from './types'

/** Док в выдаче: карточка дока, сведённая с лучшей совпавшей секцией */
export interface DocHit {
  path: string
  line: number
  title: string
  summary: string
  /** Заголовок совпавшей секции, если ссылка ведёт на неё */
  section?: string
  star?: boolean
  warn?: boolean
  score: number
}

export interface ToolHit {
  kind: 'skill' | 'command' | 'agent'
  name: string
  path: string
  summary: string
  score: number
}

export interface ScoutResult {
  query: string
  docs: DocHit[]
  traps: DocHit[]
  tool?: ToolHit
  /** Сколько карточек совпало хоть одним термом — для диагностики */
  matched: number
}

export interface ScoutOptions {
  maxDocs?: number
  maxTraps?: number
  /** Отсекать всё, что слабее `minRelative × лучший результат` */
  minRelative?: number
  /** Инструмент показывать, только если он не слабее `toolRelative × лучший док` */
  toolRelative?: number
  /** Доля очков второй и следующих совпавших секций того же дока */
  extraSectionWeight?: number
  /** Сколько дополнительных секций одного дока могут добавить очки */
  maxExtraSections?: number
}

const TOOL_KINDS = new Set(['skill', 'command', 'agent'])

/** Поиск и раскладка по полкам справки: доки, ловушки, один инструмент */
export function scout(engine: Bm25, query: string, options: ScoutOptions = {}): ScoutResult {
  const {
    maxDocs = 5,
    maxTraps = 3,
    minRelative = 0.35,
    toolRelative = 0.4,
    extraSectionWeight = 0.1,
    maxExtraSections = 3,
  } = options
  // Карточки инструментов короткие и набирают меньше очков, чем доки, поэтому берём выдачу глубоко
  const hits = engine.search(query, 500)
  const docCards = new Map<string, IndexedCard>()
  for (const card of engine.cards) {
    if (card.kind === 'doc' || card.kind === 'rule') {
      docCards.set(card.path, card)
    }
  }
  const byPath = new Map<string, DocHit>()
  const extras = new Map<string, number>()
  let tool: ToolHit | undefined
  for (const hit of hits) {
    if (TOOL_KINDS.has(hit.card.kind)) {
      if (hit.card.scope !== 'app') {
        tool ??= toToolHit(hit)
      }
      continue
    }
    const existing = byPath.get(hit.card.path)
    if (existing) {
      const used = extras.get(hit.card.path) ?? 0
      if (used < maxExtraSections) {
        existing.score += hit.score * extraSectionWeight
        extras.set(hit.card.path, used + 1)
      }
      continue
    }
    byPath.set(hit.card.path, toDocHit(hit, docCards.get(hit.card.path)))
  }
  const ranked = [...byPath.values()].sort((a, b) => b.score - a.score)
  const top = ranked[0]?.score ?? 0
  const strong = ranked.filter((d) => d.score >= top * minRelative)
  const traps = strong.filter((d) => d.warn).slice(0, maxTraps)
  const docs = strong.filter((d) => !d.warn).slice(0, maxDocs)
  if (tool && tool.score < top * toolRelative) {
    tool = undefined
  }
  return { query, docs, traps, tool, matched: hits.length }
}

function toDocHit(hit: Hit, doc: IndexedCard | undefined): DocHit {
  const { card, score } = hit
  const base = doc ?? card
  return {
    path: card.path,
    line: card.line,
    title: base.title,
    summary: base.summary || card.summary,
    section: card.kind === 'section' ? card.title : undefined,
    star: base.star,
    warn: base.warn,
    score,
  }
}

function toToolHit(hit: Hit): ToolHit {
  return {
    kind: hit.card.kind as ToolHit['kind'],
    name: hit.card.title,
    path: hit.card.path,
    summary: hit.card.summary,
    score: hit.score,
  }
}
