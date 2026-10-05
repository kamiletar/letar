import { assertPatternSeed } from './config'

const SEED_MIX = 0x9e3779b9
const ZERO_STATE_REPLACEMENT = 0x6d2b79f5

/**
 * Детерминированный ГПСЧ xorshift32: один seed — одна последовательность значений [0, 1).
 * Не использует `Math.random`, время и системный генератор.
 */
export function createPatternRandom(seed: number): () => number {
  assertPatternSeed(seed)

  let state = (seed ^ SEED_MIX) >>> 0
  if (state === 0) {
    state = ZERO_STATE_REPLACEMENT
  }

  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return state / 4_294_967_296
  }
}
