'use client'

import { createFormHookContexts } from '@tanstack/react-form'
import { type ReactNode, useMemo } from 'react'
import { useDeclarativeForm } from './declarative/form-context'

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
const formHookContexts = createFormHookContexts()

// Разложено на отдельные экспорты намеренно, не пишите обратно одной деструктуризацией
// (`export const { fieldContext, ... } = createFormHookContexts()`). В таком виде webpack не
// видит здесь имена экспортов: реэкспорт из `src/index.ts` даёт четыре предупреждения
// «export 'fieldContext' (reexported as ...) was not found in './lib/context', possible
// exports: useTypedFormContext, useTypedFormSubscribe» — то есть модуль для него экспортирует
// только function-объявления ниже. В рантайме под webpack все четыре значения при этом
// undefined; сборка не падает, поэтому дефект ловится только чтением лога.
// Проверено в обе стороны на сборке auth-hub: деструктуризация — 4 предупреждения,
// отдельные экспорты — ноль.
//
// ⚠️ Механизм НЕ в том, что «webpack вообще не разбирает деструктуризацию»: тот же паттерн
// в `form-hook.ts` (`export const { useAppForm, withForm } = createFormHook(...)`) и в
// `declarative/form-fields/base/primitives.ts` предупреждений не даёт, хотя реэкспортируется
// из `index.ts` точно так же. Причина не в расширении `.tsx`, а в том, что этот файл содержит
// настоящий JSX (компонент `TypedFormSubscribe` ниже) — SWC с automatic JSX runtime вставляет
// `import { jsx as _jsx } from 'react/jsx-runtime'`, и именно наличие этого импорта в модуле
// (в любом месте файла, порядок не важен) ломает статический анализ webpack для
// деструктурирующего `export const { ... } = ...`, но не для обычных `export function`.
// Подтверждено экспериментально 2026-08-28 — детали и воспроизведение в
// `.claude/docs/webpack-only-app-silent-export-drift.md`. `form-hook.ts`/`primitives.ts`
// переписывать «на всякий случай» не нужно — они не содержат JSX, этот импорт у них не
// появляется. Turbopack разбирает оба варианта нормально, расхождение видно только на
// приложениях с `next build --webpack` (на 2026-08-28 такое одно — auth-hub).
export const fieldContext = formHookContexts.fieldContext
export const formContext = formHookContexts.formContext
export const useFieldContext = formHookContexts.useFieldContext
export const useFormContext = formHookContexts.useFormContext

/**
 * Typed wrapper around the declarative form instance (useDeclarativeForm().form).
 *
 * Solves the typing problem: the raw form API does not accept a type argument,
 * so accessing typed values requires a workaround `as unknown as T`.
 * This hook does it automatically.
 *
 * Must be used inside a declarative `<Form>` — not inside `form.AppForm`/`form.AppField`
 * (those get their own typed form/field via `useAppForm`).
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
  const { form: rawForm } = useDeclarativeForm()

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
      field: <K extends keyof TFormData>(name: K) => (state: { values: unknown }) => (state.values as TFormData)[name],
    }),
    [rawForm],
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
 * Must be used inside a declarative `<Form>` (relies on `useDeclarativeForm()`), not inside
 * `form.AppForm`/`form.AppField`.
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
  const { form } = useDeclarativeForm()

  const TypedSubscribe = useMemo(() => {
    return function TypedFormSubscribe<TSelected,>({
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
