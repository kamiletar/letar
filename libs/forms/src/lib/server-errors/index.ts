/**
 * @module @letar/forms/server-errors
 *
 * Маппинг серверных ошибок на поля формы.
 * Автоматический детект формата: Prisma, ZenStack, Zod, ActionResult.
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

export { applyServerErrors, mapServerErrors } from './map-server-errors'
export {
  parseActionResultError,
  parseErrorObject,
  parsePrismaError,
  parseZenStackError,
  parseZodFlatError,
} from './parsers'
export type {
  ActionResultError,
  FieldError,
  FieldErrorMap,
  MapServerErrorsConfig,
  MappedServerErrors,
  PrismaError,
  ZenStackError,
  ZodFlatError,
} from './types'
