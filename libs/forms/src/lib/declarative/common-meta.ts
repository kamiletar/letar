/**
 * Реализация вынесена в @letar/forms-core (Фаза 7.1, dependency-free ядро) —
 * этот файл только реэкспортирует, чтобы внутренние относительные импорты
 * (`./common-meta`) по всей `libs/forms` не пришлось переписывать.
 */
export type { SelectionFieldType } from '@letar/forms-core/schema'
export {
  booleanMeta,
  commonMeta,
  dateMeta,
  enumMeta,
  numberMeta,
  relationMeta,
  textMeta,
} from '@letar/forms-core/schema'
