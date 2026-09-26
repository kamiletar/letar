'use client'

import { useForm } from '@tanstack/react-form'
import type { ReactElement, ReactNode } from 'react'
import { DeclarativeFormContext } from '../context/form-context'
import { useCreateDependentsRegistry } from '../context/form-dependents'
import { useCreatePendingRegistry, useFormPendingSubmit } from '../context/form-pending'
import type { ZodSchema } from '../types/context-types'

/**
 * Минимальный TanStack Form + `DeclarativeFormContext` для изолированного рендера одного
 * поля в тестах — без полного `Form`/`createForm()` (тот живёт в UI-скинах, не в этой
 * библиотеке). `AppFormApi` в контракте контекста — `any` намеренно (см. `forms-react`
 * `context-types.ts`), поэтому базового `useForm()` достаточно.
 *
 * `onFormReady` отдаёт инстанс формы наружу — используй `form.state.values` в тестах для
 * проверки итогового контракта поля (что реально «отправилось» бы при submit), не только
 * его DOM-поведения.
 *
 * В контекст кладутся реестр ожидания (`pending`) и `submit()` — как у корня формы, чтобы тестировать
 * оптимистичные действия полей (§16.7): `useDeclarativeForm().submit()` ждёт их подтверждения, затем зовёт
 * `form.handleSubmit()`.
 */
export function TestForm<TData extends Record<string, unknown>>(
  { defaultValues, children, onFormReady, schema }: {
    defaultValues: TData
    /** Zod-схема формы: по ней поля выбирают пустое значение при очистке (`null` у nullable) */
    schema?: ZodSchema
    children: ReactNode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form генерик по 8 параметрам, не выводится из TData
    onFormReady?: (form: any) => void
  },
): ReactElement {
  const dependents = useCreateDependentsRegistry()
  // Как у корня формы: form-level листенер сообщает реестру зависимостей о правке поля (§18.3)
  const form = useForm({
    defaultValues,
    listeners: {
      onChange: ({ fieldApi }) => dependents.handleFieldChange(fieldApi.name, fieldApi.state.value),
    },
  })
  onFormReady?.(form)
  const pending = useCreatePendingRegistry()
  const submit = useFormPendingSubmit(pending, form)

  return (
    <DeclarativeFormContext.Provider value={{ form, pending, submit, dependents, schema }}>
      {children}
    </DeclarativeFormContext.Provider>
  )
}
