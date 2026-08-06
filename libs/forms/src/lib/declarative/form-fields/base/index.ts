'use client'

// Factory function for creating Field components
export { createField, FieldError, FieldLabel } from './create-field'
export type { CreateFieldOptions, FieldRenderFn, FieldRenderProps, ResolvedFieldProps } from './create-field'

// ErrorBoundary для перехвата ошибок в полях
export { FieldErrorBoundary } from './field-error-boundary'

// Standard wrapper for simple fields
export { FieldWrapper } from './field-wrapper'
export type { FieldWrapperProps } from './field-wrapper'

// Base hook for fields
export { useDeclarativeField } from './base-field'

// Resolving props considering schema
export { useResolvedFieldProps } from './use-resolved-field-props'

// Utilities for working with errors
export { type FieldErrorsResult, formatFieldErrors, getFieldErrors, hasFieldErrors } from './field-utils'

// Utilities
export { useDebounce } from './use-debounce'

// Async search with debounce
export { useAsyncSearch } from './use-async-search'

// Async field validation
export { useAsyncFieldValidation } from './use-async-field-validation'
export type { AsyncFieldValidators, AsyncValidateConfig } from './use-async-field-validation'
export type { AsyncQueryFn, AsyncQueryResult, UseAsyncSearchOptions, UseAsyncSearchResult } from './use-async-search'

// Tooltip component
export { FieldTooltip } from './field-tooltip'

// Unified label for selection fields
export { SelectionFieldLabel } from './selection-field-label'
export type { SelectionFieldLabelProps } from './selection-field-label'

// Grouping options for selection fields
export { getOptionLabel, useGroupedOptions } from './use-grouped-options'
export type { GroupedOptionsResult } from './use-grouped-options'
