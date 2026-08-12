import { parseMask } from './parse-mask'
import type { MaskOptions, MaskPart } from './types'

/**
 * Классифицирует символы уже отформатированного `value` (продукта `format()`) как
 * `'input'`/`'literal'`, идя по слотам маски и потребляя ровно один символ `value` на
 * слот — позиционно, а не через паттерн токена.
 *
 * ⚠️ Это НЕ то же самое, что прогнать `value` через `computeMaskParts` как raw-поток
 * (см. `format()`/`unformat()`): маска может содержать литеральные ЦИФРЫ (код страны
 * «7» в «+7 (999)…»), которые сами по себе проходят паттерн токена `9`. Раскладка
 * value «как raw» в таком случае съедает эту литеральную цифру как будто она введена
 * пользователем и сдвигает всё остальное — баг, пойманный живой проверкой в браузере
 * при Backspace в уже заполненном номере телефона (Фаза 8, Этап 2). Позиционный обход
 * (символ value ↔ слот маски один-к-одному) от этого не страдает: литерал классифицируется
 * литералом независимо от того, что могло бы совпасть с паттерном.
 */
export function classifyValue(value: string, mask: string, options?: MaskOptions): MaskPart[] {
  const slots = parseMask(mask, options)
  const parts: MaskPart[] = []
  let vi = 0

  for (const slot of slots) {
    if (vi >= value.length) {
      break
    }
    if (slot.kind === 'literal') {
      if (value[vi] === slot.char) {
        parts.push({ type: 'literal', char: slot.char, filled: true })
        vi++
      }
      continue
    }
    parts.push({ type: 'input', char: value[vi], filled: true })
    vi++
  }

  return parts
}
