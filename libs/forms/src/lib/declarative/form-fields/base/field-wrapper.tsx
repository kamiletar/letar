'use client'

import { memo, type ReactElement, type ReactNode } from 'react'
import type { ResolvedFieldProps } from './create-field'
import { chakraUIKit } from './uikit-chakra'

export interface FieldWrapperProps {
  /** Resolved props from createField */
  resolved: ResolvedFieldProps
  /** Whether there are validation errors */
  hasError: boolean
  /** Formatted error message */
  errorMessage: string
  /** Full path for data-field-name attribute */
  fullPath: string
  /** Async-валидация в процессе */
  isValidating?: boolean
  /** Field content (Input, Textarea, etc.) */
  children: ReactNode
}

/**
 * Standard wrapper for simple fields
 *
 * Provides:
 * - Field.Root with invalid/required/disabled/readOnly props
 * - FieldLabel with support for tooltip
 * - FieldError with fallback to helperText
 *
 * Use inside createField render functions for simple Input-like fields
 * with standard layout: Label → Control → Error/Helper
 *
 * @example
 * ```tsx
 * export const FieldString = createField<StringFieldProps, string>({
 *   displayName: 'FieldString',
 *   render: ({ field, fullPath, resolved, hasError, errorMessage }) => (
 *     <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
 *       <Input
 *         value={field.state.value ?? ''}
 *         onChange={(e) => field.handleChange(e.target.value)}
 *         onBlur={field.handleBlur}
 *         placeholder={resolved.placeholder}
 *         data-field-name={fullPath}
 *       />
 *     </FieldWrapper>
 *   ),
 * })
 * ```
 */
export const FieldWrapper = memo(function FieldWrapper({
  resolved,
  hasError,
  errorMessage,
  isValidating,
  children,
}: FieldWrapperProps): ReactElement {
  // Вся вёрстка обёртки идёт через UIKit-контракт (Фаза 7.3). Состояние «идёт async-валидация»
  // передаётся семантическим флагом `validating`, а не css-пропом с Chakra-токенами
  // (`blue.200`/`blue.400`, как было раньше) — как это выглядит, решает адаптер.
  return (
    <chakraUIKit.FieldRoot
      invalid={hasError}
      required={resolved.required}
      disabled={resolved.disabled}
      readOnly={resolved.readOnly}
      validating={isValidating}
    >
      <chakraUIKit.FieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />
      {children}
      <chakraUIKit.FieldError
        hasError={hasError}
        errorMessage={errorMessage}
        helperText={resolved.helperText}
        isValidating={isValidating}
      />
    </chakraUIKit.FieldRoot>
  )
})
