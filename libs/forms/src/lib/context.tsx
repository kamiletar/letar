'use client'

import { createFormHookContexts } from '@tanstack/react-form'
import { type ReactNode, useMemo } from 'react'

/**
 * Form hook contexts for the application
 *
 * These contexts and hooks are used by custom field components
 * to access form and field state without prop drilling.
 *
 * @example
 * ```tsx
 * // In a custom field component
 * import { useFieldContext, useFormContext } from '@letar/forms'
 *
 * function TextField({ label }: { label: string }) {
 *   const field = useFieldContext<string>()
 *   return (
 *     <label>
 *       {label}
 *       <input
 *         value={field.state.value}
 *         onChange={(e) => field.handleChange(e.target.value)}
 *         onBlur={field.handleBlur}
 *       />
 *     </label>
 *   )
 * }
 * ```
 */
export const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts()

/**
 * Typed wrapper around useFormContext.
 *
 * Solves the typing problem: standard useFormContext() does not accept a type argument,
 * so accessing typed values requires a workaround `as unknown as T`.
 * This hook does it automatically.
 *
 * @example
 * ```tsx
 * interface Settings {
 *   fontSize: number
 *   columns: number
 * }
 *
 * function LivePreview() {
 *   const { values, form } = useTypedFormContext<Settings>()
 *
 *   return (
 *     <form.Subscribe selector={(s) => values(s)}>
 *       {(settings) => (
 *         // settings has type Settings
 *         <div style={{ fontSize: settings.fontSize }}>...</div>
 *       )}
 *     </form.Subscribe>
 *   )
 * }
 * ```
 */
export function useTypedFormContext<TFormData extends object>() {
  const rawForm = useFormContext()

  return useMemo(
    () => ({
      /**
       * Original form API from TanStack Form.
       * Use form.store for useStore subscriptions.
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      form: rawForm as any,

      /**
       * Typed setFieldValue.
       * Use instead of form.setFieldValue for proper typing.
       */
      setFieldValue: <K extends keyof TFormData & string>(name: K, value: TFormData[K]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(rawForm.setFieldValue as any)(name, value)
      },

      /**
       * Typed selector for values.
       * Use inside form.Subscribe: `selector={(s) => values(s)}`
       */
      values: (state: { values: unknown }) => state.values as TFormData,

      /**
       * Get current form values (snapshot).
       * Note: this is not reactive! For reactive access use form.Subscribe.
       */
      getValues: () => rawForm.state.values as unknown as TFormData,

      /**
       * Subscribe to a specific field.
       * Returns a selector for use in form.Subscribe.
       */
      field:
        <K extends keyof TFormData>(name: K) =>
        (state: { values: unknown }) =>
          (state.values as TFormData)[name],
    }),
    [rawForm]
  )
}

/**
 * Types for TypedFormSubscribe component
 */
interface TypedFormSubscribeProps<TFormData extends object, TSelected> {
  /** Selector for choosing data from form state */
  selector: (values: TFormData) => TSelected
  /** Render function receiving selected data */
  children: (selected: TSelected) => ReactNode
}

/**
 * Typed Subscribe component for convenient form value subscriptions.
 *
 * @example
 * ```tsx
 * function LivePreview() {
 *   const { TypedSubscribe } = useTypedFormSubscribe<Settings>()
 *
 *   return (
 *     <TypedSubscribe selector={(values) => values.fontSize}>
 *       {(fontSize) => <div style={{ fontSize }}>...</div>}
 *     </TypedSubscribe>
 *   )
 * }
 * ```
 */
export function useTypedFormSubscribe<TFormData extends object>() {
  const form = useFormContext()

  const TypedSubscribe = useMemo(() => {
    return function TypedFormSubscribe<TSelected>({
      selector,
      children,
    }: TypedFormSubscribeProps<TFormData, TSelected>) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wrappedSelector = (state: any) => selector(state.values as unknown as TFormData)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wrappedChildren = children as any
      return <form.Subscribe selector={wrappedSelector}>{wrappedChildren}</form.Subscribe>
    }
  }, [form])

  return { form, TypedSubscribe }
}
