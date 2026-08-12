/**
 * Нормализация и валидация свидетельства о рождении РФ.
 *
 * Формат `II-МЮ № 123456`: римская часть (переменная длина, практически I/V/X) + две
 * кириллические буквы серии + 6 цифр номера. БЕЗ структурной маски (MASK_ENGINE.md §7.1,
 * §5.3) — переменная длина римской части (1-5 знаков) делает группирующую маску вредной.
 *
 * Свободный ввод с нормализацией — три требования жёстче госномера (§1.4):
 * - гомоглифы римской части: `|`, `l` (латинская L), `1`, `І` (кириллица), `i` → `I`;
 * - позиционное разведение X/Х — латиница в римской части, кириллица в буквах серии
 *   (частая ошибка — набор в неверной раскладке клавиатуры);
 * - чистка разделителей `-`, пробелов, `№`.
 *
 * ⚠️ Алфавит букв серии НЕ сужать (MASK_ENGINE.md §7.1) — публичной таблицы «регион → буквы»
 * не существует, сужение даёт ложные отказы. Советские свидетельства (буквы союзных республик,
 * например І, Ї) — тоже не блокировать.
 */
import { z } from 'zod/v4'

/** Гомоглифы римской части — типичные опечатки при наборе `I` (Shift+`\` даёт `|` и т.п.). */
const ROMAN_HOMOGLYPHS: Record<string, string> = {
  '|': 'I',
  L: 'I', // латинская L визуально похожа на I в некоторых шрифтах при опечатке Caps Lock
  '1': 'I',
  І: 'I', // U+0406 CYRILLIC CAPITAL LETTER BYELORUSSIAN-UKRAINIAN I
  X: 'X',
  Х: 'X', // U+0425 CYRILLIC CAPITAL LETTER HA → латинская X (в римской части всегда латиница)
}

/** Раскладочные гомоглифы букв серии — латиница, набранная в русской раскладке по ошибке. */
const LETTER_HOMOGLYPHS: Record<string, string> = {
  A: 'А',
  B: 'В',
  E: 'Е',
  K: 'К',
  M: 'М',
  H: 'Н',
  O: 'О',
  P: 'Р',
  C: 'С',
  T: 'Т',
  Y: 'У',
  X: 'Х',
}

const BIRTH_CERTIFICATE_PATTERN = /^([IVXLCDM]{1,5})-([А-ЯЁІЇ]{2}) № (\d{6})$/

/**
 * Нормализовать ввод свидетельства о рождении в канонический вид `II-МЮ № 123456`.
 *
 * Разбор позиционный: 6 последних цифровых символов — номер, 2 предыдущих — буквы серии,
 * всё, что осталось перед ними — римская часть. Гомоглифы применяются с учётом позиции,
 * поэтому `X`/`Х` не путаются между римской частью и буквами серии.
 */
export function normalizeBirthCertificate(raw: string): string {
  const cleaned = raw.replace(/[-\s№]/g, '').toUpperCase()
  if (cleaned.length <= 6) {
    return cleaned
  }

  const digitsPart = cleaned.slice(-6)
  const beforeDigits = cleaned.slice(0, -6)
  if (beforeDigits.length <= 2) {
    return `${beforeDigits}${digitsPart}`
  }

  const lettersPart = beforeDigits.slice(-2)
  const romanPart = beforeDigits.slice(0, -2)

  const normalizedRoman = [...romanPart].map((ch) => ROMAN_HOMOGLYPHS[ch] ?? ch).join('')
  const normalizedLetters = [...lettersPart].map((ch) => LETTER_HOMOGLYPHS[ch] ?? ch).join('')

  return `${normalizedRoman}-${normalizedLetters} № ${digitsPart}`
}

/**
 * Проверить формат свидетельства о рождении после нормализации.
 */
export function validateBirthCertificate(value: string): boolean {
  return BIRTH_CERTIFICATE_PATTERN.test(normalizeBirthCertificate(value))
}

/**
 * Zod-схема свидетельства о рождении — нормализует и проверяет формат.
 */
export function birthCertificateSchema() {
  return z
    .string()
    .transform(normalizeBirthCertificate)
    .refine((v) => BIRTH_CERTIFICATE_PATTERN.test(v), {
      message: 'Свидетельство о рождении: римская часть-две буквы № шесть цифр (например, II-МЮ № 123456)',
    })
}
