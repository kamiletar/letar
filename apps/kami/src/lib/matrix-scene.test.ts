import { describe, expect, it } from 'vitest'
import { getMatrixFrame, getMatrixMix } from './matrix-scene'

describe('непрерывный цикл букв A → B → C', () => {
  it('проходит три направления и возвращается к A', () => {
    expect(getMatrixMix(0)).toMatchObject({ from: 'drift', to: 'perspective', amount: 0 })
    expect(getMatrixMix(8)).toMatchObject({ from: 'perspective', to: 'pixels', amount: 0 })
    expect(getMatrixMix(16)).toMatchObject({ from: 'pixels', to: 'drift', amount: 0 })
    expect(getMatrixMix(23).amount).toBeGreaterThan(0)
    expect(getMatrixMix(24)).toEqual(getMatrixMix(0))
  })

  it('сохраняет положение на стыке и непрерывность переходов', () => {
    const recipes = ['абвгдежз', 'すしのつくりかた']
    const frame = (t: number) => getMatrixFrame(t, 960, 600, recipes)
    expect(frame(24)).toEqual(frame(0))
    for (const t of [5.2, 8, 13.2, 16, 21.2, 24]) {
      const before = frame(t - .00001)
      const after = frame(t + .00001)
      // Сравниваем видимые головы потоков; невидимые капли могут сбрасываться за экраном.
      for (const a of before.filter((g) => g.opacity > .05)) {
        const b = after.find((g) => g.id === a.id)
        expect(b).toBeDefined()
        if (b) {
          expect(Math.abs(a.x - b.x)).toBeLessThan(.02)
          expect(Math.abs(a.y - b.y)).toBeLessThan(.02)
          expect(Math.abs(a.opacity - b.opacity)).toBeLessThan(.001)
        }
      }
    }
  })

  it('использует только исходные символы и ограничивает мобильную нагрузку', () => {
    const recipes = ['абвгдежз', 'すしのつくりかた']
    const desktop = getMatrixFrame(11, 1440, 900, recipes)
    const mobile = getMatrixFrame(11, 390, 844, recipes)
    const reduced = getMatrixFrame(11, 390, 844, recipes, true)
    expect(mobile.length).toBeLessThan(desktop.length)
    expect(reduced.length).toBeLessThan(mobile.length)
    for (const glyph of reduced) {
      expect(glyph).toEqual(mobile.find((item) => item.id === glyph.id))
    }
    for (const glyph of desktop) {
      expect(recipes.join('')).toContain(glyph.char)
      expect(Number.isFinite(glyph.x) && Number.isFinite(glyph.y)).toBe(true)
      expect(glyph.opacity).toBeGreaterThanOrEqual(0)
      expect(glyph.opacity).toBeLessThanOrEqual(1)
    }
  })
})
