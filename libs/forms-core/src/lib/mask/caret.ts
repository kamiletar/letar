import { classifyValue } from './classify-value'
import type { MaskOptions } from './types'

/**
 * Карта допустимых позиций каретки для отформатированного `value`: `true` на
 * позициях 0, `value.length` и рядом с любым input-символом. Позиции строго внутри
 * последовательности литералов (например между `(` и пробелом) недопустимы — иначе
 * каретка может «застрять» там, откуда неясно, что печатать дальше.
 *
 * Переопределяемо через `options.caretBoundary` — нужно числовым форматам
 * (`Field.Currency`), где правило «рядом с input-символом» не подходит.
 */
export function caretBoundary(value: string, mask: string, options?: MaskOptions): boolean[] {
  if (options?.caretBoundary) {
    return options.caretBoundary(value, mask)
  }

  const classes = classifyValue(value, mask, options)
  const n = classes.length
  const boundary = new Array<boolean>(n + 1).fill(false)
  boundary[0] = true
  boundary[n] = true

  for (let i = 0; i < n; i++) {
    if (classes[i].type === 'input') {
      boundary[i] = true
      boundary[i + 1] = true
    }
  }

  return boundary
}
