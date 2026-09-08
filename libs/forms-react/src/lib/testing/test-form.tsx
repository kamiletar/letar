'use client'

import { useForm } from '@tanstack/react-form'
import type { ReactElement, ReactNode } from 'react'
import { DeclarativeFormContext } from '../context/form-context'

/**
 * Минимальный TanStack Form + `DeclarativeFormContext` для изолированного рендера одного
 * поля в тестах — без полного `Form`/`createForm()` (тот живёт в UI-скинах, не в этой
 * библиотеке). `AppFormApi` в контракте контекста — `any` намеренно (см. `forms-react`
 * `context-types.ts`), поэтому базового `useForm()` достаточно.
 *
 * `onFormReady` отдаёт инстанс формы наружу — используй `form.state.values` в тестах для
 * проверки итогового контракта поля (что реально «отправилось» бы при submit), не только
 * его DOM-поведения.
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

  return <DeclarativeFormContext.Provider value={{ form }}>{children}</DeclarativeFormContext.Provider>
}
