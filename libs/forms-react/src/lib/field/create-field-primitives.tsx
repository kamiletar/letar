'use client'

import type { UIKitCorePrimitives, UIKitExtendedPrimitives } from '@letar/forms-core/uikit'
import type { AnyFieldApi } from '@tanstack/react-form'
import { Component, type ErrorInfo, memo, type ReactElement, type ReactNode } from 'react'
import { useDeclarativeFormOptional } from '../context/form-context'
import type { AppFormApi, BaseFieldProps } from '../types'
import { formatFieldErrors, hasFieldErrors } from './field-utils'
import type { ResolvedFieldProps } from './resolved-field-props'
import { useAsyncFieldValidation } from './use-async-field-validation'
import { useResolvedFieldProps } from './use-resolved-field-props'

/**
 * Тот минимум UIKit-контракта, без которого композиционный слой не может собрать поле.
 *
 * Специально уже полного `UIKit`: скину не нужно реализовать все ~20 примитивов, чтобы
 * получить работающие `createField`/`FieldWrapper` — достаточно обёртки поля, метки, вывода
 * ошибки и fallback'а error boundary. Остальное он подключает по мере миграции своих полей.
 */
export type FieldPrimitivesUIKit =
  & Pick<UIKitCorePrimitives<ReactNode>, 'FieldRoot' | 'FieldLabel' | 'FieldError'>
  & Required<Pick<UIKitExtendedPrimitives<ReactNode>, 'ErrorFallback'>>

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
 * including the field wrapper and error display.
 */
export type FieldRenderFn<P extends BaseFieldProps, TValue = unknown, TState = Record<string, never>> = (
  props: FieldRenderProps<TValue, TState> & { componentProps: Omit<P, keyof BaseFieldProps> },
) => ReactElement

/**
 * Контекст поля, доступный `useFieldState` ещё до монтирования `<form.Field>`.
 *
 * Нужен полям, которым требуется текущее значение поля (или сам `form`) на этапе
 * инициализации локального состояния — например, чтобы синхронизировать `inputValue`
 * с значением из `defaultValues` через `useStore(form.store, ...)` + `useEffect`,
 * оставаясь при этом в рамках правил хуков (`useFieldState` вызывается в теле
 * `FieldComponent`, а не внутри render-prop `<form.Field>`).
 */
export interface FieldStateContext {
  /** Экземпляр формы (TanStack Form `AppFormApi`) */
  form: AppFormApi
  /** Полный путь поля (например, "user.address.city") */
  fullPath: string
}

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
   * @param context - `form`/`fullPath` — доступны здесь, а не только в render-prop
   * @returns State object that will be passed to render as fieldState
   */
  useFieldState?: (
    componentProps: Omit<P, keyof BaseFieldProps>,
    resolved: ResolvedFieldProps,
    context: FieldStateContext,
  ) => TState

  /** Render function (full control over JSX) */
  render: FieldRenderFn<P, TValue, TState>
}

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

export interface FieldErrorBoundaryProps {
  /** Имя поля для отображения в сообщении об ошибке */
  fieldName: string
  children: ReactNode
}

export interface FieldErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Примитивы сборки поля, привязанные к конкретной реализации UIKit.
 */
export interface FieldPrimitives {
  createField: <P extends BaseFieldProps, TValue = unknown, TState = Record<string, never>>(
    options: CreateFieldOptions<P, TValue, TState>,
  ) => (props: P) => ReactElement
  FieldWrapper: (props: FieldWrapperProps) => ReactElement
  FieldErrorBoundary: new(props: FieldErrorBoundaryProps) => Component<
    FieldErrorBoundaryProps,
    FieldErrorBoundaryState
  >
}

/**
 * Фабрика композиционного слоя поля.
 *
 * Это и есть точка инверсии зависимости (Фаза 7.3): раньше `createField`, `FieldWrapper` и
 * `FieldErrorBoundary` импортировали Chakra-адаптер напрямую, из-за чего второй скин был
 * вынужден дублировать всю сборку поля целиком. Теперь скин один раз вызывает эту фабрику со
 * своим UIKit и получает те же примитивы, нарисованные его библиотекой.
 *
 * Возвращаемые компоненты создаются один раз на модуль скина — не внутри рендера, поэтому
 * ремонтирования поддерева при перерисовке формы не происходит.
 *
 * @example
 * ```tsx
 * // В скине (@letar/forms):
 * export const { createField, FieldWrapper, FieldErrorBoundary } = createFieldPrimitives(chakraUIKit)
 * ```
 */
export function createFieldPrimitives(uikit: FieldPrimitivesUIKit): FieldPrimitives {
  /**
   * ErrorBoundary для field-компонентов.
   *
   * Перехватывает ошибки рендеринга внутри отдельного поля формы, показывает fallback вместо
   * краша всей формы. Особенно полезен для кастомных полей через `createForm({ extraFields })`.
   */
  class FieldErrorBoundary extends Component<FieldErrorBoundaryProps, FieldErrorBoundaryState> {
    constructor(props: FieldErrorBoundaryProps) {
      super(props)
      this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): FieldErrorBoundaryState {
      return { hasError: true, error }
    }

    override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
      console.error(`[Form] Ошибка в поле "${this.props.fieldName}":`, error, errorInfo)
    }

    override render(): ReactNode {
      if (this.state.hasError) {
        // Внешний вид fallback'а — деталь UI-адаптера: Chakra рисует красную рамку своими
        // токенами, shadcn — своими, композиционный слой знает только про факт ошибки.
        return <uikit.ErrorFallback fieldName={this.props.fieldName} message={this.state.error?.message} />
      }

      return this.props.children
    }
  }

  /**
   * Standard wrapper for simple fields: Label → Control → Error/Helper.
   */
  const FieldWrapper = memo(function FieldWrapper({
    resolved,
    hasError,
    errorMessage,
    isValidating,
    children,
  }: FieldWrapperProps): ReactElement {
    // Состояние «идёт async-валидация» передаётся семантическим флагом `validating`, а не
    // css-пропом с токенами конкретной темы — как это выглядит, решает адаптер.
    return (
      <uikit.FieldRoot
        invalid={hasError}
        required={resolved.required}
        disabled={resolved.disabled}
        readOnly={resolved.readOnly}
        validating={isValidating}
      >
        <uikit.FieldLabel label={resolved.label} tooltip={resolved.tooltip} required={resolved.required} />
        {children}
        <uikit.FieldError
          hasError={hasError}
          errorMessage={errorMessage}
          helperText={resolved.helperText}
          isValidating={isValidating}
        />
      </uikit.FieldRoot>
    )
  }) as (props: FieldWrapperProps) => ReactElement

  /**
   * Factory function for creating Field components with minimal boilerplate.
   *
   * Automatically:
   * - Resolves props from schema meta and form-level settings
   * - Creates form.Field wrapper
   * - Computes hasError and errorMessage
   * - Calls useFieldState for local state (if provided)
   */
  function createField<P extends BaseFieldProps, TValue = unknown, TState = Record<string, never>>(
    options: CreateFieldOptions<P, TValue, TState>,
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
      const fieldState = useFieldState(componentProps as Omit<P, keyof BaseFieldProps>, resolved, { form, fullPath })

      // Async validation (from props or schema meta)
      const declarativeCtx = useDeclarativeFormOptional()
      const asyncValidation = useAsyncFieldValidation(
        declarativeCtx?.schema,
        fullPath,
        asyncValidate ? { asyncValidate, asyncDebounce, asyncTrigger } : undefined,
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

  return { createField, FieldWrapper, FieldErrorBoundary }
}
