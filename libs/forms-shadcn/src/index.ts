// UIKit-контракт (Radix + cva + tailwind-merge реализация)
export { type ShadcnUIKit, shadcnUIKit } from './lib/uikit/uikit-shadcn'

// Композиционный слой, связанный со shadcnUIKit
export { createField, FieldErrorBoundary, FieldWrapper } from './lib/uikit/primitives'

// Поля (Шаг 5 — 3 из 15-20)
export { FieldCheckbox } from './lib/fields/field-checkbox'
export { FieldSelect } from './lib/fields/field-select'
export { FieldString } from './lib/fields/field-string'
export type { CheckboxFieldProps, SelectFieldProps, SelectOption, StringFieldProps } from './lib/fields/types'

// cn() — clsx + tailwind-merge, стандартный shadcn-хелпер
export { cn } from './lib/utils/cn'
