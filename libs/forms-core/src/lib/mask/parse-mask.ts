import { resolveMaskTokens } from './tokens'
import type { MaskOptions, ParsedMask } from './types'

/**
 * Разбирает строку маски в последовательность слотов.
 *
 * DSL: `9`/`a`/`*` (или свой токен из `customTokens`) — позиция ввода, любой другой
 * символ — литерал. `\` экранирует следующий символ (сделать литералом символ токена).
 * `[...]` — необязательный участок (переменная длина хвоста, например регион госномера
 * 2 или 3 цифры).
 */
export function parseMask(mask: string, options?: MaskOptions): ParsedMask {
  const tokens = resolveMaskTokens(options)
  const slots: ParsedMask = []
  let optionalDepth = 0

  for (let i = 0; i < mask.length; i++) {
    const char = mask[i]

    if (char === '\\' && i + 1 < mask.length) {
      i++
      slots.push({ kind: 'literal', char: mask[i] })
      continue
    }

    if (char === '[') {
      optionalDepth++
      continue
    }

    if (char === ']') {
      optionalDepth = Math.max(0, optionalDepth - 1)
      continue
    }

    if (tokens[char]) {
      slots.push({ kind: 'input', token: char, optional: optionalDepth > 0 })
      continue
    }

    slots.push({ kind: 'literal', char })
  }

  return slots
}
