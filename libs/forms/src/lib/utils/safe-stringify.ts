/**
 * Безопасная сериализация значения в строку для отображения.
 * Обрабатывает circular refs, Date, Map, Set, BigInt и другие типы.
 */
export function safeStringify(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
  if (value instanceof Date) return value.toLocaleDateString('ru-RU')
  if (Array.isArray(value)) return value.map(safeStringify).join(', ')
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Map) return safeStringify(Object.fromEntries(value))
  if (value instanceof Set) return safeStringify([...value])

  if (typeof value === 'object') {
    try {
      const seen = new WeakSet()
      return JSON.stringify(value, (_key, val: unknown) => {
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) return '[Circular]'
          seen.add(val)
        }
        if (typeof val === 'bigint') return val.toString()
        return val
      })
    } catch {
      return String(value)
    }
  }

  return String(value)
}
