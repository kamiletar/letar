import type { Bm25 } from '../../../libs/scout/src/index'
import type { SuiteOutput } from './types'

export function percentile(sorted: number[], p: number): number {
  return sorted.length ? sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)] : 0
}

export function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`
}

/** Результат пропущенного сьюта (нет данных): метрик нет, поле прогона не заполняется */
export const EMPTY: SuiteOutput = { summary: {} }

/** Пути карточек, уже загруженных в контекст агента (`loaded`): их справка не повторяет */
export function loadedPathsOf(engine: Bm25): Set<string> {
  return new Set(engine.cards.filter((c) => c.loaded).map((c) => c.path))
}
