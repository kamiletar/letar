/**
 * Казахский язык — числительные.
 * Казахский — тюркский язык с агглютинативной морфологией.
 */

const ONES = ['', 'бір', 'екі', 'үш', 'төрт', 'бес', 'алты', 'жеті', 'сегіз', 'тоғыз']
const TENS = ['', 'он', 'жиырма', 'отыз', 'қырық', 'елу', 'алпыс', 'жетпіс', 'сексен', 'тоқсан']
const HUNDREDS_PREFIX = [
  '',
  'жүз',
  'екі жүз',
  'үш жүз',
  'төрт жүз',
  'бес жүз',
  'алты жүз',
  'жеті жүз',
  'сегіз жүз',
  'тоғыз жүз',
]

/** Кардинальное числительное (казахский) */
export function cardinal(n: number): string {
  if (n === 0) return 'нөл'
  if (n < 0) return `минус ${cardinal(-n)}`

  const parts: string[] = []

  if (n >= 1_000_000) {
    const millions = Math.floor(n / 1_000_000)
    parts.push(`${cardinal(millions)} миллион`)
    n %= 1_000_000
  }

  if (n >= 1000) {
    const thousands = Math.floor(n / 1000)
    if (thousands === 1) {
      parts.push('мың')
    } else {
      parts.push(`${cardinal(thousands)} мың`)
    }
    n %= 1000
  }

  if (n >= 100) {
    parts.push(HUNDREDS_PREFIX[Math.floor(n / 100)])
    n %= 100
  }

  if (n >= 10) {
    parts.push(TENS[Math.floor(n / 10)])
    n %= 10
  }

  if (n > 0) {
    parts.push(ONES[n])
  }

  return parts.join(' ')
}

/**
 * Порядковое числительное (казахский).
 * Правило: кардинал + суффикс -ыншы/-інші (гармония гласных).
 * После гласных и звонких согласных: -ыншы/-інші
 * После глухих согласных: -ыншы/-інші
 */
export function ordinal(n: number): string {
  const card = cardinal(n)
  const lastChar = card.at(-1) ?? ''

  // Определяем мягкость по последней гласной
  const softVowels = 'еёиіөүэю'
  const hardVowels = 'аоуұыя'
  const isSoft =
    [...card].reverse().some((ch) => {
      if (softVowels.includes(ch)) return true
      if (hardVowels.includes(ch)) return true
      return false
    }) && [...card].reverse().find((ch) => softVowels.includes(ch) || hardVowels.includes(ch))
      ? softVowels.includes([...card].reverse().find((ch) => softVowels.includes(ch) || hardVowels.includes(ch))!)
      : false

  const vowels = softVowels + hardVowels

  // Если оканчивается на гласную, добавляем -нші/-ншы
  if (vowels.includes(lastChar)) {
    return card + (isSoft ? 'нші' : 'ншы')
  }

  return card + (isSoft ? 'інші' : 'ыншы')
}
