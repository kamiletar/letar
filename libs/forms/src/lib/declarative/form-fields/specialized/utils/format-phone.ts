/**
 * Форматирование телефона чистым JS (без сторонней mask-библиотеки).
 *
 * Причина: `use-mask-input` (imask) мутирует DOM-элемент напрямую в обход React —
 * это конфликтует с controlled `value` при быстром посимвольном вводе в WebKit
 * (Playwright `pressSequentially`), тесты `dsperevod-e2e` падали только там.
 * Тот же паттерн (форматирование на каждый onChange без DOM-мутаций) уже используется
 * в `credit-card-field.tsx` и работает во всех браузерах.
 */

/** Оставляет только цифры */
export function stripPhoneNumber(value: string): string {
  return value.replace(/\D/g, '')
}

/** Число плейсхолдеров ('9') в маске */
export function countPhoneMaskDigits(mask: string): number {
  return (mask.match(/9/g) ?? []).length
}

/**
 * Цифры маски-литерала перед первым плейсхолдером ('9').
 *
 * Пример: маска `+7 (999) 999-99-99` → `"7"` (код страны вшит в маску литералом,
 * не плейсхолдером).
 */
function leadingLiteralDigits(mask: string): string {
  let result = ''
  for (const char of mask) {
    if (char === '9') break
    if (char >= '0' && char <= '9') result += char
  }
  return result
}

/**
 * Форматирует сырые цифры по маске (`9` — плейсхолдер цифры, всё остальное — литерал).
 *
 * Хвост маски без введённых цифр не дорисовывается (аналог `clearIncomplete` у imask) —
 * при неполном вводе получаем `+7 (900` вместо `+7 (900) ___-__-__`.
 *
 * Если `rawDigits` начинается с литеральных цифр маски (например код страны "7",
 * повторно попавший в цифры при переформатировании уже отображённого значения на
 * каждый keystroke) — эти цифры пропускаются, а не занимают первый плейсхолдер.
 */
export function formatPhoneNumber(rawDigits: string, mask: string): string {
  if (!rawDigits) return ''

  const literal = leadingLiteralDigits(mask)
  const digits = literal && rawDigits.startsWith(literal) ? rawDigits.slice(literal.length) : rawDigits

  let result = ''
  let digitIndex = 0
  for (const char of mask) {
    if (digitIndex >= digits.length) break
    if (char === '9') {
      result += digits[digitIndex]
      digitIndex++
    } else {
      result += char
    }
  }
  return result
}
