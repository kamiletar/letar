import { type PersonalityTypeCode, STATE_CODES } from '../_data/personality-types'

/**
 * Разбивает шкалы для расшифровки под радаром на «Черты» и «Состояния» (BAR/DPR — `STATE_CODES`)
 * и сортирует каждую группу по баллу от большего к меньшему. При равных баллах сохраняется
 * исходный порядок шкал (сортировка устойчивая), поэтому список не «прыгает» между показами.
 */
export function groupLegendPoints<T extends { code: string; value: number }>(
  points: readonly T[],
): { traits: T[]; states: T[] } {
  const isState = (code: string) => STATE_CODES.includes(code as PersonalityTypeCode)
  const byValueDesc = (a: T, b: T) => b.value - a.value
  return {
    traits: points.filter((p) => !isState(p.code)).sort(byValueDesc),
    states: points.filter((p) => isState(p.code)).sort(byValueDesc),
  }
}
