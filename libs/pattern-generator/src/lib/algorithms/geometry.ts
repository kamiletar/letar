import type { PatternConfigV1 } from '../config'
import { createPatternRandom } from '../random'
import { assertElementBudget, getLineWidth, getViewHeight, MAX_ELEMENTS, num, pickColor, VIEW_WIDTH } from './common'

/** Во сколько раз увеличиваем сторону ячейки, пока рисунок не поместится в бюджет. */
const SIDE_GROWTH = 1.1

/** Доля полуширины ячейки, занятая внешним контуром: между соседями остаётся просвет. */
const OUTER_FILL = 0.45

interface GridSize {
  side: number
  columns: number
  rows: number
}

/** Размер сетки: покрывает лист с запасом в одну ячейку за краем, а контуров не больше бюджета. */
function chooseGrid(config: PatternConfigV1, viewHeight: number): GridSize {
  let side = 80 + 30 * (config.scale - 1)
  for (;;) {
    const columns = Math.ceil(VIEW_WIDTH / side) + 1
    const rows = Math.ceil(viewHeight / side) + 1
    if (columns * rows * config.density <= MAX_ELEMENTS) {
      return { side, columns, rows }
    }
    side *= SIDE_GROWTH
  }
}

/** Сетка ячеек: в каждой круг или ромб из вложенных контуров. */
export function generateGeometryElements(config: PatternConfigV1): string[] {
  const random = createPatternRandom(config.seed)
  const viewHeight = getViewHeight(config)
  const { side, columns, rows } = chooseGrid(config, viewHeight)
  const strokeWidth = num(getLineWidth(config))
  const elements: string[] = []

  // Сетка сдвинута на полстороны за границу, поэтому края листа закрыты целыми ячейками.
  const originX = -side / 2
  const originY = -side / 2

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const centerX = originX + (column + 0.5) * side
      const centerY = originY + (row + 0.5) * side
      const isCircle = random() < 0.5
      const color = pickColor(config, random())
      const outerRadius = side * OUTER_FILL

      for (let level = 0; level < config.density; level++) {
        const radius = (outerRadius * (config.density - level)) / config.density
        const common = `fill="none" stroke="${color}" stroke-width="${strokeWidth}"`
        if (isCircle) {
          elements.push(`<circle cx="${num(centerX)}" cy="${num(centerY)}" r="${num(radius)}" ${common}/>`)
        } else {
          const points = [
            [centerX, centerY - radius],
            [centerX + radius, centerY],
            [centerX, centerY + radius],
            [centerX - radius, centerY],
          ]
          elements.push(`<polygon points="${points.map(([x, y]) => `${num(x!)},${num(y!)}`).join(' ')}" ${common}/>`)
        }
      }
    }
  }

  assertElementBudget(elements)
  return elements
}
