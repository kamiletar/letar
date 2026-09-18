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
