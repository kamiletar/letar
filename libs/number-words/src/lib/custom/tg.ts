/**
 * Таджикский язык — числительные.
 * Таджикский — иранский язык, близок к персидскому (фарси).
 * Использует кириллицу.
 */

const ONES = ['', 'як', 'ду', 'се', 'чор', 'панҷ', 'шаш', 'ҳафт', 'ҳашт', 'нӯҳ']
const TENS = ['', 'даҳ', 'бист', 'сӣ', 'чил', 'панҷоҳ', 'шаст', 'ҳафтод', 'ҳаштод', 'навад']
const HUNDREDS_PREFIX = ['', 'сад', 'дусад', 'сесад', 'чорсад', 'панҷсад', 'шашсад', 'ҳафтсад', 'ҳаштсад', 'нӯҳсад']

/** Кардинальное числительное (таджикский) */
export function cardinal(n: number): string {
  if (n === 0) { return 'сифр' }
  if (n < 0) { return `минус ${cardinal(-n)}` }

  const parts: string[] = []

  if (n >= 1_000_000) {
    const millions = Math.floor(n / 1_000_000)
    parts.push(`${cardinal(millions)} миллион`)
    n %= 1_000_000
  }

  if (n >= 1000) {
    const thousands = Math.floor(n / 1000)
    if (thousands === 1) {
      parts.push('ҳазор')
    } else {
      parts.push(`${cardinal(thousands)} ҳазор`)
    }
    n %= 1000
  }

  if (n >= 100) {
    parts.push(HUNDREDS_PREFIX[Math.floor(n / 100)])
    n %= 100
  }

  if (n >= 10) {
    const ten = Math.floor(n / 10)
    const one = n % 10
    if (one === 0) {
      parts.push(TENS[ten])
    } else {
      parts.push(`${TENS[ten]} ва ${ONES[one]}`)
    }
    n = 0
  }

  if (n > 0) {
    parts.push(ONES[n])
  }

  return parts.join(' ва ')
}

/**
 * Порядковое числительное (таджикский).
 * Правило: кардинал + суффикс -ум (як → якум, ду → дуюм).
 * Исключения: якум, дуюм, сеюм.
 */
export function ordinal(n: number): string {
  if (n === 1) { return 'якум' }
  if (n === 2) { return 'дуюм' }
  if (n === 3) { return 'сеюм' }

  const card = cardinal(n)
  const lastChar = card.at(-1) ?? ''
  const vowels = 'аеиоуӣӯ'

  if (vowels.includes(lastChar)) {
    return card + 'юм'
  }
  return card + 'ум'
}
