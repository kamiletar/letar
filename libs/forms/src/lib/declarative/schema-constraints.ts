/**
 * Реализация вынесена в @letar/forms-core (Фаза 7.1, dependency-free ядро) —
 * этот файл только реэкспортирует, чтобы внутренние относительные импорты
 * (`./schema-constraints`) по всей `libs/forms` не пришлось переписывать.
 */
export type {
  ZodArrayConstraints,
  ZodConstraints,
  ZodDateConstraints,
  ZodNumberConstraints,
  ZodStringConstraints,
} from '@letar/forms-core/schema'
export { getZodConstraints } from '@letar/forms-core/schema'
