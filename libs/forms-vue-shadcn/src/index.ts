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

// Поля
export { FieldCheckbox } from './lib/fields/field-checkbox'
export { FieldCombobox } from './lib/fields/field-combobox'
export { FieldCurrency } from './lib/fields/field-currency'
export { FieldDate } from './lib/fields/field-date'
export { FieldHidden } from './lib/fields/field-hidden'
export { FieldNumber } from './lib/fields/field-number'
export { FieldNumberInput } from './lib/fields/field-number-input'
export { FieldPassword } from './lib/fields/field-password'
export { FieldPercentage } from './lib/fields/field-percentage'
export { FieldSelect, type FieldSelectOption } from './lib/fields/field-select'
export { FieldString } from './lib/fields/field-string'
export { FieldTextarea } from './lib/fields/field-textarea'
export { FieldTime } from './lib/fields/field-time'
export { FieldYesNo } from './lib/fields/field-yes-no'

// cn() — clsx + tailwind-merge, стандартный shadcn-хелпер
export { cn } from '@letar/tailwind-utils'
