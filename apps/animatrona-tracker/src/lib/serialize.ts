/**
 * Хелпер сериализации BigInt полей в Number для JSON-ответов.
 *
 * JSON.stringify не поддерживает BigInt — нужно конвертировать перед отправкой.
 */

/**
 * Конвертировать указанные BigInt-поля объекта в Number.
 *
 * @example
 * ```ts
 * const serialized = serializeBigIntFields(server, ['capacityBytes', 'usedBytes'])
 * // { ...server, capacityBytes: Number(server.capacityBytes), usedBytes: Number(server.usedBytes) }
 * ```
 */
export function serializeBigIntFields<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  fields: K[]
): { [P in keyof T]: P extends K ? number : T[P] } {
  const result = { ...obj } as Record<string, unknown>
  for (const field of fields) {
    result[field as string] = Number(result[field as string])
  }
  return result as { [P in keyof T]: P extends K ? number : T[P] }
}

/**
 * Конвертировать BigInt-поля для массива объектов.
 *
 * @example
 * ```ts
 * const serialized = serializeBigIntArray(servers, ['capacityBytes', 'usedBytes'])
 * ```
 */
export function serializeBigIntArray<T extends Record<string, unknown>, K extends keyof T>(
  items: T[],
  fields: K[]
): Array<{ [P in keyof T]: P extends K ? number : T[P] }> {
  return items.map((item) => serializeBigIntFields(item, fields))
}
