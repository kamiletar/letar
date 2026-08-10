'use client'

import { DeclarativeFormContext } from '@letar/forms-react'
import { useForm } from '@tanstack/react-form'
import type { ReactElement, ReactNode } from 'react'

/**
 * Минимальный TanStack Form + `DeclarativeFormContext` для изолированного рендера одного
 * поля в тестах — без полного `Form`/`createForm()` (тот живёт в UI-скинах, не в этой
 * библиотеке). `AppFormApi` в контракте контекста — `any` намеренно (см. `forms-react`
 * `context-types.ts`), поэтому базового `useForm()` достаточно.
 */
export function TestForm<TData extends Record<string, unknown>>(
  { defaultValues, children }: { defaultValues: TData; children: ReactNode },
): ReactElement {
  const form = useForm({ defaultValues })

  return <DeclarativeFormContext.Provider value={{ form }}>{children}</DeclarativeFormContext.Provider>
}
