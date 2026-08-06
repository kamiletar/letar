'use client'

import type { ComponentType, ReactElement, ReactNode } from 'react'
import { CaptchaContext } from '../captcha/captcha-context'
import { CaptchaField } from '../captcha/captcha-field'
import type { CaptchaConfig, CaptchaFieldProps } from '../captcha/types'
import type { AutoFieldsProps } from './form-auto-fields'
import type { ResetButtonProps } from './form-buttons'
import type {
  AutocompleteFieldProps,
  CheckboxCardFieldProps,
  ColorPickerFieldProps,
  ComboboxFieldProps,
  DateRangeFieldProps,
  EditableFieldProps,
  FileUploadFieldProps,
  ImageChoiceFieldProps,
  LikertFieldProps,
  ListboxFieldProps,
  MatrixChoiceFieldProps,
  NativeSelectFieldProps,
  PinInputFieldProps,
  RadioCardFieldProps,
  RadioGroupFieldProps,
  RatingFieldProps,
  RichTextFieldProps,
  ScheduleFieldProps,
  SegmentedGroupFieldProps,
  SelectFieldProps,
  SliderFieldProps,
  TagsFieldProps,
  YesNoFieldProps,
} from './form-fields'
import type { CreditCardFieldProps } from './form-fields/specialized/credit-card'
import type { DataGridFieldProps, TableEditorFieldProps } from './form-fields/table'
import type { FormFromSchemaProps } from './form-from-schema'
import type {
  FormStepsIndicatorProps,
  FormStepsNavigationProps,
  FormStepsProps,
  FormStepsStepProps,
} from './form-steps'
import { Form } from './index'
import { createLazyComponents, type LazyComponentImport } from './lazy-component'
import type {
  AddressFieldProps,
  CheckboxFieldProps,
  CurrencyFieldProps,
  DateFieldProps,
  DateTimePickerFieldProps,
  DurationFieldProps,
  FormGroupListDeclarativeProps,
  FormPropsWithApi,
  MaskedInputFieldProps,
  NumberFieldProps,
  NumberInputFieldProps,
  OTPInputFieldProps,
  PasswordFieldProps,
  PasswordStrengthFieldProps,
  PercentageFieldProps,
  PhoneFieldProps,
  StringFieldProps,
  SubmitButtonProps,
  SwitchFieldProps,
  TextareaFieldProps,
  TimeFieldProps,
} from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>

interface CreateFormOptions {
  /** Extra field components to add to Form.Field */
  extraFields?: Record<string, AnyComponent>
  /** Extra button components to add to Form.Button */
  extraButtons?: Record<string, AnyComponent>
  /** Extra select components to add to Form.Select (synchronous) */
  extraSelects?: Record<string, AnyComponent>
  /** Extra combobox components to add to Form.Combobox (synchronous) */
  extraComboboxes?: Record<string, AnyComponent>
  /** Extra listbox components to add to Form.Listbox (synchronous) */
  extraListboxes?: Record<string, AnyComponent>
  /**
   * Default address suggestion provider for Form.Field.Address and Form.Field.City.
   * Set once here instead of passing `provider` prop to every field.
   *
   * @example
   * ```tsx
   * import { createForm, createDaDataProvider } from '@letar/forms'
   *
   * const AppForm = createForm({
   *   addressProvider: createDaDataProvider({ token: process.env.DADATA_TOKEN }),
   * })
   *
   * <AppForm.Field.Address name="address" />
   * <AppForm.Field.City name="city" />
   * ```
   */
  addressProvider?: import('./form-fields/specialized/providers').AddressProvider

  /**
   * Lazy Select components — loaded only at render time
   *
   * @example
   * ```tsx
   * lazySelects: {
   *   Type: () => import('./selects/select-type').then(m => m.SelectType),
   *   Status: () => import('./selects/select-status').then(m => m.SelectStatus),
   * }
   * ```
   */
  lazySelects?: Record<string, LazyComponentImport>

  /**
   * Lazy Combobox components — loaded only at render time
   *
   * @example
   * ```tsx
   * lazyComboboxes: {
   *   User: () => import('./comboboxes/combobox-user').then(m => m.ComboboxUser),
   * }
   * ```
   */
  lazyComboboxes?: Record<string, LazyComponentImport>

  /**
   * Настройки CAPTCHA по умолчанию для всех форм приложения.
   * Можно переопределить на уровне конкретной формы через пропсы <Form.Captcha>.
   *
   * @example
   * ```tsx
   * const AppForm = createForm({
   *   captcha: {
   *     provider: 'turnstile',
   *     siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
   *     theme: 'auto',
   *   },
   * })
   *
   * // <AppForm.Captcha /> без пропсов использует настройки из createForm
   * ```
   */
  captcha?: CaptchaConfig

  /**
   * Lazy Listbox components — loaded only at render time
   *
   * @example
   * ```tsx
   * lazyListboxes: {
   *   Tags: () => import('./listboxes/listbox-tags').then(m => m.ListboxTags),
   * }
   * ```
   */
  lazyListboxes?: Record<string, LazyComponentImport>
}

interface ListButton {
  Add: AnyComponent
  Remove: AnyComponent
  DragHandle: AnyComponent
}

interface ExtendedFormGroupList {
  (props: FormGroupListDeclarativeProps): ReactElement
  Button: ListButton
}

interface ExtendedFormGroup {
  (props: { name: string; children: ReactNode }): ReactElement
  List: ExtendedFormGroupList
}

interface ExtendedFormField {
  String: (props: StringFieldProps) => ReactElement
  Number: (props: NumberFieldProps) => ReactElement
  NumberInput: (props: NumberInputFieldProps) => ReactElement
  Currency: (props: CurrencyFieldProps) => ReactElement
  Percentage: (props: PercentageFieldProps) => ReactElement
  MaskedInput: (props: MaskedInputFieldProps) => ReactElement
  Phone: (props: PhoneFieldProps) => ReactElement
  Address: (props: AddressFieldProps) => ReactElement
  Textarea: (props: TextareaFieldProps) => ReactElement
  Date: (props: DateFieldProps) => ReactElement
  DateRange: (props: DateRangeFieldProps) => ReactElement
  DateTimePicker: (props: DateTimePickerFieldProps) => ReactElement
  Time: (props: TimeFieldProps) => ReactElement
  Duration: (props: DurationFieldProps) => ReactElement
  Password: (props: PasswordFieldProps) => ReactElement
  PasswordStrength: (props: PasswordStrengthFieldProps) => ReactElement
  PinInput: (props: PinInputFieldProps) => ReactElement
  OTPInput: (props: OTPInputFieldProps) => ReactElement
  Slider: (props: SliderFieldProps) => ReactElement
  Select: (props: SelectFieldProps) => ReactElement
  NativeSelect: <T extends string>(props: NativeSelectFieldProps<T>) => ReactElement
  Combobox: <T extends string, TData = unknown>(props: ComboboxFieldProps<T, TData>) => ReactElement
  Autocomplete: <TData = unknown>(props: AutocompleteFieldProps<TData>) => ReactElement
  Listbox: <T extends string>(props: ListboxFieldProps<T>) => ReactElement
  RadioGroup: <T extends string>(props: RadioGroupFieldProps<T>) => ReactElement
  RadioCard: <T extends string>(props: RadioCardFieldProps<T>) => ReactElement
  Rating: (props: RatingFieldProps) => ReactElement
  SegmentedGroup: <T extends string>(props: SegmentedGroupFieldProps<T>) => ReactElement
  Checkbox: (props: CheckboxFieldProps) => ReactElement
  CheckboxCard: <T extends string>(props: CheckboxCardFieldProps<T>) => ReactElement
  Switch: (props: SwitchFieldProps) => ReactElement
  ColorPicker: (props: ColorPickerFieldProps) => ReactElement
  Editable: (props: EditableFieldProps) => ReactElement
  Schedule: (props: ScheduleFieldProps) => ReactElement
  FileUpload: (props: FileUploadFieldProps) => ReactElement
  RichText: (props: RichTextFieldProps) => ReactElement
  Tags: (props: TagsFieldProps) => ReactElement
  MatrixChoice: (props: MatrixChoiceFieldProps) => ReactElement
  ImageChoice: (props: ImageChoiceFieldProps) => ReactElement
  Likert: (props: LikertFieldProps) => ReactElement
  YesNo: (props: YesNoFieldProps) => ReactElement
  TableEditor: (props: TableEditorFieldProps) => ReactElement
  DataGrid: (props: DataGridFieldProps) => ReactElement
  CreditCard: (props: CreditCardFieldProps) => ReactElement
  [key: string]: AnyComponent
}

interface ExtendedFormButton {
  Submit: (props: SubmitButtonProps) => ReactElement
  Reset: (props: ResetButtonProps) => ReactElement
  [key: string]: AnyComponent
}

interface ExtendedFormSelect {
  [key: string]: AnyComponent
}

interface ExtendedFormCombobox {
  [key: string]: AnyComponent
}

interface ExtendedFormListbox {
  [key: string]: AnyComponent
}

interface ExtendedFormSteps {
  (props: FormStepsProps): ReactElement
  Step: (props: FormStepsStepProps) => ReactElement
  Indicator: (props: FormStepsIndicatorProps) => ReactElement
  Navigation: (props: FormStepsNavigationProps) => ReactElement
  CompletedContent: (props: { children: ReactNode }) => ReactElement
}

export interface ExtendedForm {
  <TData extends object>(props: FormPropsWithApi<TData>): ReactElement
  Group: ExtendedFormGroup
  Field: ExtendedFormField
  Button: ExtendedFormButton
  Select: ExtendedFormSelect
  Combobox: ExtendedFormCombobox
  Listbox: ExtendedFormListbox
  Errors: (props: { title?: ReactNode }) => ReactElement | null
  DirtyGuard: (props: {
    message?: string
    dialogTitle?: string
    dialogDescription?: string
    confirmText?: string
    cancelText?: string
    enabled?: boolean
    onBlock?: () => boolean | void
  }) => ReactElement | null
  When: <TValue = unknown>(props: {
    field: string
    is?: TValue
    isNot?: TValue
    in?: TValue[]
    notIn?: TValue[]
    condition?: (value: TValue) => boolean
    children: ReactNode
    fallback?: ReactNode
  }) => ReactNode
  Steps: ExtendedFormSteps
  Captcha: (props: CaptchaFieldProps) => ReactElement | null
  AutoFields: (props: AutoFieldsProps) => ReactElement
  FromSchema: <TData extends object>(props: FormFromSchemaProps<TData>) => ReactElement
}

/**
 * Create an extended Form component with app-specific fields
 *
 * @example
 * ```tsx
 * // In your app
 * import { createForm } from '@letar/forms'
 * import { SelectType } from './select-type'
 * import { ComboboxInstructor } from './combobox-instructor'
 * import { ListboxLicenseCategories } from './listbox-license-categories'
 *
 * export const AppForm = createForm({
 *   extraSelects: { Type: SelectType },
 *   extraComboboxes: { Instructor: ComboboxInstructor },
 *   extraListboxes: { LicenseCategories: ListboxLicenseCategories },
 * })
 *
 * // Usage
 * <AppForm initialValue={data} onSubmit={save}>
 *   <AppForm.Select.Type name="type" />
 *   <AppForm.Combobox.Instructor name="instructorId" />
 *   <AppForm.Listbox.LicenseCategories name="categories" />
 *   <AppForm.Field.String name="title" />
 *   <AppForm.Button.Submit />
 * </AppForm>
 * ```
 */
export function createForm(options: CreateFormOptions = {}): ExtendedForm {
  const {
    extraFields = {},
    extraButtons = {},
    extraSelects = {},
    extraComboboxes = {},
    extraListboxes = {},
    lazySelects = {},
    lazyComboboxes = {},
    lazyListboxes = {},
    addressProvider,
    captcha,
  } = options

  // Create lazy wrappers for components
  const lazySelectComponents = createLazyComponents(lazySelects)
  const lazyComboboxComponents = createLazyComponents(lazyComboboxes)
  const lazyListboxComponents = createLazyComponents(lazyListboxes)

  const ExtendedField = {
    ...Form.Field,
    ...extraFields,
  }

  const ExtendedButton = {
    ...Form.Button,
    ...extraButtons,
  }

  // Merge synchronous and lazy components
  const ExtendedSelect = {
    ...extraSelects,
    ...lazySelectComponents,
  }

  const ExtendedCombobox = {
    ...extraComboboxes,
    ...lazyComboboxComponents,
  }

  const ExtendedListbox = {
    ...extraListboxes,
    ...lazyListboxComponents,
  }

  const ExtendedForm = Object.assign(
    // Root component — оборачивает в CaptchaContext если captcha задан
    function ExtendedFormRoot<TData extends object>(props: FormPropsWithApi<TData>) {
      // Inject addressProvider from createForm if not set on Form props
      const mergedProps = addressProvider && !props.addressProvider ? { ...props, addressProvider } : props
      const formElement = Form(mergedProps)

      // Оборачиваем в CaptchaContext если captcha конфиг задан
      if (captcha) {
        return <CaptchaContext value={captcha}>{formElement}</CaptchaContext>
      }

      return formElement
    },
    {
      Group: Form.Group,
      Field: ExtendedField,
      Button: ExtendedButton,
      Select: ExtendedSelect,
      Combobox: ExtendedCombobox,
      Listbox: ExtendedListbox,
      Errors: Form.Errors,
      DebugValues: Form.DebugValues,
      DirtyGuard: Form.DirtyGuard,
      Captcha: CaptchaField,
      When: Form.When,
      Steps: Form.Steps,
      AutoFields: Form.AutoFields,
      FromSchema: Form.FromSchema,
    },
  )

  return ExtendedForm as ExtendedForm
}
