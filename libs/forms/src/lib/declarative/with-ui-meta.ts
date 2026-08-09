/**
 * Реализация вынесена в @letar/forms-core (Фаза 7.1, dependency-free ядро) —
 * этот файл только реэкспортирует, чтобы внутренние относительные импорты
 * (`./with-ui-meta`) по всей `libs/forms` не пришлось переписывать.
 */
export type { DeepUIMetaConfig, UIMetaConfig } from '@letar/forms-core/schema'
export { withUIMeta, withUIMetaDeep } from '@letar/forms-core/schema'
