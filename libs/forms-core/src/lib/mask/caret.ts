import { parseMask } from './parse-mask'
import type { MaskOptions } from './types'

/**
 * Классифицирует символы уже отформатированного `value` (продукта `format()`) как
 * `'input'`/`'literal'`, идя по слотам маски и потребляя по одному символу `value`
 * на слот. `value` предполагается построенным этим же движком — литералы совпадают
 * с маской позиционно.
 */
function classifyFormattedValue(value: string, mask: string, options?: MaskOptions): Array<'input' | 'literal'> {
  const slots = parseMask(mask, options)
  const classes: Array<'input' | 'literal'> = []
  let vi = 0

  for (const slot of slots) {
    if (vi >= value.length) {
      break
    }
    if (slot.kind === 'literal') {
      if (value[vi] === slot.char) {
        classes.push('literal')
        vi++
      }
      continue
    }
    classes.push('input')
    vi++
  }

  return classes
}

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

  const classes = classifyFormattedValue(value, mask, options)
  const n = classes.length
  const boundary = new Array<boolean>(n + 1).fill(false)
  boundary[0] = true
  boundary[n] = true

  for (let i = 0; i < n; i++) {
    if (classes[i] === 'input') {
      boundary[i] = true
      boundary[i + 1] = true
    }
  }

  return boundary
}
