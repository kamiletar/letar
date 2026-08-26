import { z } from 'zod/v4'

/**
 * Явный intent пользователя при редактировании значения, которое сервер не может
 * (или не должен) возвращать клиенту повторно — API-ключ, client secret и т.п.
 *
 * `isDirty` формы здесь недостаточен: это техническое состояние (значение отличается
 * от initialValue), а серверу нужен явный выбор «оставить как есть» либо «заменить».
 * `value` присутствует в обеих ветках (стабильная форма для JSON/Server Action),
 * `null` при `isEdited: false` означает «не изменять» — маска, прежний plaintext и
 * encrypted blob в form state не попадают вовсе.
 *
 * @example
 * ```ts
 * const notEdited: EditIntentValue<string> = { isEdited: false, value: null }
 * const edited: EditIntentValue<string> = { isEdited: true, value: 'sk_live_...' }
 * ```
 */
export type EditIntentValue<T> = { isEdited: false; value: null } | { isEdited: true; value: T }

/**
 * Готовая Zod-схема для {@link EditIntentValue}, дискриминированная по `isEdited`.
 *
 * `.strip()` на обеих ветках — лишние ключи не проходят ни в режиме «оставить», ни
 * в режиме «заменить». `true` без валидного `value` и `false` с непустым `value`
 * отклоняются схемой (`value` веток `false`/`true` разных типов — `z.null()` и `innerSchema`).
 *
 * @example
 * ```ts
 * const ApiKeyEditSchema = z.object({
 *   apiKey: editIntentValueSchema(z.string().min(20)),
 * }).strip()
 * ```
 */
export function editIntentValueSchema<T extends z.ZodType>(innerSchema: T) {
  return z.discriminatedUnion('isEdited', [
    z.object({
      isEdited: z.literal(false),
      value: z.null(),
    }).strip(),
    z.object({
      isEdited: z.literal(true),
      value: innerSchema,
    }).strip(),
  ])
}

/**
 * Начальное значение для read/edit-режима, готовое для `initialValue` формы.
 *
 * @example
 * ```ts
 * // существующая запись (secret уже настроен на сервере) — стартует в view mode
 * apiKey: emptyEditIntentValue()
 *
 * // create mode — сразу edit mode с пустым value
 * apiKey: startEditIntentValue('')
 * ```
 */
export function emptyEditIntentValue<T>(): EditIntentValue<T> {
  return { isEdited: false, value: null }
}

/**
 * Значение для create-режима — сразу `isEdited: true` с переданным пустым value.
 */
export function startEditIntentValue<T>(emptyValue: T): EditIntentValue<T> {
  return { isEdited: true, value: emptyValue }
}
