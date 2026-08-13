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
export { FieldBankAccount, FieldCorrAccount } from './lib/fields/field-bank-account'
export { FieldBIK } from './lib/fields/field-bik'
export { FieldCheckbox } from './lib/fields/field-checkbox'
export { FieldCombobox } from './lib/fields/field-combobox'
export { type CreditCardLayout, FieldCreditCard } from './lib/fields/field-credit-card'
export { FieldCurrency } from './lib/fields/field-currency'
export { FieldDate } from './lib/fields/field-date'
export { type DateRangePreset, type DateRangeValue, FieldDateRange } from './lib/fields/field-date-range'
export { FieldDateTimePicker } from './lib/fields/field-datetime-picker'
export { FieldDuration } from './lib/fields/field-duration'
export { FieldHidden } from './lib/fields/field-hidden'
export { FieldINN } from './lib/fields/field-inn'
export { FieldKPP } from './lib/fields/field-kpp'
export { FieldMaskedInput } from './lib/fields/field-masked-input'
export { FieldNativeSelect, type FieldNativeSelectOption } from './lib/fields/field-native-select'
export { FieldNumber } from './lib/fields/field-number'
export { FieldNumberInput } from './lib/fields/field-number-input'
export { FieldOGRN } from './lib/fields/field-ogrn'
export { FieldPassport } from './lib/fields/field-passport'
export { FieldPassword } from './lib/fields/field-password'
export { FieldPercentage } from './lib/fields/field-percentage'
export { FieldPhone } from './lib/fields/field-phone'
export { FieldRadioGroup, type FieldRadioGroupOption } from './lib/fields/field-radio-group'
export { FieldRating } from './lib/fields/field-rating'
export { FieldSelect, type FieldSelectOption } from './lib/fields/field-select'
export { FieldSlider } from './lib/fields/field-slider'
export { FieldSNILS } from './lib/fields/field-snils'
export { FieldString } from './lib/fields/field-string'
export { FieldSwitch } from './lib/fields/field-switch'
export { FieldTextarea } from './lib/fields/field-textarea'
export { FieldTime } from './lib/fields/field-time'
export { FieldYesNo } from './lib/fields/field-yes-no'

// cn() — clsx + tailwind-merge, стандартный shadcn-хелпер
export { cn } from '@letar/tailwind-utils'
