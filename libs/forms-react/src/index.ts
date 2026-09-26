'use client'

/**
 * @letar/forms-react — композиционный слой форм между framework-free ядром
 * (`@letar/forms-core`) и UI-скинами (`@letar/forms` на Chakra, `@letar/forms-shadcn`).
 *
 * Знает React и TanStack Form, не знает ни одной UI-библиотеки: всё, что рисует, приходит
 * снаружи реализацией UIKit-контракта. Граница проверяется линтом — см. блок
 * `**\/forms-react/src/**` в корневом `eslint.config.mjs`.
 */

// Контекст декларативной формы
export { DeclarativeFormContext, useDeclarativeForm, useDeclarativeFormOptional } from './lib/context/form-context'

// Контекст вложенных групп полей (построение путей вида `user.address.street`)
export { FormGroup, useFormGroup } from './lib/context/form-group'
export type { FormGroupContextValue, FormGroupProps } from './lib/context/form-group'

// Фабрика примитивов сборки поля — точка инверсии зависимости от UI-библиотеки
export { createFieldPrimitives } from './lib/field/create-field-primitives'
export type {
  CreateFieldOptions,
  FieldErrorBoundaryProps,
  FieldErrorBoundaryState,
  FieldPrimitives,
  FieldPrimitivesUIKit,
  FieldRenderFn,
  FieldRenderProps,
  FieldStateContext,
  FieldWrapperProps,
} from './lib/field/create-field-primitives'
export type { ResolvedFieldProps } from './lib/field/resolved-field-props'

// Ленивый компонент со встроенным Suspense + клиентским mounted-гейтом (SSR rAF-фикс)
export { createLazyComponent, type LazyComponentImport } from './lib/lazy/create-lazy-component'

// Хуки и утилиты поля
export { resolveAutoComplete } from './lib/field/autocomplete-map'
export { useDeclarativeField } from './lib/field/base-field'
export { type FieldErrorsResult, formatFieldErrors, getFieldErrors, hasFieldErrors } from './lib/field/field-utils'
export { createAsyncActionQuery, useAsyncActionQuery } from './lib/field/use-async-action-query'
export { useAsyncFieldValidation } from './lib/field/use-async-field-validation'
export type { AsyncFieldValidators, AsyncValidateConfig } from './lib/field/use-async-field-validation'
export { useAsyncSearch } from './lib/field/use-async-search'
export type {
  AsyncQueryFn,
  AsyncQueryResult,
  UseAsyncSearchOptions,
  UseAsyncSearchResult,
} from './lib/field/use-async-search'
export { useDebounce } from './lib/field/use-debounce'
export { useEditIntentField } from './lib/field/use-edit-intent-field'
export type { UseEditIntentFieldOptions, UseEditIntentFieldResult } from './lib/field/use-edit-intent-field'
export type {
  MaskFieldFormatMode,
  MaskFieldMask,
  UseMaskFieldOptions,
  UseMaskFieldResult,
} from './lib/field/use-mask-field'
export { useMaskField } from './lib/field/use-mask-field'
export { useNodeLabelWarning } from './lib/field/use-node-label-warning'
export { useOptionsLoader } from './lib/field/use-options-loader'
export type { UseOptionsLoaderResult } from './lib/field/use-options-loader'
export { usePromiseSearch } from './lib/field/use-promise-search'
export type { UsePromiseSearchOptions, UsePromiseSearchResult } from './lib/field/use-promise-search'
export { useResolvedFieldProps } from './lib/field/use-resolved-field-props'
export { useSelectedLoader } from './lib/field/use-selected-loader'
export type { UseSelectedLoaderOptions, UseSelectedLoaderResult } from './lib/field/use-selected-loader'
export { useActionFormErrors } from './lib/form/use-action-form-errors'
export type {
  FormServerActionToaster,
  UseFormServerActionOptions,
  UseFormServerActionResult,
} from './lib/form/use-form-server-action'
export { useFormServerAction } from './lib/form/use-form-server-action'

// Реестр чувствительных полей (EditIntentValue security-инфраструктура)
export {
  SensitiveFieldsProvider,
  useRegisterSensitiveField,
  useSensitiveFieldPaths,
} from './lib/sensitive-fields/sensitive-fields-context'

// i18n форм (React-часть; словари и error map — в @letar/forms-core/i18n)
export { FormI18nProvider, getLocalizedValue, useFormI18n, useLocalizedOptions } from './lib/i18n'
export type { LocalizableOption, TranslateFunction, TranslateParams } from './lib/i18n'

// Form.Steps — общая логика навигации/состояния/персистенции шагов (framework-free, без UI)
export {
  FormStepsFieldRegistryContext,
  type FormStepsFieldRegistryContextValue,
  useFormStepsFieldRegistry,
} from './lib/steps/step-field-registry'
export type { StepDirection, StepInfo } from './lib/steps/step-types'
export {
  useStepNavigation,
  type UseStepNavigationParams,
  type UseStepNavigationResult,
} from './lib/steps/use-step-navigation'
export { type StepPersistenceConfig, useStepPersistence } from './lib/steps/use-step-persistence'
export { useStepState, type UseStepStateResult } from './lib/steps/use-step-state'

// Типы композиционного слоя
export type {
  AppFormApi,
  BaseFieldProps,
  DeclarativeFormContextValue,
  FormApiState,
  FormOfflineState,
  ValidateOn,
  ZodSchema,
} from './lib/types'

export {
  SelectionActionsProvider,
  SelectionOptionProvider,
  useSelectionActions,
  useSelectionOption,
} from './lib/selection/selection-context'
export type {
  SelectionActionsContextValue,
  SelectionActionStrings,
  SelectionOptionContextValue,
  SelectionSlotScope,
} from './lib/selection/selection-context'
export { useSelectionActionsState } from './lib/selection/use-selection-actions-state'
export type {
  RunSelectionActionOptions,
  SelectionActionsState,
  UseSelectionActionsStateOptions,
} from './lib/selection/use-selection-actions-state'
export {
  resetSelectionButtonWarnings,
  useSelectionCreateButton,
  useSelectionEditButton,
} from './lib/selection/use-selection-buttons'
export type {
  SelectionCreateButtonProps,
  SelectionCreateButtonState,
  SelectionEditButtonProps,
  SelectionEditButtonState,
} from './lib/selection/use-selection-buttons'
export { useSelectionSearch } from './lib/selection/use-selection-search'
export type { SelectionSearchState, UseSelectionSearchOptions } from './lib/selection/use-selection-search'
