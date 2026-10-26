import { describe, expect, it } from 'vitest'
import { ENTRY_DURATION, getEntryState, getMatrixFrame, getMatrixMix } from './matrix-scene'

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

describe('вход: переход от букв к меню', () => {
  const recipes = ['абвгдежз', 'すしのつくりかた']
  const zone = { x: 100, y: 200, w: 300, h: 200 }
  const total = (elapsed: number, withZone = true) =>
    getMatrixFrame(11, 960, 600, recipes, false, { elapsed, zone: withZone ? zone : null })
      .reduce((sum, g) => sum + g.opacity, 0)

  it('начинается без видимых букв и завершается спокойной зоной', () => {
    expect(total(0)).toBe(0)
    expect(getEntryState(0).calm).toBe(0)
    expect(getEntryState(ENTRY_DURATION).calm).toBe(1)
    expect(getEntryState(ENTRY_DURATION + 5).calm).toBe(1)
  })

  it('не меняет положение букв, только прозрачность', () => {
    const plain = getMatrixFrame(11, 960, 600, recipes)
    const entered = getMatrixFrame(11, 960, 600, recipes, false, { elapsed: .8, zone })
    for (const g of entered) {
      const base = plain.find((p) => p.id === g.id)
      expect(g.x).toBe(base?.x)
      expect(g.y).toBe(base?.y)
      expect(g.opacity).toBeLessThanOrEqual((base?.opacity ?? 0) + 1e-9)
    }
  })

  it('гасит фон у меню сильнее, чем на периферии, и непрерывно во времени', () => {
    const end = getMatrixFrame(11, 960, 600, recipes, false, { elapsed: ENTRY_DURATION, zone })
    const plain = getMatrixFrame(11, 960, 600, recipes)
    const sum = (list: typeof end, inside: boolean) =>
      list.filter((g) => (g.x > zone.x && g.x < zone.x + zone.w && g.y > zone.y && g.y < zone.y + zone.h) === inside)
        .reduce((acc, g) => acc + g.opacity, 0)
    expect(sum(end, true) / sum(plain, true)).toBeLessThan(.4)
    expect(sum(end, false) / sum(plain, false)).toBeGreaterThan(.85)
    for (let e = 0; e < ENTRY_DURATION; e += .05) {
      expect(Math.abs(total(e + .001) - total(e))).toBeLessThan(total(ENTRY_DURATION) * .02 + .05)
    }
  })

  it('без зоны остаётся только проявление потоков', () => {
    expect(total(ENTRY_DURATION, false)).toBeCloseTo(
      getMatrixFrame(11, 960, 600, recipes).reduce((sum, g) => sum + g.opacity, 0),
      6,
    )
  })
})
