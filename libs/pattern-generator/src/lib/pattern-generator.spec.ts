import { describe, expect, it } from 'vitest'
import { createPatternRandom, createPatternSvg, formatPatternNumber, parsePatternConfig } from '../index'

const validConfig = {
  version: 1,
  style: 'waves',
  seed: 42,
  widthMm: 500,
  heightMm: 700,
  palette: { background: '#f5f0e8', colors: ['#1a2b3c', '#aabbcc'] },
  density: 3,
  scale: 2,
}

function take(random: () => number, count: number): number[] {
  return Array.from({ length: count }, () => random())
}

describe('createPatternRandom', () => {
  it('повторный запуск с тем же seed даёт ту же последовательность', () => {
    expect(take(createPatternRandom(123), 50)).toEqual(take(createPatternRandom(123), 50))
  })

  it('разные seed дают разные последовательности', () => {
    expect(take(createPatternRandom(1), 10)).not.toEqual(take(createPatternRandom(2), 10))
  })

  it('граничные seed (0 и максимум) не зацикливаются и не вырождаются', () => {
    for (const seed of [0, 4_294_967_295, 0x9e3779b9]) {
      const values = take(createPatternRandom(seed), 100)
      expect(new Set(values).size).toBeGreaterThan(95)
    }
  })

  it('значения лежат в [0, 1) на 1000 вызовах', () => {
    const values = take(createPatternRandom(7), 1000)
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true)
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    expect(mean).toBeGreaterThan(0.4)
    expect(mean).toBeLessThan(0.6)
  })

  it('отвергает невалидный seed', () => {
    for (const seed of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 4_294_967_296, '5' as unknown as number]) {
      expect(() => createPatternRandom(seed)).toThrow(/Seed/)
    }
  })
})

describe('parsePatternConfig', () => {
  it('нормализует цвета в верхний регистр и отсекает неизвестные поля', () => {
    const parsed = parsePatternConfig({ ...validConfig, extra: 'x', palette: { ...validConfig.palette, extra: 1 } })
    expect(parsed.palette).toEqual({ background: '#F5F0E8', colors: ['#1A2B3C', '#AABBCC'] })
    expect(parsed).not.toHaveProperty('extra')
    expect(parsed.palette).not.toHaveProperty('extra')
  })

  it('возвращает JSON-совместимый объект', () => {
    const parsed = parsePatternConfig(validConfig)
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed)
  })

  it.each([
    ['размер меньше минимума', { widthMm: 99 }],
    ['размер больше максимума', { heightMm: 3001 }],
    ['дробный размер', { widthMm: 500.5 }],
    ['дробный seed', { seed: 1.2 }],
    ['NaN в seed', { seed: Number.NaN }],
    ['Infinity в размере', { widthMm: Number.POSITIVE_INFINITY }],
    ['плотность вне диапазона', { density: 6 }],
    ['масштаб вне диапазона', { scale: 0 }],
    ['неизвестный стиль', { style: 'noise' }],
    ['неизвестная версия', { version: 2 }],
    ['слишком длинная палитра', {
      palette: { background: '#000000', colors: ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666'] },
    }],
    ['слишком короткая палитра', { palette: { background: '#000000', colors: ['#111111'] } }],
    ['инъекция в цвет фона', { palette: { background: '#000000" onload="x', colors: ['#111111', '#222222'] } }],
    ['инъекция в цвет узора', { palette: { background: '#000000', colors: ['#111111', 'red;fill:url(#a)'] } }],
    ['короткая запись цвета', { palette: { background: '#000', colors: ['#111111', '#222222'] } }],
  ])('отвергает: %s', (_name, patch) => {
    expect(() => parsePatternConfig({ ...validConfig, ...patch })).toThrow(Error)
  })

  it('отвергает не-объекты', () => {
    for (const value of [null, undefined, 5, 'x', [], () => ({})]) {
      expect(() => parsePatternConfig(value)).toThrow(/объект/)
    }
  })
})

describe('formatPatternNumber', () => {
  it('округляет до трёх знаков, убирает хвостовые нули и -0', () => {
    expect(formatPatternNumber(1.23456)).toBe('1.235')
    expect(formatPatternNumber(2)).toBe('2')
    expect(formatPatternNumber(2.5)).toBe('2.5')
    expect(formatPatternNumber(-0)).toBe('0')
    expect(formatPatternNumber(-0.0001)).toBe('0')
    expect(formatPatternNumber(-1.5)).toBe('-1.5')
    expect(formatPatternNumber(100)).toBe('100')
  })

  it('не использует запятую и экспоненту', () => {
    expect(formatPatternNumber(0.000001)).toBe('0')
    expect(formatPatternNumber(1_000_000.1)).toBe('1000000.1')
  })

  it('отвергает NaN и Infinity', () => {
    expect(() => formatPatternNumber(Number.NaN)).toThrow(Error)
    expect(() => formatPatternNumber(Number.POSITIVE_INFINITY)).toThrow(Error)
    expect(() => formatPatternNumber(Number.NEGATIVE_INFINITY)).toThrow(Error)
  })
})

describe('createPatternSvg', () => {
  const config = parsePatternConfig(validConfig)

  it('держит физический размер и пропорции viewBox', () => {
    const svg = createPatternSvg(config, ['<circle cx="500" cy="500" r="10" fill="#1A2B3C"/>'])
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('width="500mm"')
    expect(svg).toContain('height="700mm"')
    expect(svg).toContain('viewBox="0 0 1000 1400"')
    expect(svg).toContain('fill="#F5F0E8"')
    expect(svg).toContain('<circle')
  })

  it('высота viewBox пропорциональна размерам', () => {
    const wide = createPatternSvg({ ...config, widthMm: 300, heightMm: 100 }, [])
    expect(wide).toContain('viewBox="0 0 1000 333.333"')
  })

  it('одинаковые данные дают одинаковый SVG', () => {
    const elements = ['<rect x="1" y="2" width="3" height="4" fill="#1A2B3C"/>']
    expect(createPatternSvg(config, elements)).toBe(createPatternSvg(config, elements))
  })

  it('не содержит случайных id', () => {
    expect(createPatternSvg(config, [])).not.toMatch(/\bid=/)
  })

  it.each([
    '<script>alert(1)</script>',
    '<foreignObject></foreignObject>',
    '<image href="http://x/y.png"/>',
    '<rect onclick="x()"/>',
    '<rect fill="url(#a)"/>',
    '<rect id="a"/>',
    '<a xlink:href="x"/>',
    '<text>слово</text>',
  ])('отвергает опасный элемент: %s', (element) => {
    expect(() => createPatternSvg(config, [element])).toThrow(/запрещённую/)
  })

  it('перепроверяет конфиг и отвергает невалидный', () => {
    expect(() => createPatternSvg({ ...config, widthMm: 50 }, [])).toThrow(Error)
  })
})
