'use client'

import { useForm } from '@tanstack/react-form'
import type { ReactElement, ReactNode } from 'react'
import { DeclarativeFormContext } from '../context/form-context'
import { useCreatePendingRegistry, useFormPendingSubmit } from '../context/form-pending'

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
  { defaultValues, children, onFormReady }: {
    defaultValues: TData
    children: ReactNode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form генерик по 8 параметрам, не выводится из TData
    onFormReady?: (form: any) => void
  },
): ReactElement {
  const form = useForm({ defaultValues })
  onFormReady?.(form)
  const pending = useCreatePendingRegistry()
  const submit = useFormPendingSubmit(pending, form)

  return <DeclarativeFormContext.Provider value={{ form, pending, submit }}>{children}</DeclarativeFormContext.Provider>
}
