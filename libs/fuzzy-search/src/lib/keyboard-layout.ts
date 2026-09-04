/**
 * Заповедь №17 студии: опечатка и неверная раскладка — ожидаемый ввод, не ошибка пользователя.
 * Эта часть закрывает только раскладку (RU⇄EN по физическому положению клавиш QWERTY/ЙЦУКЕН).
 * Опечатки внутри одной раскладки и морфология словоформ — уже покрыты ZenStack `@fuzzy`/
 * `@fullText` (pg_trgm + tsvector) на стороне БД, здесь не дублируются.
 *
 * Регистр не сохраняется — для поисковой строки он не значим, а сама раскладка определяется
 * по физической позиции клавиши, для которой различать верхний/нижний регистр смысла нет.
 */

// Порядок соответствует физическому положению клавиш: ряды QWERTY ↔ ЙЦУКЕН слева направо.
const EN_KEYS = "qwertyuiop[]asdfghjkl;'zxcvbnm"
const RU_KEYS = 'йцукенгшщзхъфывапролджэячсмить'

function buildMap(from: string, to: string): ReadonlyMap<string, string> {
  const map = new Map<string, string>()
  for (let i = 0; i < from.length; i++) {
    map.set(from[i], to[i])
  }
  return map
}

const EN_TO_RU = buildMap(EN_KEYS, RU_KEYS)
const RU_TO_EN = buildMap(RU_KEYS, EN_KEYS)

function translate(text: string, map: ReadonlyMap<string, string>): string {
  return Array.from(text.toLowerCase())
    .map((ch) => map.get(ch) ?? ch)
    .join('')
}

const CYRILLIC_RE = /[а-яё]/i
const LATIN_RE = /[a-z]/i

/**
 * Определяет, в какой раскладке набран текст, по преобладающему алфавиту.
 * Смешанный/пустой/чисто-числовой текст — 'unknown', корректировать нечего.
 */
export function detectLayout(text: string): 'ru' | 'en' | 'unknown' {
  const cyrillicCount = (text.match(CYRILLIC_RE) ?? []).length
  const latinCount = (text.match(LATIN_RE) ?? []).length
  if (cyrillicCount === 0 && latinCount === 0) { return 'unknown' }
  if (cyrillicCount === latinCount) { return 'unknown' }
  return cyrillicCount > latinCount ? 'ru' : 'en'
}

/**
 * Перепечатывает текст в другой раскладке по физической позиции клавиш —
 * "vfibyf" (набрано на EN-раскладке вместо RU) → "машина".
 * Направление определяется автоматически по преобладающему алфавиту введённого текста.
 * Возвращает исходный текст без изменений, если раскладку определить не удалось.
 */
export function correctKeyboardLayout(text: string): string {
  const layout = detectLayout(text)
  if (layout === 'ru') { return translate(text, RU_TO_EN) }
  if (layout === 'en') { return translate(text, EN_TO_RU) }
  return text
}
