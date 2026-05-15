/**
 * mapServerErrors — автоматический маппинг серверных ошибок на поля формы.
 *
 * Поддерживает автодетект формата:
 * - Prisma P2002/P2003/P2025/P2014
 * - ZenStack rejected-by-policy / db-query-error
 * - Zod v4 flatten { fieldErrors, formErrors }
 * - ActionResult { success: false, error: ... }
 * - Error объекты с .info (ZenStack) и .cause (Prisma)
 *
 * @example
 * ```tsx
 * // В onSubmit формы
 * onSubmit={async ({ value }) => {
 *   try {
 *     await createUser(value)
 *   } catch (error) {
 *     const mapped = mapServerErrors(error, {
 *       fieldMap: {
 *         email: { field: 'email', message: 'Этот email уже зарегистрирован' },
 *       },
 *     })
 *     // mapped.fieldErrors → [{ field: 'email', message: '...' }]
 *     // mapped.formErrors → ['Глобальная ошибка']
 *   }
 * }}
 * ```
 */

import {
  parseActionResultError,
  parseErrorObject,
  parsePrismaError,
  parseZenStackError,
  parseZodFlatError,
} from './parsers'
import type { MappedServerErrors, MapServerErrorsConfig } from './types'

/**
 * Маппит серверную ошибку на поля формы.
 * Автоматически определяет формат ошибки и извлекает field-level + form-level ошибки.
 *
 * @param error - Ошибка от сервера (любой формат)
 * @param config - Опциональная конфигурация маппинга
 * @returns Структура с fieldErrors и formErrors
 */
export function mapServerErrors(error: unknown, config?: MapServerErrorsConfig): MappedServerErrors {
  const { fieldMap, format = 'auto', defaultMessage, locale = 'ru' } = config ?? {}

  const fallback: MappedServerErrors = {
    fieldErrors: [],
    formErrors: [defaultMessage ?? (locale === 'ru' ? 'Произошла ошибка' : 'An error occurred')],
  }

  if (error === null || error === undefined) return fallback

  // Строковая ошибка → глобальная
  if (typeof error === 'string') {
    return { fieldErrors: [], formErrors: [error] }
  }

  // Определённый формат
  if (format !== 'auto') {
    const result = parseByFormat(error, format, fieldMap, locale)
    return result ?? fallback
  }

  // Автодетект: пробуем парсеры в порядке приоритета
  const parsers = [
    () => parsePrismaError(error, fieldMap, locale),
    () => parseZenStackError(error, fieldMap, locale),
    () => parseZodFlatError(error),
    () => parseActionResultError(error),
    () => parseErrorObject(error, fieldMap, locale),
  ]

  for (const parse of parsers) {
    const result = parse()
    if (result) return result
  }

  return fallback
}

function parseByFormat(
  error: unknown,
  format: NonNullable<MapServerErrorsConfig['format']>,
  fieldMap?: MapServerErrorsConfig['fieldMap'],
  locale: 'ru' | 'en' = 'ru',
): MappedServerErrors | null {
  switch (format) {
    case 'prisma':
      return parsePrismaError(error, fieldMap, locale)
    case 'zenstack':
      return parseZenStackError(error, fieldMap, locale)
    case 'zod':
      return parseZodFlatError(error)
    case 'action-result':
      return parseActionResultError(error)
    default:
      return null
  }
}

/**
 * Применяет MappedServerErrors к TanStack Form инстансу.
 * Устанавливает ошибки на конкретные поля через form.setFieldMeta.
 *
 * @example
 * ```tsx
 * const mapped = mapServerErrors(error)
 * applyServerErrors(form, mapped)
 * ```
 */
export function applyServerErrors(
  form: {
    setFieldMeta: (field: string, updater: (prev: { errors: unknown[] }) => { errors: unknown[] }) => void
    setErrorMap: (errorMap: { onSubmit: string }) => void
  },
  mapped: MappedServerErrors,
): void {
  // Устанавливаем ошибки на поля
  for (const { field, message } of mapped.fieldErrors) {
    form.setFieldMeta(field, (prev) => ({
      ...prev,
      errors: [...prev.errors, message],
    }))
  }

  // Устанавливаем глобальные ошибки формы
  if (mapped.formErrors.length > 0) {
    form.setErrorMap({ onSubmit: mapped.formErrors.join('. ') })
  }
}
