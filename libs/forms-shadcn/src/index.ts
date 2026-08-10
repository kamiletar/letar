// UIKit-контракт (Radix + cva + tailwind-merge реализация)
export { type ShadcnUIKit, shadcnUIKit } from './lib/uikit/uikit-shadcn'

// Композиционный слой, связанный со shadcnUIKit
export { createField, FieldErrorBoundary, FieldWrapper } from './lib/uikit/primitives'

// Поля (Шаг 5 — 17 из 15-20, план перевыполнен; продолжение к паритету)
export { FieldAddress } from './lib/fields/field-address'
export { FieldCheckbox } from './lib/fields/field-checkbox'
export { FieldCombobox } from './lib/fields/field-combobox'
export { FieldDate } from './lib/fields/field-date'
export { FieldDateRange } from './lib/fields/field-date-range'
export { FieldDateTimePicker } from './lib/fields/field-datetime-picker'
export { FieldDuration } from './lib/fields/field-duration'
export { FieldHidden, type HiddenFieldProps } from './lib/fields/field-hidden'
export { FieldNativeSelect } from './lib/fields/field-native-select'
export { FieldNumber } from './lib/fields/field-number'
export { FieldPassword } from './lib/fields/field-password'
export { FieldPinInput } from './lib/fields/field-pin-input'
export { FieldRadioGroup } from './lib/fields/field-radio-group'
export { FieldRating } from './lib/fields/field-rating'
export { FieldSegmentGroup } from './lib/fields/field-segment-group'
export { FieldSelect } from './lib/fields/field-select'
export { FieldSlider } from './lib/fields/field-slider'
export { FieldString } from './lib/fields/field-string'
export { FieldSwitch } from './lib/fields/field-switch'
export { FieldTags } from './lib/fields/field-tags'
export { FieldTextarea } from './lib/fields/field-textarea'
export type {
  AddressFieldProps,
  AddressValue,
  CheckboxFieldProps,
  ComboboxFieldProps,
  DateFieldProps,
  DateRangeFieldProps,
  DateRangePreset,
  DateRangeValue,
  DateTimePickerFieldProps,
  DurationFieldProps,
  NativeSelectFieldProps,
  NumberFieldProps,
  PasswordFieldProps,
  PinInputFieldProps,
  RadioGroupFieldProps,
  RadioOption,
  RatingFieldProps,
  SegmentGroupFieldProps,
  SelectFieldProps,
  SelectOption,
  SliderFieldProps,
  StringFieldProps,
  SwitchFieldProps,
  TagsFieldProps,
  TextareaFieldProps,
} from './lib/fields/types'

// cn() — clsx + tailwind-merge, стандартный shadcn-хелпер
export { cn } from './lib/utils/cn'
