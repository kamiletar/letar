/**
 * Кыргызский язык — числительные.
 * Кыргызский — тюркский язык, близок к казахскому.
 */

const ONES = ['', 'бир', 'эки', 'үч', 'төрт', 'беш', 'алты', 'жети', 'сегиз', 'тогуз']
const TENS = ['', 'он', 'жыйырма', 'отуз', 'кырк', 'элүү', 'алтымыш', 'жетимиш', 'сексен', 'токсон']
const HUNDREDS_PREFIX = [
  '',
  'жүз',
  'эки жүз',
  'үч жүз',
  'төрт жүз',
  'беш жүз',
  'алты жүз',
  'жети жүз',
  'сегиз жүз',
  'тогуз жүз',
]

/** Кардинальное числительное (кыргызский) */
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
      parts.push('миң')
    } else {
      parts.push(`${cardinal(thousands)} миң`)
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
 * Порядковое числительное (кыргызский).
 * Правило: кардинал + суффикс -инчи/-ынчы (гармония гласных).
 */
export function ordinal(n: number): string {
  const card = cardinal(n)
  const lastChar = card.at(-1) ?? ''

  const softVowels = 'еиөүэ'
  const hardVowels = 'аоуы'
  const allVowels = softVowels + hardVowels

  // Определяем мягкость/твёрдость по последней гласной в слове
  const lastVowel = [...card].reverse().find((ch) => allVowels.includes(ch))
  const isSoft = lastVowel ? softVowels.includes(lastVowel) : false

  if (allVowels.includes(lastChar)) {
    return card + (isSoft ? 'нчү' : 'нчы')
  }

  return card + (isSoft ? 'инчи' : 'ынчы')
}
