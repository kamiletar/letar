/**
 * Детерминированное перемешивание с seed — общий хелпер для квиза и экспресса.
 * Один seed даёт один и тот же порядок: сохранённый прогресс и результаты
 * воспроизводятся при повторном монтировании компонента.
 */

/** Seeded PRNG (mulberry32) */
export function mulberry32(seed: number): () => number {
  return function() {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates shuffle с seed (чистая функция — исходный массив не мутируется) */
export function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const rng = mulberry32(seed)
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
