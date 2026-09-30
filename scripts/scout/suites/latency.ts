import type { Suite } from './types'
import { EMPTY, percentile } from './util'

export interface LatencyResult {
  n: number
  p50: number
  p95: number
  max: number
}

/** Время `scoutQuery` на тёплом процессе: берётся из общего кеша запросов */
export const latencySuite: Suite = async ({ cases, cached }) => {
  if (!cases.length) {
    return EMPTY
  }
  const times = [...new Set(cases.map((c) => c.query))].map((q) => cached(q)!.ms).sort((a, b) => a - b)
  const lat: LatencyResult = {
    n: times.length,
    p50: percentile(times, 0.5),
    p95: percentile(times, 0.95),
    max: times.at(-1) ?? 0,
  }
  console.log(
    `\n== latency ==\nscoutQuery, ${lat.n} запросов: p50 ${Math.round(lat.p50)} мс, p95 ${
      Math.round(lat.p95)
    } мс, max ${Math.round(lat.max)} мс`,
  )
  return { summary: { 'p50 мс': lat.p50, 'p95 мс': lat.p95, 'max мс': lat.max }, result: lat }
}
