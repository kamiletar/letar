/**
 * mapServerErrors — автоматический маппинг серверных ошибок на поля формы.
 *
 * Поддерживает автодетект формата:
 * - Prisma P2002/P2003/P2025/P2014
 * - ZenStack rejected-by-policy / db-query-error
 * - Zod v4 flatten { fieldErrors, formErrors }
 * - ActionResult { success: false, error: ... } (в т.ч. ActionFailure с `field`)
 * - ActionFailureError — клиентское исключение из unwrapActionResult
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
  parseActionFailureError,
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

  if (error === null || error === undefined) { return fallback }

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
    // строго перед parseErrorObject: тот принимает любую Error и теряет поле отказа
    () => parseActionFailureError(error),
    () => parseErrorObject(error, fieldMap, locale),
  ]

  for (const parse of parsers) {
    const result = parse()
    if (result) { return result }
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
      return parseActionResultError(error) ?? parseActionFailureError(error)
    default:
      return null
  }
}

/**
 * Применяет MappedServerErrors к TanStack Form инстансу.
 * Устанавливает ошибки на конкретные поля через form.setFieldMeta.
 *
 * ⚠️ Пишет message в `errorMap.onServer`, НЕ в плоский `meta.errors` напрямую. TanStack Form
 * (`@tanstack/form-core`) держит `meta.errors` как ПРОИЗВОДНОЕ значение — оно пересчитывается из
 * `errorMap` (`Object.values(errorMap)...`) при каждом обновлении стора, в том числе при самом
 * вызове `setFieldMeta`. Прямой push в `errors` (было до 2026-09-14) переживал ровно до следующего
 * пересчёта — на живой странице это следующий же тик, поэтому ошибка исчезала до того, как
 * пользователь успевал её увидеть, хотя `mapServerErrors` отработал верно. `onServer` — штатный
 * ключ `ValidationErrorMap` именно для этого канала (`getErrorMapKey('server') === 'onServer'` в
 * `@tanstack/form-core`), не занят валидаторами `onMount`/`onChange`/`onBlur`/`onSubmit` — значит
 * не перетирается их обычными циклами валидации.
 *
 * @example
 * ```tsx
 * const mapped = mapServerErrors(error)
 * applyServerErrors(form, mapped)
 * ```
 */
export function applyServerErrors(
  form: {
    setFieldMeta: (
      field: string,
      updater: (prev: { errorMap?: Record<string, unknown> }) => { errorMap: Record<string, unknown> },
    ) => void
    setErrorMap: (errorMap: { onSubmit: string }) => void
  },
  mapped: MappedServerErrors,
): void {
  // Устанавливаем ошибки на поля — через errorMap.onServer, не напрямую в errors (см. JSDoc выше)
  for (const { field, message } of mapped.fieldErrors) {
    form.setFieldMeta(field, (prev) => ({
      ...prev,
      errorMap: { ...prev.errorMap, onServer: message },
    }))
  }

  // Устанавливаем глобальные ошибки формы
  if (mapped.formErrors.length > 0) {
    form.setErrorMap({ onSubmit: mapped.formErrors.join('. ') })
  }
}
