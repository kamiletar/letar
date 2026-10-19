/**
 * Превращает идентификатор (имя поля или значение enum) в читаемую подпись.
 *
 * Понимает четыре написания, которые встречаются в схемах:
 * - `camelCase` / `PascalCase` → слова по границе регистра;
 * - `SCREAMING_SNAKE` (значения enum в Prisma/ZenStack: `DRAFT`, `IN_PROGRESS`) → «Draft», «In Progress»;
 * - `snake_case` и `kebab-case` → слова по разделителю.
 *
 * Аббревиатура внутри camelCase остаётся целой (`userID` → «User ID»), а не рассыпается
 * по буквам — прежняя реализация вставляла пробел перед каждой заглавной и превращала `DRAFT`
 * в «D R A F T».
 *
 * @example camelCaseToLabel('firstName') // 'First Name'
 * @example camelCaseToLabel('DRAFT') // 'Draft'
 * @example camelCaseToLabel('IN_PROGRESS') // 'In Progress'
 * @example camelCaseToLabel('userID') // 'User ID'
 */
export function camelCaseToLabel(str: string): string {
  const trimmed = str.trim()
  if (!trimmed) {
    return ''
  }

  // Нет ни одной строчной буквы: это SCREAMING_SNAKE (или аббревиатура целиком) — пишем слова с заглавной.
  const isScreaming = /[A-Z]/.test(trimmed) && !/[a-z]/.test(trimmed)
  const source = isScreaming ? trimmed.toLowerCase() : trimmed

  return source
    .replace(/[_\-\s]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // firstName → first Name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // HTMLParser → HTML Parser
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
