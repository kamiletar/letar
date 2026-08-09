/**
 * Реализация вынесена в @letar/forms-core (Фаза 7.1, dependency-free ядро) —
 * этот файл только реэкспортирует, чтобы внутренние относительные импорты
 * (`./schema-meta`) по всей `libs/forms` не пришлось переписывать.
 */
export type { FieldSchemaInfo } from '@letar/forms-core/schema'
export { getFieldMeta } from '@letar/forms-core/schema'
