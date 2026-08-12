/**
 * @module @letar/forms/server-errors
 *
 * Маппинг серверных ошибок на поля формы.
 * Автоматический детект формата: Prisma, ZenStack, Zod, ActionResult.
 *
 * Реализация вынесена в @letar/forms-core/server-errors (Фаза 7.1, dependency-free
 * ядро) — этот файл только реэкспортирует, публичный путь `@letar/forms/server-errors`
 * не меняется.
 *
 * @example
 * ```tsx
 * import { mapServerErrors, applyServerErrors } from '@letar/forms'
 *
 * // В onSubmit
 * try {
 *   await createUser(value)
 * } catch (error) {
 *   const mapped = mapServerErrors(error, { locale: 'ru' })
 *   applyServerErrors(form, mapped)
 * }
 * ```
 */

export { applyServerErrors, mapServerErrors } from '@letar/forms-core/server-errors'
export {
  parseActionResultError,
  parseErrorObject,
  parsePrismaError,
  parseZenStackError,
  parseZodFlatError,
} from '@letar/forms-core/server-errors'
export type {
  ActionResultError,
  FieldError,
  FieldErrorMap,
  MappedServerErrors,
  MapServerErrorsConfig,
  PrismaError,
  ZenStackError,
  ZodFlatError,
} from '@letar/forms-core/server-errors'
