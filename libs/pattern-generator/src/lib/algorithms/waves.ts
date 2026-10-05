import type { PatternConfigV1 } from '../config'
import { createPatternRandom } from '../random'
import { assertElementBudget, getLineWidth, getViewHeight, num, pickColor, VIEW_WIDTH } from './common'

/** Число отрезков в линии: 101 точка от x=0 до x=1000. */
const SEGMENTS = 100

/** Волнистые линии: у каждой своя фаза и цвет, внутри линии случайности нет — волна связная. */
export function generateWavesElements(config: PatternConfigV1): string[] {
  const random = createPatternRandom(config.seed)
  const viewHeight = getViewHeight(config)
  const lineCount = 8 + 8 * config.density
  const amplitude = 12 + 8 * config.scale
  const periods = 2 + (5 - config.scale)
  const strokeWidth = num(getLineWidth(config))
  const elements: string[] = []

  for (let line = 0; line < lineCount; line++) {
    const baseY = (viewHeight * (line + 0.5)) / lineCount
    const phase = random() * 2 * Math.PI
    const color = pickColor(config, random())
    const points: string[] = []

    for (let index = 0; index <= SEGMENTS; index++) {
      const x = (VIEW_WIDTH * index) / SEGMENTS
      const y = baseY + amplitude * Math.sin(2 * Math.PI * periods * (x / VIEW_WIDTH) + phase)
      points.push(`${num(x)},${num(y)}`)
    }

    elements.push(
      `<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"`
        + ` stroke-linecap="round" stroke-linejoin="round"/>`,
    )
  }

  assertElementBudget(elements)
  return elements
}
