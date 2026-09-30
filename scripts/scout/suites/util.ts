import type { SuiteOutput } from './types'

export function percentile(sorted: number[], p: number): number {
  return sorted.length ? sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)] : 0
}

export function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`
}

/** Результат пропущенного сьюта (нет данных): метрик нет, поле прогона не заполняется */
export const EMPTY: SuiteOutput = { summary: {} }
