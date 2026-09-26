import { type PersonalityTypeCode, STATE_CODES } from '../_data/personality-types'

/**
 * Разбивает шкалы для расшифровки под радаром на три списка и сортирует каждый по баллу от большего
 * к меньшему:
 * - `traits` — черты с достаточным числом ответов;
 * - `uncertain` — черты, по которым мало ответов (оценка приблизительная): их балл нельзя ставить
 *   в один ряд с надёжными, поэтому они идут отдельным списком, а не вперемешку;
 * - `states` — «Состояния» (BAR/DPR — `STATE_CODES`), независимо от числа ответов.
 *
 * При равных баллах сохраняется исходный порядок шкал (сортировка устойчивая), поэтому список не
 * «прыгает» между показами.
 */
export function groupLegendPoints<T extends { code: string; value: number; lowConfidence?: boolean }>(
  points: readonly T[],
): { traits: T[]; uncertain: T[]; states: T[] } {
  const isState = (code: string) => STATE_CODES.includes(code as PersonalityTypeCode)
  const byValueDesc = (a: T, b: T) => b.value - a.value
  return {
    traits: points.filter((p) => !isState(p.code) && !p.lowConfidence).sort(byValueDesc),
    uncertain: points.filter((p) => !isState(p.code) && p.lowConfidence).sort(byValueDesc),
    states: points.filter((p) => isState(p.code)).sort(byValueDesc),
  }
}
