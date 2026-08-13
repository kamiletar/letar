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

// Form.Group — без своего skin-файла (у него нет визуального представления, только контекст
// пути), реэкспорт headless-реализации из `@letar/forms-vue/core` — та же роль, что у
// `FormGroup` в `@letar/forms` (реэкспорт из `@letar/forms-react` без отдельного файла в
// `@letar/forms-shadcn`).
export { FormGroup, type FormGroupContextValue, type FormGroupProps, useFormGroup } from '@letar/forms-vue/core'

// Form.Steps — Tailwind-скин, композиционная логика переиспользована из `@letar/forms-vue/core`
export { type FormStepsContextValue, useFormStepsContext } from '@letar/forms-vue/core'
export {
  FormSteps,
  FormStepsCompleted,
  FormStepsIndicator,
  FormStepsNavigation,
  FormStepsStep,
  type StepInfo,
  type StepPersistenceConfig,
} from './lib/steps'

// Поля
export { FieldAddress } from './lib/fields/field-address'
export { FieldBankAccount, FieldCorrAccount } from './lib/fields/field-bank-account'
export { FieldBIK } from './lib/fields/field-bik'
export { FieldBirthCertificate } from './lib/fields/field-birth-certificate'
export { FieldCheckbox } from './lib/fields/field-checkbox'
export { FieldCity } from './lib/fields/field-city'
export { FieldColorPicker } from './lib/fields/field-color-picker'
export { FieldCombobox } from './lib/fields/field-combobox'
export { type CreditCardLayout, FieldCreditCard } from './lib/fields/field-credit-card'
export { FieldCurrency } from './lib/fields/field-currency'
export { type DataGridColumnDef, type DataGridFieldProps, FieldDataGrid } from './lib/fields/field-data-grid'
export { FieldDate } from './lib/fields/field-date'
export { type DateRangePreset, type DateRangeValue, FieldDateRange } from './lib/fields/field-date-range'
export { FieldDateTimePicker } from './lib/fields/field-datetime-picker'
export { FieldDepartmentCode } from './lib/fields/field-department-code'
export { FieldDuration } from './lib/fields/field-duration'
export { FieldFileUpload } from './lib/fields/field-file-upload'
export { FieldForeignPassport } from './lib/fields/field-foreign-passport'
export { FieldHidden } from './lib/fields/field-hidden'
export { FieldINN } from './lib/fields/field-inn'
export { FieldKPP } from './lib/fields/field-kpp'
export { FieldLikert } from './lib/fields/field-likert'
export { FieldMaskedInput } from './lib/fields/field-masked-input'
export { FieldMatrixChoice, type MatrixColumn, type MatrixRow } from './lib/fields/field-matrix-choice'
export { FieldNativeSelect, type FieldNativeSelectOption } from './lib/fields/field-native-select'
export { FieldNumber } from './lib/fields/field-number'
export { FieldNumberInput } from './lib/fields/field-number-input'
export { FieldOGRN } from './lib/fields/field-ogrn'
export { FieldOTPInput } from './lib/fields/field-otp-input'
export { FieldPassport } from './lib/fields/field-passport'
export { FieldPassword } from './lib/fields/field-password'
export { FieldPercentage } from './lib/fields/field-percentage'
export { FieldPhone } from './lib/fields/field-phone'
export { FieldPinInput } from './lib/fields/field-pin-input'
export { FieldRadioGroup, type FieldRadioGroupOption } from './lib/fields/field-radio-group'
export { FieldRating } from './lib/fields/field-rating'
export { FieldRichText, type RichTextButton, type RichTextFieldProps } from './lib/fields/field-rich-text'
export { FieldSelect, type FieldSelectOption } from './lib/fields/field-select'
export { FieldSignature } from './lib/fields/field-signature'
export { FieldSlider } from './lib/fields/field-slider'
export { FieldSNILS } from './lib/fields/field-snils'
export { FieldString } from './lib/fields/field-string'
export { FieldSwitch } from './lib/fields/field-switch'
export {
  FieldTableEditor,
  type TableColumnDef,
  type TableEditorFieldProps,
  type TableFooterDef,
} from './lib/fields/field-table-editor'
export { FieldTextarea } from './lib/fields/field-textarea'
export { FieldTime } from './lib/fields/field-time'
export { FieldYesNo } from './lib/fields/field-yes-no'

// cn() — clsx + tailwind-merge, стандартный shadcn-хелпер
export { cn } from '@letar/tailwind-utils'
