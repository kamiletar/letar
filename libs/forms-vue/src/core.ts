/**
 * Композиционный слой `@letar/forms-vue`, без единого конкретного поля — Vue-аналог роли,
 * которую для React играет `@letar/forms-react`. Подпуть, а не барellный реэкспорт из `.`:
 * граница проверяется ESLint-правилом (`eslint.config.mjs`, блок `forms-vue/src/lib/core`),
 * не только соглашением. `@letar/forms-vue-shadcn` импортирует именно этот подпуть, а не
 * корневой `.` — второй скин не должен тянуть референсную HTML-реализацию полей.
 */
export { AppForm } from './lib/core/app-form'
export { createField, type FieldRenderArgs, type FieldRenderFn } from './lib/core/create-field'
export { type ResolvedFieldMeta, resolveFieldMeta, withFieldValidation } from './lib/core/field-wiring'
export { type AppFormContext, provideAppForm, useAppFormContext } from './lib/core/form-context'
export {
  type MaskFieldFormatMode,
  type MaskFieldMask,
  useMaskField,
  type UseMaskFieldOptions,
  type UseMaskFieldResult,
} from './lib/core/use-mask-field'
