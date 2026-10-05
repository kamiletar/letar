import type { PatternConfigV1 } from '../config'
import { createPatternRandom } from '../random'
import { assertElementBudget, getLineWidth, getMinLineWidth, getViewHeight, num, pickColor, VIEW_WIDTH } from './common'

/** Общий бюджет веток на весь рисунок (каждая ветка — путь и кружок на конце). */
const MAX_BRANCHES = 1500

/** Во сколько раз каждая следующая ветка короче предыдущей. */
const LENGTH_FACTOR = 0.72

/** Диапазон отклонения дочерней ветки от направления родителя, градусы. */
const ANGLE_MIN_DEG = 20
const ANGLE_SPAN_DEG = 20

/** Наибольший изгиб конца ветки относительно её направления, радианы (в обе стороны). */
const MAX_BEND = 0.3

interface Branch {
  x: number
  y: number
  angle: number
  length: number
  depth: number
  color: string
}

/** Деревья: корни в случайных точках, ветка делится на две, обход «по уровням» в фиксированном порядке. */
export function generateBranchingElements(config: PatternConfigV1): string[] {
  const random = createPatternRandom(config.seed)
  const viewHeight = getViewHeight(config)
  const rootCount = 2 * config.density
  const initialLength = 40 + 15 * config.scale
  const maxDepth = 3 + config.density
  const baseWidth = getLineWidth(config)
  const minWidth = getMinLineWidth(config)
  const elements: string[] = []

  const queue: Branch[] = []
  for (let root = 0; root < rootCount; root++) {
    queue.push({
      x: random() * VIEW_WIDTH,
      y: random() * viewHeight,
      angle: random() * 2 * Math.PI,
      length: initialLength,
      depth: 0,
      color: pickColor(config, random()),
    })
  }

  let drawn = 0
  // Очередь идёт по уровням: при остановке по бюджету обрезаются самые глубокие ветки всех корней сразу.
  for (let head = 0; head < queue.length && drawn < MAX_BRANCHES; head++) {
    const branch = queue[head]!
    const directionX = Math.cos(branch.angle)
    const directionY = Math.sin(branch.angle)
    const endX = branch.x + directionX * branch.length
    const endY = branch.y + directionY * branch.length

    // Контрольные точки идут вдоль направления; случайный изгиб конца даёт живую кривую.
    const bend = (random() * 2 - 1) * MAX_BEND
    const third = branch.length / 3
    const control1X = branch.x + directionX * third
    const control1Y = branch.y + directionY * third
    const control2X = endX - Math.cos(branch.angle + bend) * third
    const control2Y = endY - Math.sin(branch.angle + bend) * third

    const width = Math.max(minWidth, baseWidth * (1 - 0.07 * branch.depth))
    elements.push(
      `<path d="M${num(branch.x)} ${num(branch.y)}C${num(control1X)} ${num(control1Y)} ${num(control2X)} ${
        num(control2Y)
      } ${num(endX)} ${num(endY)}" fill="none" stroke="${branch.color}" stroke-width="${
        num(width)
      }" stroke-linecap="round"/>`,
    )
    elements.push(
      `<circle cx="${num(endX)}" cy="${num(endY)}" r="${num(width * 1.5)}" fill="${branch.color}"/>`,
    )
    drawn++

    const insideField = endX >= -initialLength && endX <= VIEW_WIDTH + initialLength
      && endY >= -initialLength && endY <= viewHeight + initialLength
    if (!insideField || branch.depth + 1 >= maxDepth) {
      continue
    }

    for (const direction of [-1, 1]) {
      const deviation = ((ANGLE_MIN_DEG + random() * ANGLE_SPAN_DEG) * Math.PI) / 180
      queue.push({
        x: endX,
        y: endY,
        angle: branch.angle + direction * deviation,
        length: branch.length * LENGTH_FACTOR,
        depth: branch.depth + 1,
        color: branch.color,
      })
    }
  }

  assertElementBudget(elements)
  return elements
}
