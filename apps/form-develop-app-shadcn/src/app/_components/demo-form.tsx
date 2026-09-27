'use client'

import {
  DeclarativeFormContext,
  useCreateDependentsRegistry,
  useCreatePendingRegistry,
  useFormPendingSubmit,
} from '@letar/forms-react'
import { useForm } from '@tanstack/react-form'
import type { ReactElement, ReactNode } from 'react'

/**
 * Минимальный form-root для песочницы — `@letar/forms-shadcn` пока не несёт свой `Form`/
 * `createForm()` (Шаг 5 добавлял только Field-компоненты, композиционная точка входа —
 * отдельная задача). Тот же принцип, что у `TestForm` из `@letar/forms-react/testing`, но с
 * реальным `onSubmit` — для визуальной песочницы, а не unit-тестов.
 */
export function DemoForm<TData extends object>(
  { defaultValues, onSubmit, schema, children }: {
    defaultValues: TData
    onSubmit?: (value: TData) => void
    /** Zod-схема — нужна только `Form.Field.Auto` для авто-детекции типа поля */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema?: any
    children: ReactNode
  },
): ReactElement {
  // Реестры — как у корня формы: без них не работают очистка зависимых полей (`dependsOn`) и ожидание
  // оптимистичных `onCreate`/`onUpdate` перед отправкой
  const dependents = useCreateDependentsRegistry()
  const pending = useCreatePendingRegistry()
  const form = useForm({
    defaultValues,
    // Form-level листенер сообщает реестру зависимостей о правке поля (но не о reset/гидратации)
    listeners: {
      onChange: ({ fieldApi }) => dependents.handleFieldChange(fieldApi.name, fieldApi.state.value),
    },
    onSubmit: ({ value }) => onSubmit?.(value as TData),
  })
  const submit = useFormPendingSubmit(pending, form)

  return (
    <DeclarativeFormContext.Provider value={{ form, schema, pending, dependents, submit }}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          void submit()
        }}
        className="space-y-6"
      >
        {children}
      </form>
    </DeclarativeFormContext.Provider>
  )
}
