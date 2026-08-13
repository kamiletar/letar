/**
 * Композиционный слой `@letar/forms-vue`, без единого конкретного поля — Vue-аналог роли,
 * которую для React играет `@letar/forms-react`. Подпуть, а не барellный реэкспорт из `.`:
 * граница проверяется ESLint-правилом (`eslint.config.mjs`, блок `forms-vue/src/lib/core`),
 * не только соглашением. `@letar/forms-vue-shadcn` импортирует именно этот подпуть, а не
 * корневой `.` — второй скин не должен тянуть референсную HTML-реализацию полей.
 */
export { AppForm } from './lib/core/app-form'
export { cardBrandIcon } from './lib/core/card-brand-icon'
export { createField, type FieldRenderArgs, type FieldRenderFn } from './lib/core/create-field'
export { createLazyField } from './lib/core/create-lazy-field'
export { type ResolvedFieldMeta, resolveFieldMeta, withFieldValidation } from './lib/core/field-wiring'
export { type AppFormContext, provideAppForm, useAppFormContext } from './lib/core/form-context'
export {
  DEFAULT_RICH_TEXT_BUTTONS,
  RICH_TEXT_ACTIONS,
  RICH_TEXT_BUTTON_LABELS,
  type RichTextButton,
  type RichTextButtonAction,
} from './lib/core/rich-text-actions'
export {
  camelToTitle,
  fieldInfoToColumn,
  getArrayElementFields,
  mapZodType,
  mergeColumns,
  resolveTableColumns,
} from './lib/core/table-columns'
export {
  type CellCoord,
  type CellFieldType,
  type ResolvedColumn,
  type TableColumnDef,
  type TableEditorController,
  type TableEditorFieldProps,
  type TableFooterDef,
  type ToolbarActionsSlot,
} from './lib/core/table-editor-types'
export { createTableContainerRef, useTableNavigation } from './lib/core/table-navigation'
export {
  useAddressSuggestions,
  type UseAddressSuggestionsOptions,
  type UseAddressSuggestionsResult,
} from './lib/core/use-address-suggestions'
export {
  type CreditCardFieldStatus,
  useCreditCardField,
  type UseCreditCardFieldOptions,
  type UseCreditCardFieldResult,
} from './lib/core/use-credit-card-field'
export {
  type MaskFieldFormatMode,
  type MaskFieldMask,
  useMaskField,
  type UseMaskFieldOptions,
  type UseMaskFieldResult,
} from './lib/core/use-mask-field'
export {
  type PinInputCharType,
  splitPinChars,
  usePinInputField,
  type UsePinInputFieldOptions,
  type UsePinInputFieldResult,
} from './lib/core/use-pin-input-field'
export {
  type RichTextOutputFormat,
  useRichTextField,
  type UseRichTextFieldOptions,
  type UseRichTextFieldResult,
} from './lib/core/use-rich-text-field'
export {
  useSignatureField,
  type UseSignatureFieldOptions,
  type UseSignatureFieldResult,
} from './lib/core/use-signature-field'
