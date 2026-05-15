/**
 * Туркменский язык — числительные.
 * Туркменский — тюркский язык с гармонией гласных.
 */

const ONES = ['', 'bir', 'iki', 'üç', 'dört', 'bäş', 'alty', 'ýedi', 'sekiz', 'dokuz']
const TENS = ['', 'on', 'ýigrimi', 'otuz', 'kyrk', 'elli', 'altmyş', 'ýetmiş', 'segsen', 'togsan']
const HUNDREDS_PREFIX = [
  '',
  'ýüz',
  'iki ýüz',
  'üç ýüz',
  'dört ýüz',
  'bäş ýüz',
  'alty ýüz',
  'ýedi ýüz',
  'sekiz ýüz',
  'dokuz ýüz',
]

/** Кардинальное числительное (туркменский) */
export function cardinal(n: number): string {
  if (n === 0) return 'nol'
  if (n < 0) return `minus ${cardinal(-n)}`

  const parts: string[] = []

  if (n >= 1_000_000) {
    const millions = Math.floor(n / 1_000_000)
    parts.push(`${cardinal(millions)} million`)
    n %= 1_000_000
  }

  if (n >= 1000) {
    const thousands = Math.floor(n / 1000)
    if (thousands === 1) {
      parts.push('müň')
    } else {
      parts.push(`${cardinal(thousands)} müň`)
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
 * Порядковое числительное (туркменский).
 * Правило: кардинал + суффикс -inji/-ynjy/-ünji/-unjy (гармония гласных).
 */
export function ordinal(n: number): string {
  const card = cardinal(n)
  const lastChar = card.at(-1) ?? ''

  const frontVowels = 'äeiöü'
  const backVowels = 'aouy'
  const allVowels = frontVowels + backVowels

  const lastVowel = [...card].reverse().find((ch) => allVowels.includes(ch))
  const isFront = lastVowel ? frontVowels.includes(lastVowel) : false
  const isRounded = lastVowel ? 'öüou'.includes(lastVowel) : false

  let suffix: string
  if (isFront) {
    suffix = isRounded ? 'ünji' : 'inji'
  } else {
    suffix = isRounded ? 'unjy' : 'ynjy'
  }

  if (allVowels.includes(lastChar)) {
    // Убираем последнюю гласную перед суффиксом
    return card.slice(0, -1) + suffix
  }

  return card + suffix
}
