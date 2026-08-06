import maxScoresData from '../_data/max-scores-per-question.json'
import { ALL_SCALE_CODES, HEXAGRAM_SCALE_CODES, type PersonalityTypeCode } from '../_data/personality-types'
import { fisherYatesShuffle } from './stratified-shuffle'

/** Максимальные баллы по каждому вопросу (из JSON от психолога) */
const perQuestionMax = maxScoresData.per_question_max as Record<string, Record<string, number>>

/** Сколько вопросов на каждую шкалу гексаграммы в экспрессе (решение 2026-07-03) */
export const EXPRESS_QUESTIONS_PER_SCALE = 3

/** Всего вопросов в экспрессе: 8 шкал гексаграммы × 3 = 24 */
export const EXPRESS_TOTAL = HEXAGRAM_SCALE_CODES.length * EXPRESS_QUESTIONS_PER_SCALE

/**
 * Доминантная шкала вопроса по sortOrder (0-based) — та, для которой вопрос
 * даёт максимальный балл. При равенстве берётся первая по порядку ALL_SCALE_CODES.
 */
export function expressDominantScale(sortOrder: number): PersonalityTypeCode | null {
  const qMax = perQuestionMax[String(sortOrder + 1)] // sortOrder 0-based → questionNumber 1-based
  if (!qMax) {
    return null
  }

  let best: PersonalityTypeCode | null = null
  let bestScore = 0
  for (const code of ALL_SCALE_CODES) {
    const score = qMax[code] || 0
    if (score > bestScore) {
      bestScore = score
      best = code
    }
  }
  return best
}

/** Минимальные данные вопроса для экспресс-выборки */
export interface ExpressSelectable {
  id: string
  sortOrder: number
}

interface SelectOptions<T> {
  /** Сколько вопросов на шкалу (по умолчанию 3) */
  perScale?: number
  /** Как определять доминантную шкалу (инъекция для тестов) */
  dominantOf?: (q: T) => PersonalityTypeCode | null
  /** Перемешивание внутри корзины (инъекция для детерминизма в тестах) */
  shuffle?: <U>(a: U[]) => U[]
}

/**
 * Экспресс-выборка (этап 5.3): ровно N вопросов на каждую из 8 шкал гексаграммы
 * (HUM, KAN, FAI, MAC, NAR, ANT, SAD, MAS). Детерминированное покрытие —
 * каждая шкала гарантированно получает свою квоту, а не вероятностную долю как
 * стратификация полного теста. Возвращает вопросы, сгруппированные по шкалам
 * в порядке HEXAGRAM_SCALE_CODES; финальное перемешивание делает вызывающий.
 *
 * Если у шкалы меньше N доминантных вопросов — берётся сколько есть (в банке
 * минимум 6 на самую малую шкалу SAD, так что квота 3 всегда выполнима).
 */
export function selectExpressQuestions<T extends ExpressSelectable>(
  questions: T[],
  options: SelectOptions<T> = {},
): T[] {
  const perScale = options.perScale ?? EXPRESS_QUESTIONS_PER_SCALE
  const dominantOf = options.dominantOf ?? ((q: T) => expressDominantScale(q.sortOrder))
  const shuffle = options.shuffle ?? fisherYatesShuffle

  const buckets = new Map<PersonalityTypeCode, T[]>()
  for (const code of HEXAGRAM_SCALE_CODES) {
    buckets.set(code, [])
  }

  for (const q of questions) {
    const dom = dominantOf(q)
    if (dom && buckets.has(dom)) {
      buckets.get(dom)!.push(q)
    }
  }

  const selected: T[] = []
  for (const code of HEXAGRAM_SCALE_CODES) {
    const shuffled = shuffle([...buckets.get(code)!])
    selected.push(...shuffled.slice(0, perScale))
  }
  return selected
}
