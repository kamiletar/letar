import maxScoresData from '../_data/max-scores-per-question.json'
import type { PersonalityTypeCode } from '../_data/personality-types'
import { ALL_SCALE_CODES } from '../_data/personality-types'

/** Максимальные баллы по каждому вопросу (из JSON от психолога) */
const perQuestionMax = maxScoresData.per_question_max as Record<string, Record<string, number>>

/**
 * Доминантная шкала вопроса по sortOrder (0-based).
 * Доминантная шкала — та, для которой вопрос даёт максимальный балл.
 * Если несколько шкал дают одинаковый макс — берём первую по порядку ALL_SCALE_CODES.
 */
function getDominantScale(sortOrder: number): PersonalityTypeCode | null {
  const qId = String(sortOrder + 1) // sortOrder 0-based → questionNumber 1-based
  const qMax = perQuestionMax[qId]
  if (!qMax) {
    return null
  }

  let bestScale: PersonalityTypeCode | null = null
  let bestScore = 0

  for (const code of ALL_SCALE_CODES) {
    const score = qMax[code] || 0
    if (score > bestScore) {
      bestScore = score
      bestScale = code
    }
  }

  return bestScale
}

/** Вопрос с минимальными данными для стратификации */
export interface StratifiableQuestion {
  id: string
  sortOrder: number
}

/**
 * Стратифицированная выборка вопросов.
 *
 * Алгоритм:
 * 1. Группируем доступные вопросы по доминантной шкале
 * 2. Распределяем слоты пропорционально размеру каждой группы
 * 3. Гарантируем минимум 1 слот для каждой шкалы (если есть вопросы)
 * 4. Случайно выбираем вопросы из каждой группы
 * 5. Финальное перемешивание всей порции
 */
export function stratifiedSelect<T extends StratifiableQuestion>(questions: T[], count: number): T[] {
  if (questions.length <= count) {
    // Все вопросы влезают — просто перемешиваем
    return fisherYatesShuffle([...questions])
  }

  // Группируем по доминантной шкале
  const buckets = new Map<PersonalityTypeCode, T[]>()
  const uncategorized: T[] = []

  for (const code of ALL_SCALE_CODES) {
    buckets.set(code, [])
  }

  for (const q of questions) {
    const dominant = getDominantScale(q.sortOrder)
    if (dominant) {
      buckets.get(dominant)!.push(q)
    } else {
      uncategorized.push(q)
    }
  }

  // Распределяем слоты пропорционально
  const totalCategorized = questions.length - uncategorized.length
  const slots = new Map<PersonalityTypeCode, number>()
  let allocated = 0

  // Первый проход: гарантируем минимум 1 слот для непустых групп
  for (const code of ALL_SCALE_CODES) {
    const bucket = buckets.get(code)!
    if (bucket.length > 0) {
      slots.set(code, 1)
      allocated++
    } else {
      slots.set(code, 0)
    }
  }

  // Второй проход: распределяем оставшиеся слоты пропорционально
  const remaining = count - allocated
  if (remaining > 0 && totalCategorized > 0) {
    // Считаем пропорциональные доли для шкал с вопросами
    const nonEmptyScales = ALL_SCALE_CODES.filter((code) => buckets.get(code)!.length > 0)
    const fractionalSlots: { code: PersonalityTypeCode; fraction: number }[] = []

    for (const code of nonEmptyScales) {
      const bucketSize = buckets.get(code)!.length
      const fraction = (bucketSize / totalCategorized) * remaining
      const wholeExtra = Math.floor(fraction)
      slots.set(code, slots.get(code)! + wholeExtra)
      allocated += wholeExtra
      fractionalSlots.push({ code, fraction: fraction - wholeExtra })
    }

    // Дробные остатки — добавляем по одному, начиная с наибольшего остатка
    fractionalSlots.sort((a, b) => b.fraction - a.fraction)
    let leftover = count - allocated
    for (const { code } of fractionalSlots) {
      if (leftover <= 0) {
        break
      }
      slots.set(code, slots.get(code)! + 1)
      leftover--
    }
  }

  // Не превышаем размер корзины
  for (const code of ALL_SCALE_CODES) {
    const bucket = buckets.get(code)!
    const slotCount = slots.get(code)!
    if (slotCount > bucket.length) {
      slots.set(code, bucket.length)
    }
  }

  // Выбираем случайные вопросы из каждой корзины
  const selected: T[] = []

  for (const code of ALL_SCALE_CODES) {
    const bucket = buckets.get(code)!
    const slotCount = slots.get(code)!
    if (slotCount === 0) {
      continue
    }

    const shuffled = fisherYatesShuffle([...bucket])
    selected.push(...shuffled.slice(0, slotCount))
  }

  // Добавляем некатегоризированные если есть свободные слоты
  if (selected.length < count && uncategorized.length > 0) {
    const extra = fisherYatesShuffle([...uncategorized])
    selected.push(...extra.slice(0, count - selected.length))
  }

  // Финальное перемешивание (чтобы вопросы одной шкалы не шли подряд)
  return fisherYatesShuffle(selected)
}

/** Fisher-Yates shuffle (без seed, для серверной выборки) */
export function fisherYatesShuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
