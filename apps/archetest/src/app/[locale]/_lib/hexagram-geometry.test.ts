import { describe, expect, it } from 'vitest'
import type { PersonalityTypeCode } from '../_data/personality-types'
import {
  computeHexagramGeometry,
  DEFAULT_SIZE,
  MIN_RADIUS_RATIO,
  polygonArea,
  polygonIntersection,
} from './hexagram-geometry'

/** Баллы с нулями по 8 шкалам гексаграммы + переопределения */
function scores(overrides: Partial<Record<PersonalityTypeCode, number>>): Partial<Record<PersonalityTypeCode, number>> {
  return { HUM: 0, KAN: 0, FAI: 0, MAC: 0, NAR: 0, ANT: 0, SAD: 0, MAS: 0, ...overrides }
}

/** Полная гексаграмма: все 6 вершин на максимуме */
const FULL = scores({ HUM: 100, KAN: 100, FAI: 100, MAC: 100, NAR: 100, ANT: 100 })

describe('computeHexagramGeometry', () => {
  const size = DEFAULT_SIZE
  const cx = size / 2
  const cy = size / 2

  it('не мутирует входной объект', () => {
    const input = scores({ HUM: 80, MAC: 40 })
    const copy = { ...input }
    computeHexagramGeometry(input)
    expect(input).toEqual(copy)
  })

  it('порядок вершин: Свет [HUM, KAN, FAI], Тень [ANT, NAR, MAC]', () => {
    const g = computeHexagramGeometry(FULL)
    expect(g.light.map((v) => v.code)).toEqual(['HUM', 'KAN', 'FAI'])
    expect(g.dark.map((v) => v.code)).toEqual(['ANT', 'NAR', 'MAC'])
  })

  it('HUM — пик вверх (x = cx, y < cy), ANT — пик вниз', () => {
    const g = computeHexagramGeometry(FULL)
    const hum = g.light[0]!.point
    const ant = g.dark[0]!.point
    expect(hum.x).toBeCloseTo(cx, 6)
    expect(hum.y).toBeLessThan(cy)
    expect(ant.x).toBeCloseTo(cx, 6)
    expect(ant.y).toBeGreaterThan(cy)
  })

  it('KAN слева от центра, FAI справа — зеркально при равных баллах', () => {
    const g = computeHexagramGeometry(FULL)
    const kan = g.light[1]!.point
    const fai = g.light[2]!.point
    expect(kan.x).toBeLessThan(cx)
    expect(fai.x).toBeGreaterThan(cx)
    expect(kan.x - cx).toBeCloseTo(-(fai.x - cx), 6)
    expect(kan.y).toBeCloseTo(fai.y, 6)
  })

  it('балл 0 не схлопывает вершину в центр — держит минимальный радиус', () => {
    const g = computeHexagramGeometry(scores({}))
    for (const v of [...g.light, ...g.dark]) {
      const dist = Math.hypot(v.point.x - cx, v.point.y - cy)
      expect(dist).toBeGreaterThan(0)
      expect(dist).toBeCloseTo(g.maxRadius * MIN_RADIUS_RATIO, 6)
    }
  })

  it('все вершины в пределах viewBox', () => {
    const g = computeHexagramGeometry(FULL)
    for (const v of [...g.light, ...g.dark]) {
      expect(v.point.x).toBeGreaterThanOrEqual(0)
      expect(v.point.x).toBeLessThanOrEqual(size)
      expect(v.point.y).toBeGreaterThanOrEqual(0)
      expect(v.point.y).toBeLessThanOrEqual(size)
    }
  })

  describe('S-вектор (центр тяжести)', () => {
    it('симметричный профиль → S-вектор в центре', () => {
      const g = computeHexagramGeometry(FULL)
      expect(g.sVector.x).toBeCloseTo(cx, 6)
      expect(g.sVector.y).toBeCloseTo(cy, 6)
    })

    it('высокий MAC (право-верх) смещает S-вектор вправо и вверх', () => {
      const g = computeHexagramGeometry(scores({ MAC: 100 }))
      expect(g.sVector.x).toBeGreaterThan(cx)
      expect(g.sVector.y).toBeLessThan(cy)
    })
  })

  describe('метка «Конструктивный Архитектор» (MAC + KAN)', () => {
    it('высокие MAC и KAN → true', () => {
      const g = computeHexagramGeometry(scores({ MAC: 70, KAN: 65 }))
      expect(g.isConstructiveArchitect).toBe(true)
    })

    it('только MAC или только KAN → false', () => {
      expect(computeHexagramGeometry(scores({ MAC: 90 })).isConstructiveArchitect).toBe(false)
      expect(computeHexagramGeometry(scores({ KAN: 90 })).isConstructiveArchitect).toBe(false)
    })
  })

  describe('аура SAD/MAS (внешнее кольцо)', () => {
    it('нормализует баллы в интенсивность 0..1', () => {
      const g = computeHexagramGeometry(scores({ SAD: 80, MAS: 25 }))
      expect(g.aura.sad).toBeCloseTo(0.8, 6)
      expect(g.aura.mas).toBeCloseTo(0.25, 6)
    })

    it('отсутствующие шкалы → интенсивность 0', () => {
      const g = computeHexagramGeometry({ HUM: 50 })
      expect(g.aura.sad).toBe(0)
      expect(g.aura.mas).toBe(0)
    })
  })

  describe('индекс интеграции (площадь пересечения, метафора)', () => {
    it('полная гексаграмма → Jaccard ровно 0.5 (шестиугольник = 2/3 треугольника)', () => {
      const g = computeHexagramGeometry(FULL)
      expect(g.integrationIndex).toBeCloseTo(0.5, 6)
    })

    it('только Свет высокий, Тень на полу → индекс мал', () => {
      const g = computeHexagramGeometry(scores({ HUM: 100, KAN: 100, FAI: 100 }))
      expect(g.integrationIndex).toBeLessThan(0.1)
    })

    it('индекс в диапазоне [0, 1]', () => {
      const g = computeHexagramGeometry(scores({ HUM: 30, KAN: 70, FAI: 10, MAC: 90, NAR: 5, ANT: 55 }))
      expect(g.integrationIndex).toBeGreaterThanOrEqual(0)
      expect(g.integrationIndex).toBeLessThanOrEqual(1)
    })
  })
})

describe('полигональная геометрия (вспомогательные функции)', () => {
  it('polygonArea: единичный квадрат = 1 (независимо от ориентации)', () => {
    const sq = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]
    expect(polygonArea(sq)).toBeCloseTo(1, 9)
    expect(polygonArea([...sq].reverse())).toBeCloseTo(1, 9)
  })

  it('polygonIntersection: два квадрата с перекрытием 1×1', () => {
    const a = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ]
    const b = [
      { x: 1, y: 1 },
      { x: 3, y: 1 },
      { x: 3, y: 3 },
      { x: 1, y: 3 },
    ]
    expect(polygonArea(polygonIntersection(a, b))).toBeCloseTo(1, 9)
  })

  it('polygonIntersection: непересекающиеся полигоны → пустой результат', () => {
    const a = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]
    const b = [
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
    ]
    expect(polygonArea(polygonIntersection(a, b))).toBe(0)
  })
})
