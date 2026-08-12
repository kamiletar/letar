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

// Хуки и утилиты поля
export { resolveAutoComplete } from './lib/field/autocomplete-map'
export { useDeclarativeField } from './lib/field/base-field'
export { type FieldErrorsResult, formatFieldErrors, getFieldErrors, hasFieldErrors } from './lib/field/field-utils'
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
export type {
  MaskFieldFormatMode,
  MaskFieldMask,
  UseMaskFieldOptions,
  UseMaskFieldResult,
} from './lib/field/use-mask-field'
export { useMaskField } from './lib/field/use-mask-field'
export { useResolvedFieldProps } from './lib/field/use-resolved-field-props'

// i18n форм (React-часть; словари и error map — в @letar/forms-core/i18n)
export { FormI18nProvider, getLocalizedValue, useFormI18n, useLocalizedOptions } from './lib/i18n'
export type { LocalizableOption, TranslateFunction, TranslateParams } from './lib/i18n'

// Form.Steps — общая логика навигации/состояния/персистенции шагов (framework-free, без UI)
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
