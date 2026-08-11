// UIKit-контракт (Radix + cva + tailwind-merge реализация)
export { type ShadcnUIKit, shadcnUIKit } from './lib/uikit/uikit-shadcn'

// Композиционный слой, связанный со shadcnUIKit
export { createField, FieldErrorBoundary, FieldWrapper } from './lib/uikit/primitives'

// Поля (Шаг 5 — 17 из 15-20, план перевыполнен; продолжение к паритету)
export { FieldAddress } from './lib/fields/field-address'
export { FieldAutocomplete } from './lib/fields/field-autocomplete'
export { FieldCheckbox } from './lib/fields/field-checkbox'
export { FieldCheckboxCard } from './lib/fields/field-checkbox-card'
export { FieldCity } from './lib/fields/field-city'
export { FieldColorPicker } from './lib/fields/field-color-picker'
export { FieldCombobox } from './lib/fields/field-combobox'
export { FieldCurrency } from './lib/fields/field-currency'
export { FieldDate } from './lib/fields/field-date'
export { FieldDateRange } from './lib/fields/field-date-range'
export { FieldDateTimePicker } from './lib/fields/field-datetime-picker'
export { FieldDuration } from './lib/fields/field-duration'
export { FieldEditable } from './lib/fields/field-editable'
export { FieldFileUpload } from './lib/fields/field-file-upload'
export { FieldHidden, type HiddenFieldProps } from './lib/fields/field-hidden'
export { FieldListbox } from './lib/fields/field-listbox'
export { FieldNativeSelect } from './lib/fields/field-native-select'
export { FieldNumber } from './lib/fields/field-number'
export { FieldOTPInput } from './lib/fields/field-otp-input'
export { FieldPassword } from './lib/fields/field-password'
export { FieldPercentage } from './lib/fields/field-percentage'
export { FieldPhone } from './lib/fields/field-phone'
export { FieldPinInput } from './lib/fields/field-pin-input'
export { FieldRadioCard } from './lib/fields/field-radio-card'
export { FieldRadioGroup } from './lib/fields/field-radio-group'
export { FieldRating } from './lib/fields/field-rating'
export { FieldRichText } from './lib/fields/field-rich-text'
export { FieldSegmentGroup } from './lib/fields/field-segment-group'
export { FieldSelect } from './lib/fields/field-select'
export { FieldSignature } from './lib/fields/field-signature'
export { FieldSlider } from './lib/fields/field-slider'
export { FieldString } from './lib/fields/field-string'
export { FieldSwitch } from './lib/fields/field-switch'
export { FieldTags } from './lib/fields/field-tags'
export { FieldTextarea } from './lib/fields/field-textarea'
export { FieldYesNo } from './lib/fields/field-yes-no'

// Form.Field.TableEditor — не createField()-поле, компонует form.Field(mode="array") напрямую
export { FieldTableEditor } from './lib/table'
export type { TableEditorContextValue, TableEditorFieldProps } from './lib/table'

// Form.Steps — compound-компонент форм-уровня (beta), не createField()-поле
export type {
  AddressFieldProps,
  AddressValue,
  AutocompleteFieldProps,
  CheckboxCardFieldProps,
  CheckboxFieldProps,
  CityFieldProps,
  ColorPickerFieldProps,
  ComboboxFieldProps,
  CurrencyFieldProps,
  DateFieldProps,
  DateRangeFieldProps,
  DateRangePreset,
  DateRangeValue,
  DateTimePickerFieldProps,
  DurationFieldProps,
  EditableFieldProps,
  FileUploadFieldProps,
  ListboxFieldProps,
  ListboxOption,
  NativeSelectFieldProps,
  NumberFieldProps,
  OTPInputFieldProps,
  PasswordFieldProps,
  PercentageFieldProps,
  PhoneCountry,
  PhoneFieldProps,
  PinInputFieldProps,
  RadioCardFieldProps,
  RadioGroupFieldProps,
  RadioOption,
  RatingFieldProps,
  RichOption,
  RichTextFieldProps,
  SegmentGroupFieldProps,
  SelectFieldProps,
  SelectOption,
  SignatureFieldProps,
  SignatureStroke,
  SliderFieldProps,
  StringFieldProps,
  StrokePoint,
  SwitchFieldProps,
  TagsFieldProps,
  TextareaFieldProps,
  YesNoFieldProps,
} from './lib/fields/types'
export { FormSteps } from './lib/steps'
export type {
  FormStepsCompletedContentProps,
  FormStepsIndicatorProps,
  FormStepsNavigationProps,
  FormStepsProps,
  FormStepsStepProps,
  StepPersistenceConfig,
} from './lib/steps'

// cn() — clsx + tailwind-merge, стандартный shadcn-хелпер
export { cn } from './lib/utils/cn'
