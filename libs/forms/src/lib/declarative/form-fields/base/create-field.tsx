'use client'

import { Field, HStack, Spinner } from '@chakra-ui/react'
import type { AnyFieldApi } from '@tanstack/react-form'
import type { ReactElement, ReactNode } from 'react'
import { useDeclarativeFormOptional } from '../../form-context'
import type { ZodConstraints } from '../../schema-constraints'
import type { BaseFieldProps, FieldTooltipMeta } from '../../types'
import { FieldErrorBoundary } from './field-error-boundary'
import { FieldLabel } from './field-label'
import { formatFieldErrors, hasFieldErrors } from './field-utils'
import { useAsyncFieldValidation } from './use-async-field-validation'
import { useResolvedFieldProps } from './use-resolved-field-props'

/**
 * Resolved props after applying schema meta and form-level settings
 */
export interface ResolvedFieldProps {
  /** Label (from props or schema meta) */
  label: ReactNode
  /** Placeholder */
  placeholder: string | undefined
  /** Helper text below field (can be automatically generated from constraints) */
  helperText: ReactNode
  /** Tooltip with icon */
  tooltip: FieldTooltipMeta | undefined
  /** Required field (from props or schema) */
  required: boolean | undefined
  /** Field disabled (from props or form-level) */
  disabled: boolean | undefined
  /** Read only (from props or form-level) */
  readOnly: boolean | undefined
  /** Automatic constraints from Zod schema (min, max, minLength, maxLength etc.) */
  constraints: ZodConstraints
  /** Options for select fields (from meta.options with i18n translations) */
  options: Array<{ value: string | number; label: string; disabled?: boolean; i18nKey?: string }> | undefined
  /** HTML autocomplete атрибут (авто-определение по имени поля + meta override) */
  autocomplete: string | undefined
}

/**
 * Props passed to the render function
 */
export interface FieldRenderProps<TValue = unknown, TState = Record<string, never>> {
  /** TanStack Form field API */
  field: AnyFieldApi
  /** Typed field value */
  value: TValue
  /** Full path to the field (for example, "user.address.city") */
  fullPath: string
  /** Resolved props (label, placeholder, etc.) */
  resolved: ResolvedFieldProps
  /** Whether there are validation errors */
  hasError: boolean
  /** Formatted error message */
  errorMessage: string
  /** Async-валидация в процессе */
  isValidating: boolean
  /** Local component state (from useFieldState) */
  fieldState: TState
}

/**
 * Render function for createField
 *
 * Receives field API, resolved props, local state and must return full JSX
 * including Field.Root wrapper and error display.
 */
export type FieldRenderFn<P extends BaseFieldProps, TValue = unknown, TState = Record<string, never>> = (
  props: FieldRenderProps<TValue, TState> & { componentProps: Omit<P, keyof BaseFieldProps> }
) => ReactElement

/**
 * Options for createField
 *
 * @template P - Component props type (extends BaseFieldProps)
 * @template TValue - Field value type
 * @template TState - Local state type (from useFieldState)
 */
export interface CreateFieldOptions<P extends BaseFieldProps, TValue = unknown, TState = Record<string, never>> {
  /** Name for React DevTools */
  displayName: string

  /**
   * Hook for local component state
   *
   * Called at the top level of the component, BEFORE form.Field.
   * Can use useState, useEffect, useCallback, useMemo and other hooks.
   *
   * @param props - Component props (without BaseFieldProps)
   * @param resolved - Resolved props (label, placeholder, etc.)
   * @returns State object that will be passed to render as fieldState
   *
   * @example
   * ```tsx
   * useFieldState: (props) => {
   *   const [visible, setVisible] = useState(props.defaultVisible ?? false)
   *   return { visible, toggle: () => setVisible((v) => !v) }
   * }
   * ```
   */
  useFieldState?: (componentProps: Omit<P, keyof BaseFieldProps>, resolved: ResolvedFieldProps) => TState

  /** Render function (full control over JSX) */
  render: FieldRenderFn<P, TValue, TState>
}

/**
 * Factory function for creating Field components with minimal boilerplate
 *
 * Automatically:
 * - Resolves props from schema meta and form-level settings
 * - Creates form.Field wrapper
 * - Computes hasError and errorMessage
 * - Calls useFieldState for local state (if provided)
 *
 * @example Simple field (Input, Textarea)
 * ```tsx
 * export const FieldString = createField<StringFieldProps, string>({
 *   displayName: 'FieldString',
 *   render: ({ field, resolved, hasError, errorMessage }) => (
 *     <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage}>
 *       <Input
 *         value={field.state.value ?? ''}
 *         onChange={(e) => field.handleChange(e.target.value)}
 *         onBlur={field.handleBlur}
 *       />
 *     </FieldWrapper>
 *   ),
 * })
 * ```
 *
 * @example Field with local state (Password with toggle)
 * ```tsx
 * export const FieldPassword = createField<PasswordFieldProps, string, { visible: boolean; toggle: () => void }>({
 *   displayName: 'FieldPassword',
 *   useFieldState: (props) => {
 *     const [visible, setVisible] = useState(props.defaultVisible ?? false)
 *     return { visible, toggle: () => setVisible((v) => !v) }
 *   },
 *   render: ({ field, resolved, hasError, errorMessage, fieldState }) => (
 *     <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage}>
 *       <InputGroup endElement={<IconButton onClick={fieldState.toggle}>...</IconButton>}>
 *         <Input type={fieldState.visible ? 'text' : 'password'} ... />
 *       </InputGroup>
 *     </FieldWrapper>
 *   ),
 * })
 * ```
 *
 * @example Checkbox with custom label
 * ```tsx
 * export const FieldCheckbox = createField<CheckboxFieldProps, boolean>({
 *   displayName: 'FieldCheckbox',
 *   render: ({ field, resolved, hasError, errorMessage, componentProps }) => (
 *     <Field.Root invalid={hasError} required={resolved.required} disabled={resolved.disabled}>
 *       <Checkbox.Root
 *         checked={!!field.state.value}
 *         onCheckedChange={(e) => field.handleChange(!!e.checked)}
 *         colorPalette={componentProps.colorPalette}
 *       >
 *         <Checkbox.HiddenInput onBlur={field.handleBlur} />
 *         <Checkbox.Control />
 *         {resolved.label && <Checkbox.Label>{resolved.label}</Checkbox.Label>}
 *       </Checkbox.Root>
 *       <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
 *     </Field.Root>
 *   ),
 * })
 * ```
 */
export function createField<P extends BaseFieldProps, TValue = unknown, TState = Record<string, never>>(
  options: CreateFieldOptions<P, TValue, TState>
): (props: P) => ReactElement {
  const { displayName, render } = options
  // Use no-op hook by default so the call is always unconditional
  const useFieldState = options.useFieldState ?? (() => ({}) as TState)

  function FieldComponent(props: P): ReactElement {
    const {
      name,
      label,
      placeholder,
      helperText,
      required,
      disabled,
      readOnly,
      tooltip,
      asyncValidate,
      asyncDebounce,
      asyncTrigger,
      ...componentProps
    } = props

    const { form, fullPath, ...resolvedRest } = useResolvedFieldProps(name, {
      label,
      placeholder,
      helperText,
      required,
      disabled,
      readOnly,
      tooltip,
    })

    const resolved: ResolvedFieldProps = {
      label: resolvedRest.label,
      placeholder: resolvedRest.placeholder,
      helperText: resolvedRest.helperText,
      tooltip: resolvedRest.tooltip,
      required: resolvedRest.required,
      disabled: resolvedRest.disabled,
      readOnly: resolvedRest.readOnly,
      constraints: resolvedRest.constraints,
      options: resolvedRest.options,
      autocomplete: resolvedRest.autocomplete,
    }

    // Call useFieldState at the top level (before form.Field)
    // This allows using hooks inside useFieldState
    const fieldState = useFieldState(componentProps as Omit<P, keyof BaseFieldProps>, resolved)

    // Async validation (from props or schema meta)
    const declarativeCtx = useDeclarativeFormOptional()
    const asyncValidation = useAsyncFieldValidation(
      declarativeCtx?.schema,
      fullPath,
      asyncValidate ? { asyncValidate, asyncDebounce, asyncTrigger } : undefined
    )

    return (
      <FieldErrorBoundary fieldName={fullPath}>
        <form.Field
          name={fullPath}
          {...(asyncValidation.validators ? { validators: asyncValidation.validators } : {})}
          {...(asyncValidation.asyncDebounceMs ? { asyncDebounceMs: asyncValidation.asyncDebounceMs } : {})}
        >
          {(field: AnyFieldApi) => {
            const errors = field.state.meta.errors
            const isTouched = field.state.meta.isTouched
            // Show errors only if field was touched (after blur or programmatic validation)
            const hasError = isTouched && hasFieldErrors(errors)
            const errorMessage = hasError ? formatFieldErrors(errors) : ''

            // Async validation в процессе
            const isValidating = !!field.state.meta.isValidating

            return render({
              field,
              value: field.state.value as TValue,
              fullPath,
              resolved,
              hasError,
              errorMessage,
              isValidating,
              fieldState,
              componentProps: componentProps as Omit<P, keyof BaseFieldProps>,
            })
          }}
        </form.Field>
      </FieldErrorBoundary>
    )
  }

  FieldComponent.displayName = displayName
  return FieldComponent
}

/**
 * Component for displaying errors or hints
 *
 * Helper component for use inside createField render functions.
 * Shows error if present, otherwise helperText.
 *
 * @example
 * ```tsx
 * <FieldError hasError={hasError} errorMessage={errorMessage} helperText={resolved.helperText} />
 * ```
 */
export function FieldError({
  hasError,
  errorMessage,
  helperText,
  isValidating,
}: {
  hasError: boolean
  errorMessage: string
  helperText: ReactNode
  isValidating?: boolean
}): ReactElement | null {
  if (isValidating) {
    return (
      <Field.HelperText color="blue.500">
        <HStack gap={1}>
          <Spinner size="xs" color="blue.500" />
          Проверяю...
        </HStack>
      </Field.HelperText>
    )
  }
  if (hasError) {
    return <Field.ErrorText>{errorMessage}</Field.ErrorText>
  }
  if (helperText) {
    return <Field.HelperText>{helperText}</Field.HelperText>
  }
  return null
}

// Re-export for convenience
export { FieldLabel }
