/**
 * Реализация вынесена в @letar/forms-core (Фаза 7.1, dependency-free ядро) —
 * этот файл только реэкспортирует, чтобы внутренние относительные импорты
 * (`./zod-utils`) по всей `libs/forms` не пришлось переписывать.
 */
export type { UnwrapResult } from '@letar/forms-core/schema'
export {
  getZodType,
  hasDefaultValue,
  isOptionalSchema,
  unwrapSchema,
  unwrapSchemaWithRequired,
} from '@letar/forms-core/schema'
