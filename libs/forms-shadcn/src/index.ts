// UIKit-контракт (Radix + cva + tailwind-merge реализация)
export { type ShadcnUIKit, shadcnUIKit } from './lib/uikit/uikit-shadcn'

// Композиционный слой, связанный со shadcnUIKit
export { createField, FieldErrorBoundary, FieldWrapper } from './lib/uikit/primitives'

// Поля (Шаг 5 — 8 из 15-20)
export { FieldCheckbox } from './lib/fields/field-checkbox'
export { FieldDate } from './lib/fields/field-date'
export { FieldNumber } from './lib/fields/field-number'
export { FieldRadioGroup } from './lib/fields/field-radio-group'
export { FieldSegmentGroup } from './lib/fields/field-segment-group'
export { FieldSelect } from './lib/fields/field-select'
export { FieldString } from './lib/fields/field-string'
export { FieldTextarea } from './lib/fields/field-textarea'
export type {
  CheckboxFieldProps,
  DateFieldProps,
  NumberFieldProps,
  RadioGroupFieldProps,
  RadioOption,
  SegmentGroupFieldProps,
  SelectFieldProps,
  SelectOption,
  StringFieldProps,
  TextareaFieldProps,
} from './lib/fields/types'

// cn() — clsx + tailwind-merge, стандартный shadcn-хелпер
export { cn } from './lib/utils/cn'
