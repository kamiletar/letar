/**
 * Строковый литерал TS в одинарных кавычках с экранированием `\`, `'` и переводов строки.
 * Обычный текст остаётся байт-в-байт прежним — дифф сгенерированных файлов не шумит.
 */
export function quoteTsString(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
  return `'${escaped}'`
}

/** Перевод строки/разделитель абзаца → escape-последовательность (в литерале они недопустимы) */
const LINE_TERMINATORS: Record<string, string> = {
  '\n': '\\n',
  '\r': '\\r',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
}

/**
 * Regex-литерал TS `/…/` из исходного текста паттерна.
 * Экранирует `/` (иначе он завершает литерал) и переводы строки. Уже экранированные автором пары
 * `\x` не трогает, поэтому обычный паттерн остаётся байт-в-байт прежним.
 */
export function quoteRegexLiteral(pattern: string): string {
  let out = ''
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i] as string
    if (ch === '\\') {
      const next = pattern[i + 1]
      if (next === undefined) {
        // одиночный `\` в конце оборвал бы литерал — превращаем в литеральный обратный слэш
        out += '\\\\'
      } else {
        // пара `\x` копируется целиком; `\<перевод строки>` — то же, что сам перевод строки
        out += LINE_TERMINATORS[next] ?? `\\${next}`
        i++
      }
    } else if (ch === '/') {
      out += '\\/'
    } else {
      out += LINE_TERMINATORS[ch] ?? ch
    }
  }
  return `/${out}/`
}
