// UIKit-контракт (Radix + cva + tailwind-merge реализация)
export { type ShadcnUIKit, shadcnUIKit } from './lib/uikit/uikit-shadcn'

// Композиционный слой, связанный со shadcnUIKit
export { createField, FieldErrorBoundary, FieldWrapper } from './lib/uikit/primitives'

// Поля (Шаг 5 — 13 из 15-20)
export { FieldCheckbox } from './lib/fields/field-checkbox'
export { FieldCombobox } from './lib/fields/field-combobox'
export { FieldDate } from './lib/fields/field-date'
export { FieldNativeSelect } from './lib/fields/field-native-select'
export { FieldNumber } from './lib/fields/field-number'
export { FieldPassword } from './lib/fields/field-password'
export { FieldRadioGroup } from './lib/fields/field-radio-group'
export { FieldSegmentGroup } from './lib/fields/field-segment-group'
export { FieldSelect } from './lib/fields/field-select'
export { FieldSlider } from './lib/fields/field-slider'
export { FieldString } from './lib/fields/field-string'
export { FieldSwitch } from './lib/fields/field-switch'
export { FieldTextarea } from './lib/fields/field-textarea'
export type {
  CheckboxFieldProps,
  ComboboxFieldProps,
  DateFieldProps,
  NativeSelectFieldProps,
  NumberFieldProps,
  PasswordFieldProps,
  RadioGroupFieldProps,
  RadioOption,
  SegmentGroupFieldProps,
  SelectFieldProps,
  SelectOption,
  SliderFieldProps,
  StringFieldProps,
  SwitchFieldProps,
  TextareaFieldProps,
} from './lib/fields/types'

// cn() — clsx + tailwind-merge, стандартный shadcn-хелпер
export { cn } from './lib/utils/cn'
