import { parseMask } from './parse-mask'
import { resolveMaskTokens } from './tokens'
import type { MaskOptions, MaskPart } from './types'

interface ComputedParts {
  /** Подтверждённая (закоммиченная) часть — то, что вернёт `format()` */
  parts: MaskPart[]
  /** Незаполненный хвост шаблона — literal/placeholder, ещё не подтверждённые вводом */
  pending: MaskPart[]
}

/**
 * Единая раскладка raw-потока символов по слотам маски.
 *
 * Литералы буферизуются в `pending` и переносятся в `parts` только вместе со
 * следующим успешно заполненным input-слотом — поэтому хвост маски без введённых
 * символов не дорисовывается (аналог `clearIncomplete` у imask), а `formatToParts`
 * при этом всё равно может показать этот хвост как подсказку (`filled: false`).
 */
export function computeMaskParts(raw: string, mask: string, options?: MaskOptions): ComputedParts {
  const slots = parseMask(mask, options)
  const tokens = resolveMaskTokens(options)
  const parts: MaskPart[] = []
  let pending: MaskPart[] = []
  let ri = 0

  for (const slot of slots) {
    if (slot.kind === 'literal') {
      pending.push({ type: 'literal', char: slot.char, filled: false })
      continue
    }

    const def = tokens[slot.token]
    let placedChar: string | undefined

    while (ri < raw.length) {
      const char = raw[ri]
      ri++
      if (def.pattern(char)) {
        placedChar = def.transform ? (def.transform(char) ?? char) : char
        break
      }
    }

    if (placedChar !== undefined) {
      pending.push({ type: 'input', char: placedChar, filled: true })
      for (const item of pending) {
        parts.push(item.type === 'literal' ? { ...item, filled: true } : item)
      }
      pending = []
    } else {
      pending.push({ type: 'placeholder', char: slot.token, filled: false })
    }
  }

  return { parts, pending }
}

/**
 * Форматирует raw-поток символов по маске. Хвост без введённых символов не
 * дорисовывается: `format('900', '+7 (999) 999-99-99')` → `'+7 (900'`, не `'+7 (900) '`.
 */
export function format(raw: string, mask: string, options?: MaskOptions): string {
  return computeMaskParts(raw, mask, options).parts.map((part) => part.char).join('')
}

/**
 * Извлекает raw-поток кандидатов из произвольной строки (вставка из буфера,
 * уже отформатированное значение) — символы фильтруются по объединению паттернов
 * всех input-токенов маски, с применением `transform` первого совпавшего токена.
 */
export function unformat(value: string, mask: string, options?: MaskOptions): string {
  const slots = parseMask(mask, options)
  const tokens = resolveMaskTokens(options)
  const tokenChars = [
    ...new Set(slots.filter((slot) => slot.kind === 'input').map((slot) => (slot as { token: string }).token)),
  ]

  let result = ''
  for (const char of value) {
    for (const tokenChar of tokenChars) {
      const def = tokens[tokenChar]
      if (def.pattern(char)) {
        result += def.transform ? (def.transform(char) ?? char) : char
        break
      }
    }
  }
  return result
}

/**
 * Полная разметка шаблона: подтверждённая часть (`format()`) + незаполненный хвост
 * (`filled: false`) — основа для визуальной подсказки формата поверх значения
 * (`aria-hidden`-слой, приём USWDS, см. MASK_ENGINE.md §6.6).
 */
export function formatToParts(raw: string, mask: string, options?: MaskOptions): MaskPart[] {
  const { parts, pending } = computeMaskParts(raw, mask, options)
  return [...parts, ...pending]
}
