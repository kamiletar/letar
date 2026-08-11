/**
 * Русский язык — числительные.
 * Кастомная реализация из-за багов в to-words:
 * - нет женского рода для "тысяча" (две, а не два)
 * - неправильные формы plural (тысяча/тысячи/тысяч)
 * - нет порядковых числительных
 */

const ONES_M = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять']
const ONES_F = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять']
const TEENS = [
  'десять',
  'одиннадцать',
  'двенадцать',
  'тринадцать',
  'четырнадцать',
  'пятнадцать',
  'шестнадцать',
  'семнадцать',
  'восемнадцать',
  'девятнадцать',
]
const TENS = [
  '',
  'десять',
  'двадцать',
  'тридцать',
  'сорок',
  'пятьдесят',
  'шестьдесят',
  'семьдесят',
  'восемьдесят',
  'девяносто',
]
const HUNDREDS = [
  '',
  'сто',
  'двести',
  'триста',
  'четыреста',
  'пятьсот',
  'шестьсот',
  'семьсот',
  'восемьсот',
  'девятьсот',
]

/** Порядковые суффиксы для единиц */
const ORDINAL_ONES = ['', 'первый', 'второй', 'третий', 'четвёртый', 'пятый', 'шестой', 'седьмой', 'восьмой', 'девятый']

const ORDINAL_TEENS = [
  'десятый',
  'одиннадцатый',
  'двенадцатый',
  'тринадцатый',
  'четырнадцатый',
  'пятнадцатый',
  'шестнадцатый',
  'семнадцатый',
  'восемнадцатый',
  'девятнадцатый',
]

const ORDINAL_TENS = [
  '',
  'десятый',
  'двадцатый',
  'тридцатый',
  'сороковой',
  'пятидесятый',
  'шестидесятый',
  'семидесятый',
  'восьмидесятый',
  'девяностый',
]

const ORDINAL_HUNDREDS = [
  '',
  'сотый',
  'двухсотый',
  'трёхсотый',
  'четырёхсотый',
  'пятисотый',
  'шестисотый',
  'семисотый',
  'восьмисотый',
  'девятисотый',
]

/** Выбор формы существительного по числу (1/2-4/5-20) */
function pluralForm(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100
  if (abs >= 11 && abs <= 19) { return many }
  const lastDigit = abs % 10
  if (lastDigit === 1) { return one }
  if (lastDigit >= 2 && lastDigit <= 4) { return few }
  return many
}

/**
 * Кардинальное числительное до 999 (вспомогательная).
 * @param feminine — использовать женский род для 1 и 2
 */
function cardinalUpTo999(n: number, feminine: boolean): string {
  if (n === 0) { return '' }

  const parts: string[] = []
  const ones = feminine ? ONES_F : ONES_M

  if (n >= 100) {
    parts.push(HUNDREDS[Math.floor(n / 100)])
    n %= 100
  }

  if (n >= 10 && n <= 19) {
    parts.push(TEENS[n - 10])
    return parts.join(' ')
  }

  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)])
    n %= 10
  }

  if (n > 0) {
    parts.push(ones[n])
  }

  return parts.join(' ')
}

/** Кардинальное числительное (русский) */
export function cardinal(n: number): string {
  if (n === 0) { return 'ноль' }
  if (n < 0) { return `минус ${cardinal(-n)}` }

  const parts: string[] = []

  // Миллиарды
  if (n >= 1_000_000_000) {
    const billions = Math.floor(n / 1_000_000_000)
    parts.push(cardinalUpTo999(billions, false))
    parts.push(pluralForm(billions, 'миллиард', 'миллиарда', 'миллиардов'))
    n %= 1_000_000_000
  }

  // Миллионы (мужской род)
  if (n >= 1_000_000) {
    const millions = Math.floor(n / 1_000_000)
    parts.push(cardinalUpTo999(millions, false))
    parts.push(pluralForm(millions, 'миллион', 'миллиона', 'миллионов'))
    n %= 1_000_000
  }

  // Тысячи (ЖЕНСКИЙ род: одна тысяча, две тысячи)
  if (n >= 1000) {
    const thousands = Math.floor(n / 1000)
    parts.push(cardinalUpTo999(thousands, true))
    parts.push(pluralForm(thousands, 'тысяча', 'тысячи', 'тысяч'))
    n %= 1000
  }

  // Остаток (мужской род по умолчанию)
  if (n > 0) {
    parts.push(cardinalUpTo999(n, false))
  }

  return parts.join(' ')
}

/** Приставки для составных порядковых с "тысячный" (двух-, трёх-, пяти-, ...) */
const THOUSAND_ORDINAL_PREFIX: Record<number, string> = {
  2: 'двух',
  3: 'трёх',
  4: 'четырёх',
  5: 'пяти',
  6: 'шести',
  7: 'семи',
  8: 'восьми',
  9: 'девяти',
  10: 'десяти',
  11: 'одиннадцати',
  12: 'двенадцати',
  13: 'тринадцати',
  14: 'четырнадцати',
  15: 'пятнадцати',
  16: 'шестнадцати',
  17: 'семнадцати',
  18: 'восемнадцати',
  19: 'девятнадцати',
  20: 'двадцати',
  30: 'тридцати',
  40: 'сорока',
  50: 'пятидесяти',
  60: 'шестидесяти',
  70: 'семидесяти',
  80: 'восьмидесяти',
  90: 'девяносто',
  100: 'сто',
  200: 'двухсот',
  300: 'трёхсот',
  400: 'четырёхсот',
  500: 'пятисот',
  600: 'шестисот',
  700: 'семисот',
  800: 'восьмисот',
  900: 'девятисот',
}

/** Получить приставку для составного порядкового ("пятисот" + "тысячный") */
function thousandPrefix(n: number): string {
  // Простые случаи — lookup
  if (THOUSAND_ORDINAL_PREFIX[n]) { return THOUSAND_ORDINAL_PREFIX[n] }

  // Составные: 500 = пятисот, 492 = четырёхсотдевяностодвух
  const parts: string[] = []

  if (n >= 100) {
    const h = Math.floor(n / 100) * 100
    parts.push(THOUSAND_ORDINAL_PREFIX[h] || HUNDREDS[Math.floor(n / 100)])
    n %= 100
  }

  if (n >= 20) {
    const t = Math.floor(n / 10) * 10
    parts.push(THOUSAND_ORDINAL_PREFIX[t] || TENS[Math.floor(n / 10)])
    n %= 10
  }

  if (n >= 10 && n <= 19) {
    parts.push(THOUSAND_ORDINAL_PREFIX[n] || '')
    n = 0
  }

  if (n > 0) {
    parts.push(THOUSAND_ORDINAL_PREFIX[n] || ONES_M[n])
  }

  return parts.join('')
}

/** Порядковое числительное (русский) */
export function ordinal(n: number): string {
  if (n === 0) { return 'нулевой' }
  if (n < 0) { return `минус ${ordinal(-n)}` }

  // Для чисел > 999: кардинальная часть + порядковый суффикс последнего разряда
  const parts: string[] = []
  let remaining = n

  // Миллионы и выше — кардинальная часть
  if (remaining >= 1_000_000) {
    // Если остаток = 0, порядковый от миллиона
    if (remaining % 1_000_000 === 0) {
      const millions = Math.floor(remaining / 1_000_000)
      if (millions === 1) { return 'миллионный' }
      return `${cardinalUpTo999(millions, false)} миллионный`
    }
    // Иначе кардинальная часть миллионов
    const millions = Math.floor(remaining / 1_000_000)
    parts.push(cardinalUpTo999(millions, false))
    parts.push(pluralForm(millions, 'миллион', 'миллиона', 'миллионов'))
    remaining %= 1_000_000
  }

  // Тысячи
  if (remaining >= 1000) {
    const thousandsPart = Math.floor(remaining / 1000)
    if (remaining % 1000 === 0) {
      // "тысячный", "двухтысячный" и т.д.
      if (thousandsPart === 1) { return [...parts, 'тысячный'].join(' ') }
      // Для круглых тысяч: приставка + тысячный
      return [...parts, `${thousandPrefix(thousandsPart)}тысячный`].join(' ')
    }
    parts.push(cardinalUpTo999(thousandsPart, true))
    parts.push(pluralForm(thousandsPart, 'тысяча', 'тысячи', 'тысяч'))
    remaining %= 1000
  }

  // Остаток < 1000 — порядковый
  if (remaining > 0) {
    parts.push(ordinalUpTo999(remaining))
  }

  return parts.join(' ')
}

/** Порядковое числительное до 999 */
function ordinalUpTo999(n: number): string {
  if (n === 0) { return '' }

  // Если есть сотни и есть остаток — сотни кардинально + порядковый остаток
  if (n >= 100) {
    const hundredsDigit = Math.floor(n / 100)
    const rest = n % 100
    if (rest === 0) {
      return ORDINAL_HUNDREDS[hundredsDigit]
    }
    return `${HUNDREDS[hundredsDigit]} ${ordinalUpTo99(rest)}`
  }

  return ordinalUpTo99(n)
}

/** Порядковое числительное до 99 */
function ordinalUpTo99(n: number): string {
  if (n >= 10 && n <= 19) {
    return ORDINAL_TEENS[n - 10]
  }

  if (n >= 20) {
    const tensDigit = Math.floor(n / 10)
    const onesDigit = n % 10
    if (onesDigit === 0) {
      return ORDINAL_TENS[tensDigit]
    }
    return `${TENS[tensDigit]} ${ORDINAL_ONES[onesDigit]}`
  }

  return ORDINAL_ONES[n]
}
