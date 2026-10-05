import type { PatternConfigV1 } from '../config'
import { formatPatternNumber } from '../svg'

/** Ширина системы координат узора: viewBox всегда `0 0 1000 H`. */
export const VIEW_WIDTH = 1000

/** Общий бюджет элементов одного рисунка. */
export const MAX_ELEMENTS = 4000

/** Минимальная физическая толщина линии при печати, мм. */
const MIN_LINE_MM = 0.3

/** Толщина линии по умолчанию в единицах viewBox: достаточно заметная и не тоньше печатного минимума. */
const DEFAULT_LINE_WIDTH = 1.6

/** Высота viewBox для заданных размеров листа. */
export function getViewHeight(config: PatternConfigV1): number {
  return (VIEW_WIDTH * config.heightMm) / config.widthMm
}

/** Минимальная толщина линии в единицах viewBox (0,3 мм на листе). */
export function getMinLineWidth(config: PatternConfigV1): number {
  return (MIN_LINE_MM * VIEW_WIDTH) / config.widthMm
}

/** Базовая толщина линии в единицах viewBox, не меньше печатного минимума. */
export function getLineWidth(config: PatternConfigV1): number {
  return Math.max(DEFAULT_LINE_WIDTH, getMinLineWidth(config))
}

/** Цвет палитры по случайному числу из [0, 1). */
export function pickColor(config: PatternConfigV1, randomValue: number): string {
  const { colors } = config.palette
  return colors[Math.min(colors.length - 1, Math.floor(randomValue * colors.length))]!
}

/** Краткая запись числа для атрибутов SVG. */
export function num(value: number): string {
  return formatPatternNumber(value)
}

/** Ошибка, если алгоритм превысил общий бюджет элементов. */
export function assertElementBudget(elements: readonly string[]): void {
  if (elements.length > MAX_ELEMENTS) {
    throw new Error(`Узор слишком сложный: больше ${MAX_ELEMENTS} элементов`)
  }
}
