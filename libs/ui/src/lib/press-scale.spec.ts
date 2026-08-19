import { describe, expect, it } from 'vitest'
import { type PressDepth, pressScale } from './press-scale'

/** Порядок шагов от самой мелкой поверхности к самой крупной. */
const ORDER: PressDepth[] = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl']

/** Достаёт число из `scale(0.97)` — тест смотрит на значение, а не на строку. */
function factor(depth: PressDepth): number {
  const match = /^scale\((0\.\d+)\)$/.exec(pressScale[depth])
  if (!match) {
    throw new Error(`шаг «${depth}» не является строкой вида scale(0.xx): ${pressScale[depth]}`)
  }
  return Number(match[1])
}

describe('pressScale', () => {
  it('содержит ровно семь шагов и ни одного лишнего', () => {
    expect(Object.keys(pressScale).sort()).toEqual([...ORDER].sort())
  })

  it('проседание слабеет с ростом поверхности — шкала строго монотонна', () => {
    const factors = ORDER.map(factor)
    for (let i = 1; i < factors.length; i++) {
      expect(factors[i]).toBeGreaterThan(factors[i - 1])
    }
  })

  it('держит проседание в разумных пределах — от 6% до 1%', () => {
    for (const depth of ORDER) {
      expect(factor(depth)).toBeGreaterThanOrEqual(0.94)
      expect(factor(depth)).toBeLessThanOrEqual(0.99)
    }
  })
})
