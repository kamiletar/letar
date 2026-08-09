/**
 * Реализация вынесена в @letar/forms-core (Фаза 7.1, dependency-free ядро) —
 * этот файл только реэкспортирует, чтобы внутренние относительные импорты
 * (`./schema-traversal`) по всей `libs/forms` не пришлось переписывать.
 */
export type { SchemaFieldInfo } from '@letar/forms-core/schema'
export { filterFields, getFieldPaths, traverseSchema } from '@letar/forms-core/schema'
