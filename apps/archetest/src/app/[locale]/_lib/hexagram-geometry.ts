/**
 * Геометрия гексаграммы (Шатконы) — этап 5.2.
 *
 * Чистые функции расчёта SVG-координат из нормализованных баллов (0–100):
 * два встречных треугольника (Светлая триада вершиной вверх, Тёмная — вниз),
 * S-вектор (центр тяжести), интенсивность ауры SAD/MAS и «индекс интеграции» —
 * доля площади пересечения (Jaccard). Индекс — визуальная МЕТАФОРА, не
 * психометрическая метрика: площадь зависит от масштабирования осей.
 *
 * Оси через каждые 60°: HUM 90°, MAC 30°, FAI 330°, ANT 270°, KAN 210°, NAR 150°
 * (математические углы; в SVG y растёт вниз, преобразование в toPoint).
 */
import type { PersonalityTypeCode } from '../_data/personality-types'
import { HIGH_THRESHOLD } from './interpretation-rules'

export interface Point {
  x: number
  y: number
}

/** Вершина треугольника: шкала, её балл и SVG-координата */
export interface HexagramVertex {
  code: PersonalityTypeCode
  value: number
  point: Point
}

export interface HexagramGeometry {
  /** Треугольник Света: [HUM (пик вверх), KAN (лево-база), FAI (право-база)] */
  light: HexagramVertex[]
  /** Треугольник Тени: [ANT/PSY (пик вниз), NAR (лево-верх), MAC (право-верх)] */
  dark: HexagramVertex[]
  /** Центр тяжести шести вершин — S-вектор */
  sVector: Point
  /** Доля пересечения треугольников (Jaccard, 0..1) — визуальная метафора */
  integrationIndex: number
  /** Полигон пересечения — для заливки «зоны интеграции» в SVG */
  intersectionPolygon: Point[]
  /** Высокие MAC и KAN — смещение S-вектора → метка «Конструктивный Архитектор» */
  isConstructiveArchitect: boolean
  /** Интенсивность внешнего кольца-ауры, 0..1 */
  aura: { sad: number; mas: number }
  /** Максимальный радиус вершин (для рендера сетки и кольца ауры) */
  maxRadius: number
  /** Центр гексаграммы */
  center: Point
}

/** Сторона viewBox по умолчанию (квадрат) */
export const DEFAULT_SIZE = 400
/** Доля размера под максимальный радиус вершин (остальное — кольцо ауры и подписи) */
export const RADIUS_RATIO = 0.38
/** Минимальный радиус вершины при балле 0 — треугольник не схлопывается в точку */
export const MIN_RADIUS_RATIO = 0.08

/** Математические углы осей (градусы): порядок соответствует light/dark */
const LIGHT_ANGLES = { HUM: 90, KAN: 210, FAI: 330 } as const
const DARK_ANGLES = { ANT: 270, NAR: 150, MAC: 30 } as const

/**
 * Рассчитать геометрию гексаграммы из нормализованных баллов (0–100).
 * Вход НЕ мутируется; отсутствующие шкалы считаются нулём.
 */
export function computeHexagramGeometry(
  scores: Partial<Record<PersonalityTypeCode, number>>,
  size: number = DEFAULT_SIZE
): HexagramGeometry {
  const center: Point = { x: size / 2, y: size / 2 }
  const maxRadius = size * RADIUS_RATIO
  const minRadius = maxRadius * MIN_RADIUS_RATIO

  const value = (code: PersonalityTypeCode) => clamp(scores[code] ?? 0, 0, 100)

  const toVertex = (code: PersonalityTypeCode, angleDeg: number): HexagramVertex => {
    const v = value(code)
    const radius = Math.max(minRadius, (v / 100) * maxRadius)
    return { code, value: v, point: toPoint(center, radius, angleDeg) }
  }

  const light = (Object.entries(LIGHT_ANGLES) as [PersonalityTypeCode, number][]).map(([code, a]) => toVertex(code, a))
  const dark = (Object.entries(DARK_ANGLES) as [PersonalityTypeCode, number][]).map(([code, a]) => toVertex(code, a))

  const vertices = [...light, ...dark].map((v) => v.point)
  const sVector: Point = {
    x: vertices.reduce((s, p) => s + p.x, 0) / vertices.length,
    y: vertices.reduce((s, p) => s + p.y, 0) / vertices.length,
  }

  const lightPoly = light.map((v) => v.point)
  const darkPoly = dark.map((v) => v.point)
  const intersectionPolygon = polygonIntersection(lightPoly, darkPoly)
  const intersectArea = polygonArea(intersectionPolygon)
  const unionArea = polygonArea(lightPoly) + polygonArea(darkPoly) - intersectArea
  const integrationIndex = unionArea > 0 ? intersectArea / unionArea : 0

  return {
    light,
    dark,
    sVector,
    integrationIndex,
    intersectionPolygon,
    isConstructiveArchitect: value('MAC') >= HIGH_THRESHOLD && value('KAN') >= HIGH_THRESHOLD,
    aura: { sad: value('SAD') / 100, mas: value('MAS') / 100 },
    maxRadius,
    center,
  }
}

/** Точка на окружности: математический угол → SVG-координаты (y вниз) */
function toPoint(center: Point, radius: number, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: center.x + radius * Math.cos(rad),
    y: center.y - radius * Math.sin(rad),
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Площадь полигона (shoelace), всегда неотрицательная */
export function polygonArea(polygon: Point[]): number {
  if (polygon.length < 3) {
    return 0
  }
  let sum = 0
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!
    const b = polygon[(i + 1) % polygon.length]!
    sum += a.x * b.y - b.x * a.y
  }
  return Math.abs(sum) / 2
}

/** Ориентированная (знаковая) площадь ×2 — для определения обхода */
function signedArea2(polygon: Point[]): number {
  let sum = 0
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!
    const b = polygon[(i + 1) % polygon.length]!
    sum += a.x * b.y - b.x * a.y
  }
  return sum
}

/** Привести полигон к обходу против часовой стрелки (CCW в математических координатах) */
function toCCW(polygon: Point[]): Point[] {
  return signedArea2(polygon) < 0 ? [...polygon].reverse() : polygon
}

/**
 * Пересечение двух ВЫПУКЛЫХ полигонов (Sutherland–Hodgman).
 * Треугольники гексаграммы всегда выпуклы. Пустое пересечение → [].
 */
export function polygonIntersection(subjectPoly: Point[], clipPoly: Point[]): Point[] {
  let output = toCCW(subjectPoly)
  const clip = toCCW(clipPoly)

  for (let i = 0; i < clip.length; i++) {
    if (output.length === 0) {
      return []
    }
    const edgeA = clip[i]!
    const edgeB = clip[(i + 1) % clip.length]!
    const input = output
    output = []

    for (let j = 0; j < input.length; j++) {
      const current = input[j]!
      const prev = input[(j + input.length - 1) % input.length]!
      const currentInside = isInside(edgeA, edgeB, current)
      const prevInside = isInside(edgeA, edgeB, prev)

      if (currentInside) {
        if (!prevInside) {
          output.push(lineIntersection(prev, current, edgeA, edgeB))
        }
        output.push(current)
      } else if (prevInside) {
        output.push(lineIntersection(prev, current, edgeA, edgeB))
      }
    }
  }
  return output
}

/** Точка слева от направленного ребра a→b (для CCW-полигона «слева» = внутри) */
function isInside(a: Point, b: Point, p: Point): boolean {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= 0
}

/** Точка пересечения прямых (p1,p2) и (p3,p4) */
function lineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point {
  const d1 = { x: p2.x - p1.x, y: p2.y - p1.y }
  const d2 = { x: p4.x - p3.x, y: p4.y - p3.y }
  const denom = d1.x * d2.y - d1.y * d2.x
  // Параллельные прямые в клиппинге выпуклых полигонов сюда не попадают,
  // но защищаемся от деления на ноль
  if (denom === 0) {
    return p2
  }
  const t = ((p3.x - p1.x) * d2.y - (p3.y - p1.y) * d2.x) / denom
  return { x: p1.x + t * d1.x, y: p1.y + t * d1.y }
}
