'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useFormContext } from '../context'

export interface FormSubscribeProps {
  /** Render function receiving current form values and state */
  children: (values: Record<string, unknown>, state: { isDirty: boolean; isSubmitting: boolean }) => ReactNode
  /**
   * Debounce delay in milliseconds.
   * When set, children re-renders only after the specified delay
   * since the last change — useful for filter forms driving API calls.
   *
   * @example
   * ```tsx
   * <Form.Subscribe debounce={300}>
   *   {(filters) => <ProductList filters={filters} />}
   * </Form.Subscribe>
   * ```
   */
  debounce?: number
}

/**
 * Subscribe to form values with an optional debounce.
 *
 * Without debounce: re-renders on every field change (real-time).
 * With debounce: re-renders only after the specified idle period.
 *
 * @example Immediate (live preview)
 * ```tsx
 * <Form.Subscribe>
 *   {(values) => <Preview title={values.title} />}
 * </Form.Subscribe>
 * ```
 *
 * @example Debounced (filter → API call)
 * ```tsx
 * <Form.Subscribe debounce={300}>
 *   {(filters) => <ProductList filters={filters} />}
 * </Form.Subscribe>
 * ```
 *
 * @example With form state (isDirty / isSubmitting)
 * ```tsx
 * <Form.Subscribe>
 *   {(_, state) => (
 *     <Button isDisabled={!state.isDirty}>Apply</Button>
 *   )}
 * </Form.Subscribe>
 * ```
 */
export function FormSubscribe({ children, debounce: delay }: FormSubscribeProps): ReactNode {
  const form = useFormContext()

  if (!delay) {
    return (
      <form.Subscribe
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        selector={(state: any) => ({
          values: state.values,
          isDirty: state.isDirty,
          isSubmitting: state.isSubmitting,
        })}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {({ values, isDirty, isSubmitting }: any) =>
          children(values as Record<string, unknown>, { isDirty, isSubmitting })}
      </form.Subscribe>
    )
  }

  return <FormSubscribeDebounced delay={delay}>{children}</FormSubscribeDebounced>
}

// --- Внутренний компонент для debounced режима ---

interface DebouncedProps {
  delay: number
  children: FormSubscribeProps['children']
}

function FormSubscribeDebounced({ delay, children }: DebouncedProps): ReactNode {
  const form = useFormContext()

  const [snapshot, setSnapshot] = useState<{
    values: Record<string, unknown>
    isDirty: boolean
    isSubmitting: boolean
  }>(() => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values: (form.state as any).values as Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isDirty: (form.state as any).isDirty as boolean,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isSubmitting: (form.state as any).isSubmitting as boolean,
  }))

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Форсируем union-тип: инсталлированная в этом lib-контексте версия @tanstack/store
    // типизирует subscribe() как чистую функцию, но у consuming apps (например mandala)
    // может быть резолвлена версия ^0.11+, где subscribe() возвращает { unsubscribe }
    const unsubscribe = form.store.subscribe(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = form.state as any
      const next = {
        values: state.values as Record<string, unknown>,
        isDirty: state.isDirty as boolean,
        isSubmitting: state.isSubmitting as boolean,
      }

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setSnapshot(next), delay)
    }) as (() => void) | { unsubscribe: () => void }

    return () => {
      // TanStack Store v0.9+ возвращает объект { unsubscribe }, а не функцию
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      } else {
        unsubscribe.unsubscribe()
      }
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [form, delay])

  return <>{children(snapshot.values, { isDirty: snapshot.isDirty, isSubmitting: snapshot.isSubmitting })}</>
}
