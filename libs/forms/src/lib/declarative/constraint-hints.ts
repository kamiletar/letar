/**
 * Реализация вынесена в @letar/forms-core (Фаза 7.1, dependency-free ядро) —
 * этот файл только реэкспортирует, чтобы внутренние относительные импорты
 * (`./constraint-hints`) по всей `libs/forms` не пришлось переписывать.
 */
export type { ConstraintHintTranslations } from '@letar/forms-core/schema'
export { generateConstraintHint } from '@letar/forms-core/schema'
