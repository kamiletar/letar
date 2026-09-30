import type { Bm25, Hit } from './bm25'
import type { FormRanking } from './dense'
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

/** Поле или паттерн формы: имя компонента/паттерна и где о нём читать */
export interface FormHit {
  name: string
  summary: string
  path: string
  line: number
  score: number
}

export interface ScoutResult {
  query: string
  docs: DocHit[]
  traps: DocHit[]
  tool?: ToolHit
  /** Поля формы — только если запрос про формы */
  fields: FormHit[]
  /** Паттерн формы из реестра form-mcp — только если запрос про формы */
  pattern?: FormHit
  /** Сколько карточек совпало хоть одним термом — для диагностики */
  matched: number
}

export interface ScoutOptions {
  maxDocs?: number
  maxTraps?: number
  maxFields?: number
  /** Отсекать всё, что слабее `minRelative × лучший результат` */
  minRelative?: number
  /** Инструмент показывать, только если он не слабее `toolRelative × лучший док` */
  toolRelative?: number
  /** Доля очков второй и следующих совпавших секций того же дока */
  extraSectionWeight?: number
  /** Сколько дополнительных секций одного дока могут добавить очки */
  maxExtraSections?: number
  /** Запрос считается «про формы», если среди первых `formWindow` карточек не меньше `formQuorum` из корпуса форм */
  formWindow?: number
  formQuorum?: number
  /** …или если лучшая карточка поля стоит в выдаче выше этого места */
  formRankGate?: number
  /** Паттерн показывать, только если он стоит в выдаче выше этого места: иначе совпадение случайное */
  patternRank?: number
  /** Поля ниже этого места выдачи на полку не попадают */
  fieldRank?: number
  /**
   * Косинусный рейтинг полей и паттернов (`hybridHits`). Есть — полка строится по нему, а не по
   * общей выдаче; нет — откат на BM25-раскладку выше.
   */
  forms?: FormRanking
  /** Запрос про поля, если лучшее поле не дальше этого косинуса (замер 2026-09-30: 50/63 проб, 6/169 прочих задач) */
  fieldMinCosine?: number
  /** При словах про формы или кворуме хватает и косинуса пониже: «поле» в длинной задаче бывает полем БД */
  fieldMinCosineWithWords?: number
  /** На полку идут поля не дальше `fieldMargin` от лучшего */
  fieldMargin?: number
  /** Паттерн при словах про формы — только если его косинус не ниже порога */
  patternMinCosine?: number
  /** Паттерн без слов про формы — только при таком косинусе */
  patternMinCosineAlone?: number
}

/**
 * Явные слова про формы и поля ввода в запросе. `\b` в JS не видит кириллицу — границы слова через
 * lookaround; «формат» и «информация» — не формы.
 */
const FORM_WORDS =
  /(?<![а-яё])(?:форм(?!ат)|анкет|пол(?:е|я|ю|ей|ями?)(?![а-яё])|инпут|ввод(?![а-яё]))|\b(?:inputs?|fields?)\b/i

const TOOL_KINDS = new Set(['skill', 'command', 'agent'])
const FORM_KINDS = new Set(['field', 'pattern'])

/** Карточка из корпуса форм: поле, паттерн, доки и правила про формы */
export function isFormCard(card: IndexedCard): boolean {
  return FORM_KINDS.has(card.kind) || card.path.startsWith('libs/forms/') || /(^|[/-])forms?[-./]/.test(card.path)
}

/** Поиск BM25 и раскладка по полкам справки: доки, ловушки, один инструмент, поля формы */
export function scout(engine: Bm25, query: string, options: ScoutOptions = {}): ScoutResult {
  // Карточки инструментов короткие и набирают меньше очков, чем доки, поэтому берём выдачу глубоко
  return layoutHits(engine.cards, engine.search(query, 500), query, options)
}

/**
 * Раскладка готовой выдачи (BM25, гибрид, реранк — неважно, лишь бы по убыванию `score`)
 * по полкам справки. Секции сводятся к своему доку, команды приложений не советуются.
 */
export function layoutHits(cards: IndexedCard[], hits: Hit[], query: string, options: ScoutOptions = {}): ScoutResult {
  const {
    maxDocs = 5,
    maxTraps = 3,
    maxFields = 4,
    minRelative = 0.35,
    toolRelative = 0.4,
    extraSectionWeight = 0.1,
    maxExtraSections = 3,
    formWindow = 12,
    formQuorum = 3,
    formRankGate = 5,
    patternRank = 15,
    fieldRank = 40,
    forms,
    fieldMinCosine = 0.55,
    fieldMinCosineWithWords = 0.5,
    fieldMargin = 0.12,
    patternMinCosine = 0.53,
    patternMinCosineAlone = 0.65,
  } = options
  const docCards = new Map<string, IndexedCard>()
  for (const card of cards) {
    if (card.kind === 'doc' || card.kind === 'rule') {
      docCards.set(card.path, card)
    }
  }
  const byPath = new Map<string, DocHit>()
  const extras = new Map<string, number>()
  const fieldHits: FormHit[] = []
  let pattern: FormHit | undefined
  let tool: ToolHit | undefined
  let firstFormRank = -1
  hits.forEach((hit, rank) => {
    const { card } = hit
    if (FORM_KINDS.has(card.kind) && firstFormRank === -1) {
      firstFormRank = rank
    }
    if (TOOL_KINDS.has(card.kind)) {
      if (card.scope !== 'app') {
        tool ??= toToolHit(hit)
      }
      return
    }
    if (card.kind === 'field') {
      if (rank < fieldRank) {
        fieldHits.push(toFormHit(hit))
      }
      return
    }
    if (card.kind === 'pattern') {
      if (rank < patternRank) {
        pattern ??= toFormHit(hit)
      }
      return
    }
    const existing = byPath.get(card.path)
    if (existing) {
      const used = extras.get(card.path) ?? 0
      if (used < maxExtraSections) {
        existing.score += hit.score * extraSectionWeight
        extras.set(card.path, used + 1)
      }
      return
    }
    byPath.set(card.path, toDocHit(hit, docCards.get(card.path)))
  })
  const ranked = [...byPath.values()].sort((a, b) => b.score - a.score)
  const top = ranked[0]?.score ?? 0
  const strong = ranked.filter((d) => d.score >= top * minRelative)
  const traps = strong.filter((d) => d.warn).slice(0, maxTraps)
  const docs = strong.filter((d) => !d.warn).slice(0, maxDocs)
  if (tool && tool.score < top * toolRelative) {
    tool = undefined
  }
  const wordsOrQuorum = FORM_WORDS.test(query)
    || hits.slice(0, formWindow).filter((h) => isFormCard(h.card)).length >= formQuorum
  const base = { query, docs, traps, tool, matched: hits.length }
  if (forms) {
    const top = forms.fields[0]?.score ?? 0
    const aboutForms = top >= fieldMinCosine || (wordsOrQuorum && top >= fieldMinCosineWithWords)
    const bestPattern = forms.patterns[0]
    return {
      ...base,
      fields: aboutForms
        ? forms.fields.filter((f) => f.score >= top - fieldMargin).slice(0, maxFields).map(toFormHit)
        : [],
      pattern: bestPattern
          && (bestPattern.score >= patternMinCosineAlone || (wordsOrQuorum && bestPattern.score >= patternMinCosine))
        ? toFormHit(bestPattern)
        : undefined,
    }
  }
  const aboutForms = wordsOrQuorum || (firstFormRank !== -1 && firstFormRank < formRankGate)
  const bestField = fieldHits[0]?.score ?? 0
  return {
    ...base,
    fields: aboutForms ? fieldHits.filter((f) => f.score >= bestField * minRelative).slice(0, maxFields) : [],
    pattern: aboutForms ? pattern : undefined,
  }
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

function toFormHit(hit: Hit): FormHit {
  return { name: hit.card.title, summary: hit.card.summary, path: hit.card.path, line: hit.card.line, score: hit.score }
}
