// Auto field
export { type AutoFieldConfig, type AutoFieldProps, camelCaseToLabel, FieldAuto } from './auto'
// Base utilities from base/
export {
  createField,
  FieldError,
  FieldLabel,
  FieldTooltip,
  FieldWrapper,
  formatFieldErrors,
  hasFieldErrors,
  useDebounce,
  useDeclarativeField,
  useResolvedFieldProps,
} from './base'
export type { CreateFieldOptions, FieldRenderFn, FieldRenderProps, FieldWrapperProps, ResolvedFieldProps } from './base'
export { FieldCheckbox } from './boolean/field-checkbox'
export { FieldSwitch } from './boolean/field-switch'
export { FieldDate } from './datetime/field-date'
export {
  type DateRangeFieldProps,
  type DateRangePreset,
  type DateRangeValue,
  FieldDateRange,
} from './datetime/field-date-range'
export { FieldDateTimePicker } from './datetime/field-datetime-picker'
export { FieldDuration } from './datetime/field-duration'
export {
  type DayOfWeek,
  type DaySchedule,
  FieldSchedule,
  type ScheduleFieldProps,
  type TimeSlot,
  type WeeklySchedule,
} from './datetime/field-schedule'
export { FieldTime } from './datetime/field-time'
export { FieldCurrency } from './number/field-currency'
export { FieldNumber } from './number/field-number'
export { FieldNumberInput } from './number/field-number-input'
export { FieldPercentage } from './number/field-percentage'
export { FieldRating, type RatingFieldProps } from './number/field-rating'
export { FieldSlider, type SliderFieldProps, type SliderMark } from './number/field-slider'
export { type AutocompleteFieldProps, FieldAutocomplete } from './selection/field-autocomplete'
export {
  type CascadingSelectFieldProps,
  type CascadingSelectLoadResult,
  FieldCascadingSelect,
} from './selection/field-cascading-select'
export { type CheckboxCardFieldProps, FieldCheckboxCard } from './selection/field-checkbox-card'
export { type ComboboxFieldProps, FieldCombobox } from './selection/field-combobox'
export { FieldImageChoice, type ImageChoiceFieldProps, type ImageChoiceOption } from './selection/field-image-choice'
export { FieldLikert, type LikertFieldProps } from './selection/field-likert'
export { FieldListbox, type ListboxFieldProps } from './selection/field-listbox'
export {
  FieldMatrixChoice,
  type MatrixChoiceFieldProps,
  type MatrixColumn,
  type MatrixRow,
} from './selection/field-matrix-choice'
export {
  FieldNativeSelect,
  type NativeSelectFieldProps,
  type NativeSelectOption,
} from './selection/field-native-select'
export { FieldRadioCard, type RadioCardFieldProps } from './selection/field-radio-card'
export { FieldRadioGroup, type RadioGroupFieldProps } from './selection/field-radio-group'
export { FieldSegmentedGroup, type SegmentedGroupFieldProps } from './selection/field-segmented-group'
export { FieldSelect, type SelectFieldProps } from './selection/field-select'
export { FieldTags, type TagsFieldProps } from './selection/field-tags'
export { FieldYesNo, type YesNoFieldProps } from './selection/field-yes-no'
export { FieldAddress } from './specialized/field-address'
export { FieldCity } from './specialized/field-city'
export { type ColorPickerFieldProps, FieldColorPicker } from './specialized/field-color-picker'
export { FieldFileUpload, type FileUploadFieldProps } from './specialized/field-file-upload'
export { FieldOTPInput } from './specialized/field-otp-input'
export { FieldPhone } from './specialized/field-phone'
export { FieldPinInput, type PinInputFieldProps } from './specialized/field-pin-input'
export { FieldSignature, type SignatureFieldProps } from './specialized/field-signature'
export { type EditableFieldProps, FieldEditable } from './text/field-editable'
export { FieldMaskedInput } from './text/field-masked-input'
export { FieldPassword } from './text/field-password'
export { FieldPasswordStrength } from './text/field-password-strength'
export { FieldRichText, type RichTextFieldProps } from './text/field-rich-text'
export { FieldString } from './text/field-string'
export { FieldTextarea } from './text/field-textarea'
export {
  DEFAULT_TOOLBAR_BUTTONS,
  TOOLBAR_CONFIG,
  type ToolbarButton,
  type ToolbarButtonConfig,
} from './text/toolbar-config'
export { type CalculatedFieldProps, FieldCalculated } from './utility/field-calculated'
export { FieldHidden, type HiddenFieldProps } from './utility/field-hidden'

// Deprecated type aliases - for backward compatibility
// @deprecated Use base types: BaseOption, GroupableOption, RichOption
import type {
  CheckboxCardOption as _CheckboxCardOption,
  ComboboxOption as _ComboboxOption,
  ListboxOption as _ListboxOption,
  RadioCardOption as _RadioCardOption,
  RadioOption as _RadioOption,
  SegmentedGroupOption as _SegmentedGroupOption,
  SelectOption as _SelectOption,
} from '../types'

/** @deprecated Use RichOption */
export type CheckboxCardOption<T = string> = _CheckboxCardOption<T>
/** @deprecated Use GroupableOption */
export type ComboboxOption<T = string> = _ComboboxOption<T>
/** @deprecated Use GroupableOption */
export type ListboxOption<T = string> = _ListboxOption<T>
/** @deprecated Use RichOption */
export type RadioCardOption<T = string> = _RadioCardOption<T>
/** @deprecated Use BaseOption */
export type RadioOption<T = string> = _RadioOption<T>
/** @deprecated Use BaseOption */
export type SegmentedGroupOption<T = string> = _SegmentedGroupOption<T>
/** @deprecated Use BaseOption */
export type SelectOption<T = string> = _SelectOption<T>
