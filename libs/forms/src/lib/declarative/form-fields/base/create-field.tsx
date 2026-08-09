'use client'

/**
 * Реализация переехала в `@letar/forms-react` (Фаза 7.3) — этот файл только реэкспортирует
 * уже привязанные к Chakra примитивы, чтобы относительные импорты `./create-field` по всей
 * `libs/forms` (56 полей) не пришлось переписывать.
 *
 * Chakra-часть, наоборот, осталась здесь: `FieldError` — вёрстка скина, её реэкспортируем
 * из соседнего `./field-error`.
 */
export type { CreateFieldOptions, FieldRenderFn, FieldRenderProps, ResolvedFieldProps } from '@letar/forms-react'
export { FieldError } from './field-error'
export { FieldLabel } from './field-label'
export { createField } from './primitives'
