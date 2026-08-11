// UIKit-контракт (Reka UI + cva + tailwind-merge реализация)
export { type RekaUIKit, rekaUIKit } from './lib/uikit/uikit-reka'

// Композиционный слой, связанный с rekaUIKit
export {
  createFieldPrimitives,
  type FieldPrimitives,
  type FieldPrimitivesUIKit,
  type FieldRenderArgs,
  type FieldRenderFn,
  type FieldWrapperProps,
} from './lib/field/create-field-primitives'
export { createField, FieldWrapper } from './lib/uikit/primitives'

// Поля (Поток 1, письмо #61 — 6 демонстрационных, не паритет)
export { FieldCheckbox } from './lib/fields/field-checkbox'
export { FieldCombobox } from './lib/fields/field-combobox'
export { FieldNumber } from './lib/fields/field-number'
export { FieldSelect, type FieldSelectOption } from './lib/fields/field-select'
export { FieldString } from './lib/fields/field-string'
export { FieldTextarea } from './lib/fields/field-textarea'

// cn() — clsx + tailwind-merge, стандартный shadcn-хелпер
export { cn } from '@letar/tailwind-utils'
