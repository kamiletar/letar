'use client'

import { DeclarativeFormContext } from '@letar/forms-react'
import { useForm } from '@tanstack/react-form'
import type { ReactElement, ReactNode } from 'react'

/**
 * Минимальный form-root для песочницы — `@letar/forms-shadcn` пока не несёт свой `Form`/
 * `createForm()` (Шаг 5 добавлял только Field-компоненты, композиционная точка входа —
 * отдельная задача). Тот же принцип, что у `TestForm` из `@letar/forms-react/testing`, но с
 * реальным `onSubmit` — для визуальной песочницы, а не unit-тестов.
 */
export function DemoForm<TData extends object>(
  { defaultValues, onSubmit, children }: {
    defaultValues: TData
    onSubmit?: (value: TData) => void
    children: ReactNode
  },
): ReactElement {
  const form = useForm({
    defaultValues,
    onSubmit: ({ value }) => onSubmit?.(value as TData),
  })

  return (
    <DeclarativeFormContext.Provider value={{ form }}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          void form.handleSubmit()
        }}
        className="space-y-6"
      >
        {children}
      </form>
    </DeclarativeFormContext.Provider>
  )
}
