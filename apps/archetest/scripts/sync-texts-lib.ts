/**
 * Сравнение текстов вопроса «БД ↔ дамп» для режима `seed-questions.ts --sync-texts`.
 *
 * Append-only seed не трогает существующие строки, поэтому правка формулировки в дампе
 * (EN-перевод, вердикт ревьюера «Править») до БД сама не доезжает. Синхронизация закрывает
 * этот разрыв, но меняет ТОЛЬКО тексты: изменение баллов сдвигает `actual_max` шкал и делает
 * старые сессии несопоставимыми — это отдельное решение с бампом `QUESTION_BANK_VERSION`,
 * а не побочный эффект синхронизации.
 */

export interface QuestionTexts {
  id: string
  scenario: string
  scenarioEn: string
  /** JSON-строка массива вариантов `{ text, textEn, scoring }` — как в дампе и в БД */
  options: string
}

type Option = Record<string, unknown>

const TEXT_KEYS = new Set(['text', 'textEn'])
const OPTION_KEYS = new Set(['text', 'textEn', 'scoring'])

export type TextDiff =
  | { kind: 'unchanged' }
  | {
    kind: 'update'
    changedFields: string[]
    data: Pick<QuestionTexts, 'scenario' | 'scenarioEn' | 'options'>
  }
  | { kind: 'reject'; reason: string }

/** Равенство баллов без учёта порядка ключей */
function sameScoring(a: unknown, b: unknown): boolean {
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) { return false }
  const ra = a as Record<string, unknown>
  const rb = b as Record<string, unknown>
  const keys = Object.keys(ra)
  if (keys.length !== Object.keys(rb).length) { return false }
  return keys.every((k) => Object.hasOwn(rb, k) && ra[k] === rb[k])
}

export function diffQuestionTexts(current: QuestionTexts, next: QuestionTexts): TextDiff {
  if (current.id !== next.id) {
    throw new Error(`diffQuestionTexts: разные id (${current.id} ≠ ${next.id})`)
  }

  const a = JSON.parse(current.options) as Option[]
  const b = JSON.parse(next.options) as Option[]
  if (a.length !== b.length) {
    return { kind: 'reject', reason: `число вариантов ${a.length} → ${b.length}` }
  }

  const changedFields: string[] = []
  if (current.scenario !== next.scenario) { changedFields.push('scenario') }
  if (current.scenarioEn !== next.scenarioEn) { changedFields.push('scenarioEn') }

  for (let i = 0; i < a.length; i++) {
    const unknownKey = Object.keys(b[i]).find((k) => !OPTION_KEYS.has(k))
    if (unknownKey) {
      return { kind: 'reject', reason: `options[${i}]: незнакомое поле «${unknownKey}»` }
    }
    if (!sameScoring(a[i].scoring, b[i].scoring)) {
      return {
        kind: 'reject',
        reason: `options[${i}].scoring: ${JSON.stringify(a[i].scoring)} → ${JSON.stringify(b[i].scoring)}`,
      }
    }
    for (const key of TEXT_KEYS) {
      if (a[i][key] !== b[i][key]) { changedFields.push(`options[${i}].${key}`) }
    }
  }

  if (changedFields.length === 0) { return { kind: 'unchanged' } }
  return {
    kind: 'update',
    changedFields,
    data: { scenario: next.scenario, scenarioEn: next.scenarioEn, options: next.options },
  }
}

export interface TextSyncPlan {
  updates: { id: string; changedFields: string[]; data: Pick<QuestionTexts, 'scenario' | 'scenarioEn' | 'options'> }[]
  rejects: { id: string; reason: string }[]
  /** Есть в дампе, но нет в БД — это работа обычного append-режима, не синхронизации */
  missingInDb: string[]
  unchanged: number
}

export function planTextSync(dbRows: QuestionTexts[], dump: QuestionTexts[]): TextSyncPlan {
  const byId = new Map(dbRows.map((row) => [row.id, row]))
  const plan: TextSyncPlan = { updates: [], rejects: [], missingInDb: [], unchanged: 0 }

  for (const next of dump) {
    const current = byId.get(next.id)
    if (!current) {
      plan.missingInDb.push(next.id)
      continue
    }
    const diff = diffQuestionTexts(current, next)
    if (diff.kind === 'unchanged') { plan.unchanged++ }
    else if (diff.kind === 'reject') { plan.rejects.push({ id: next.id, reason: diff.reason }) }
    else { plan.updates.push({ id: next.id, changedFields: diff.changedFields, data: diff.data }) }
  }

  return plan
}
