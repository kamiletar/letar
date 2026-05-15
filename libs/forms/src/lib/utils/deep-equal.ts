/**
 * Глубокое сравнение двух значений.
 * Обрабатывает примитивы, Date, RegExp, массивы и plain objects.
 * Не падает на circular refs (возвращает false при обнаружении цикла).
 */
export function deepEqual(a: unknown, b: unknown, seen = new WeakSet()): boolean {
  // Примитивы и referential equality
  if (Object.is(a, b)) return true

  // null/undefined или разные типы
  if (a === null || a === undefined || b === null || b === undefined) return false
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object') return false

  // Date
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }

  // RegExp
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.source === b.source && a.flags === b.flags
  }

  // Защита от циклических ссылок
  const objA = a as object
  const objB = b as object
  if (seen.has(objA) || seen.has(objB)) return false
  seen.add(objA)
  seen.add(objB)

  // Массивы
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, i) => deepEqual(item, b[i], seen))
  }

  // Plain objects
  const keysA = Object.keys(a as Record<string, unknown>)
  const keysB = Object.keys(b as Record<string, unknown>)
  if (keysA.length !== keysB.length) return false

  const recA = a as Record<string, unknown>
  const recB = b as Record<string, unknown>

  return keysA.every((key) => Object.hasOwn(recB, key) && deepEqual(recA[key], recB[key], seen))
}
