'use client'

import type { ValidationError } from '@tanstack/react-form'

/**
 * Formats validation errors into a string for display
 *
 * Handles various error formats:
 * - Strings (returned as-is)
 * - Objects with `message` (StandardSchemaV1Issue, ZodIssue)
 * - Objects with `issues` array (ZodError)
 * - Nested error structures
 *
 * @example
 * ```tsx
 * const errors = field.state.meta.errors
 * {hasFieldErrors(errors) && (
 *   <Field.ErrorText>{formatFieldErrors(errors)}</Field.ErrorText>
 * )}
 * ```
 */
export function formatFieldErrors(errors: ValidationError[]): string {
  return errors
    .map((e) => extractErrorMessage(e))
    .filter(Boolean)
    .join(', ')
}

/**
 * Extracts error message from various formats
 *
 * @internal
 */
function extractErrorMessage(e: ValidationError): string {
  // String error
  if (typeof e === 'string') {
    return e
  }

  // Null/undefined
  if (e === null || e === undefined) {
    return ''
  }

  // Object with error
  if (typeof e === 'object') {
    // Array of errors (Zod issues from superRefine, array of strings etc.)
    if (Array.isArray(e)) {
      return e
        .map((item: unknown) => {
          // Element with message (ZodIssue)
          if (typeof item === 'object' && item && 'message' in item) {
            return (item as { message: string }).message
          }
          // String
          if (typeof item === 'string') {
            return item
          }
          return ''
        })
        .filter(Boolean)
        .join(', ')
    }

    // Standard format: { message: string }
    if ('message' in e && typeof e.message === 'string') {
      return e.message
    }

    // Zod format with issues array: { issues: Array<{ message: string }> }
    if ('issues' in e && Array.isArray(e.issues)) {
      return e.issues
        .map((issue: unknown) => {
          if (typeof issue === 'object' && issue && 'message' in issue) {
            return (issue as { message: string }).message
          }
          return ''
        })
        .filter(Boolean)
        .join(', ')
    }

    // Zod flat errors: { fieldErrors: Record<string, string[]> }
    if ('fieldErrors' in e && typeof e.fieldErrors === 'object' && e.fieldErrors) {
      const fieldErrors = e.fieldErrors as Record<string, string[]>
      return Object.values(fieldErrors).flat().filter(Boolean).join(', ')
    }

    // Zod format errors: { _errors: string[] }
    if ('_errors' in e && Array.isArray(e._errors)) {
      return (e._errors as string[]).filter(Boolean).join(', ')
    }

    // Fallback: try JSON.stringify for debugging
    // This is better than [object Object], can detect unknown formats
    try {
      const json = JSON.stringify(e)
      // If JSON is too long or empty object, don't show
      if (json === '{}' || json.length > 200) {
        return ''
      }
      // Log in dev mode for debugging unknown formats
      if (process.env.NODE_ENV === 'development') {
        console.warn('[form-components] Unknown error format:', e)
      }
      return json
    } catch {
      return ''
    }
  }

  // Other types (number, boolean) — unlikely, but handled
  return String(e)
}

/**
 * Checks for the presence of validation errors
 *
 * @example
 * ```tsx
 * const errors = field.state.meta.errors
 * const hasError = hasFieldErrors(errors)
 * ```
 */
export function hasFieldErrors(errors: ValidationError[] | undefined): errors is ValidationError[] {
  return Boolean(errors && errors.length > 0)
}

/**
 * Interface for useFieldErrors result
 */
export interface FieldErrorsResult {
  /** Validation errors */
  errors: ValidationError[]
  /** Whether there are errors */
  hasError: boolean
  /** Formatted error message */
  errorMessage: string
}

/**
 * Extracts error information from field API
 *
 * Simplifies error retrieval in manual Field components
 * that do not use the createField factory.
 *
 * @example
 * ```tsx
 * <form.Field name={fullPath}>
 *   {(field: AnyFieldApi) => {
 *     const { hasError, errorMessage } = getFieldErrors(field)
 *     return (
 *       <Field.Root invalid={hasError}>
 *         ...
 *         <FieldError hasError={hasError} errorMessage={errorMessage} />
 *       </Field.Root>
 *     )
 *   }}
 * </form.Field>
 * ```
 */
export function getFieldErrors(field: { state: { meta: { errors?: ValidationError[] } } }): FieldErrorsResult {
  const errors = field.state.meta.errors ?? []
  const hasError = hasFieldErrors(errors)
  const errorMessage = hasError ? formatFieldErrors(errors) : ''
  return { errors, hasError, errorMessage }
}
