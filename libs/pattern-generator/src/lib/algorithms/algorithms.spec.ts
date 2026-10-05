import { describe, expect, it } from 'vitest'
import { generatePatternSvg, PATTERN_STYLES, type PatternConfigV1 } from '../../index'

const palette = { background: '#F4EFE6', colors: ['#1F3A5F', '#C0504D', '#6B8E23'] }

function makeConfig(patch: Partial<PatternConfigV1> = {}): PatternConfigV1 {
  return {
    version: 1,
    style: 'geometry',
    seed: 2026,
    widthMm: 500,
    heightMm: 500,
    palette,
    density: 3,
    scale: 3,
    ...patch,
  }
}

/** Число графических элементов без корня и фона. */
function countElements(svg: string): number {
  return (svg.match(/<(circle|polygon|polyline|path)\b/g) ?? []).length
}

const sizes = [
  { name: 'квадрат', widthMm: 500, heightMm: 500 },
  { name: 'вертикаль', widthMm: 300, heightMm: 900 },
]

describe.each(PATTERN_STYLES)('стиль %s', (style) => {
  it('одинаковый config даёт побайтно одинаковый SVG', () => {
    const config = makeConfig({ style })
    expect(generatePatternSvg(config)).toBe(generatePatternSvg({ ...config }))
  })

  it('другой seed меняет рисунок', () => {
    expect(generatePatternSvg(makeConfig({ style, seed: 1 }))).not.toBe(
      generatePatternSvg(makeConfig({ style, seed: 2 })),
    )
  })

  it('изменение scale меняет геометрию', () => {
    expect(generatePatternSvg(makeConfig({ style, scale: 1 }))).not.toBe(
      generatePatternSvg(makeConfig({ style, scale: 5 })),
    )
  })

  it('изменение density меняет рисунок', () => {
    expect(generatePatternSvg(makeConfig({ style, density: 1 }))).not.toBe(
      generatePatternSvg(makeConfig({ style, density: 5 })),
    )
  })

  it.each(sizes)('соблюдает пропорции: $name', ({ widthMm, heightMm }) => {
    const svg = generatePatternSvg(makeConfig({ style, widthMm, heightMm }))
    const height = (1000 * heightMm) / widthMm
    expect(svg).toContain(`width="${widthMm}mm"`)
    expect(svg).toContain(`height="${heightMm}mm"`)
    expect(svg).toContain(`viewBox="0 0 1000 ${Number(height.toFixed(3))}"`)
    expect(svg).toContain('overflow="hidden"')
  })

  it('использует только цвета палитры', () => {
    const svg = generatePatternSvg(makeConfig({ style }))
    const allowed = new Set([palette.background, ...palette.colors])
    const used = svg.match(/#[0-9A-F]{6}/g) ?? []
    expect(used.length).toBeGreaterThan(0)
    expect(used.every((color) => allowed.has(color))).toBe(true)
  })

  it('не содержит запрещённых конструкций SVG', () => {
    const svg = generatePatternSvg(makeConfig({ style }))
    expect(svg).not.toMatch(/<script|foreignObject|<image|<use|href|url\(|\bon[a-z]+=|\bid=|font|NaN|Infinity/i)
  })

  it('крайние настройки укладываются в бюджет 4000 элементов', () => {
    const extremes: Partial<PatternConfigV1>[] = [
      { density: 5, scale: 1, widthMm: 3000, heightMm: 3000 },
      { density: 5, scale: 1, widthMm: 100, heightMm: 3000 },
      { density: 5, scale: 1, widthMm: 3000, heightMm: 100 },
      { density: 1, scale: 5, widthMm: 100, heightMm: 100 },
      { density: 5, scale: 5, widthMm: 500, heightMm: 500 },
    ]
    for (const extreme of extremes) {
      const svg = generatePatternSvg(makeConfig({ style, ...extreme }))
      expect(countElements(svg)).toBeLessThanOrEqual(4000)
      expect(countElements(svg)).toBeGreaterThan(0)
    }
  })
})

describe('геометрия', () => {
  it('больше density — больше контуров, а сетка покрывает лист', () => {
    const low = countElements(generatePatternSvg(makeConfig({ density: 1 })))
    const high = countElements(generatePatternSvg(makeConfig({ density: 4 })))
    expect(high).toBeGreaterThan(low)
  })

  it('при перегрузке увеличивает ячейку, а не обрывает рисунок', () => {
    const svg = generatePatternSvg(makeConfig({ density: 5, scale: 1, widthMm: 100, heightMm: 3000 }))
    expect(countElements(svg)).toBeLessThanOrEqual(4000)
    // Самый нижний ряд ячеек доходит до края листа (viewBox высотой 30000).
    const centers = [...svg.matchAll(/(?:cy="|,)(-?\d+(?:\.\d+)?)/g)].map((match) => Number(match[1]))
    expect(Math.max(...centers)).toBeGreaterThan(29000)
  })
})

describe('волны', () => {
  it('число линий растёт с density: 8 + 8 × density', () => {
    for (const density of [1, 3, 5]) {
      const svg = generatePatternSvg(makeConfig({ style: 'waves', density }))
      expect(svg.match(/<polyline/g)).toHaveLength(8 + 8 * density)
    }
  })

  it('каждая линия — 101 точка от x=0 до x=1000', () => {
    const svg = generatePatternSvg(makeConfig({ style: 'waves', density: 1 }))
    const points = svg.match(/<polyline points="([^"]+)"/)![1]!.split(' ')
    expect(points).toHaveLength(101)
    expect(points[0]!.startsWith('0,')).toBe(true)
    expect(points[100]!.startsWith('1000,')).toBe(true)
  })
})

describe('ветвление', () => {
  it('число веток не превышает общий бюджет 1500', () => {
    const svg = generatePatternSvg(makeConfig({ style: 'branching', density: 5, scale: 5 }))
    expect(svg.match(/<path/g)!.length).toBeLessThanOrEqual(1500)
  })

  it('больше density — больше веток', () => {
    const low = generatePatternSvg(makeConfig({ style: 'branching', density: 1 }))
    const high = generatePatternSvg(makeConfig({ style: 'branching', density: 4 }))
    expect(high.match(/<path/g)!.length).toBeGreaterThan(low.match(/<path/g)!.length)
  })
})

describe('generatePatternSvg', () => {
  it('отвергает невалидный config', () => {
    expect(() => generatePatternSvg({ ...makeConfig(), seed: -1 })).toThrow(/Seed/)
    expect(() => generatePatternSvg(null)).toThrow(Error)
  })

  it('минимальная толщина линии не меньше 0,3 мм', () => {
    // 3000 мм: 0,3 мм = 0,1 единицы viewBox, базовая толщина 1,6 выше минимума.
    // 100 мм: 0,3 мм = 3 единицы viewBox, толщина поднимается до минимума.
    const svg = generatePatternSvg(makeConfig({ widthMm: 100, heightMm: 100 }))
    const widths = [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((match) => Number(match[1]))
    expect(Math.min(...widths)).toBeGreaterThanOrEqual(3)
  })
})
