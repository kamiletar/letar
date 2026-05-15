'use client'

import type { ReactElement, ReactNode } from 'react'
import { useDeclarativeForm } from './form-context'

export interface FormDependsOnProps {
  /** Поле от которого зависит валидация/рендеринг */
  field: string
  /** Маппинг значений поля → children */
  cases: Record<string, ReactNode>
  /** Fallback если значение не совпадает ни с одним case */
  fallback?: ReactNode
}

/**
 * Form.DependsOn — каскадный рендеринг по значению поля.
 *
 * Расширение Form.When для множественных вариантов.
 * Вместо нескольких Form.When с одним полем — один DependsOn с cases.
 *
 * @example
 * ```tsx
 * <Form.DependsOn
 *   field="paymentMethod"
 *   cases={{
 *     card: <Form.Field.CreditCard name="card" />,
 *     bank: <Form.Field.String name="iban" label="IBAN" />,
 *     cash: <Text>Оплата наличными при получении</Text>,
 *   }}
 * />
 * ```
 */
export function FormDependsOn({ field, cases, fallback }: FormDependsOnProps): ReactElement | null {
  const { form } = useDeclarativeForm()

  return (
    <form.Subscribe selector={(state: { values: Record<string, unknown> }) => state.values[field]}>
      {(value: unknown) => {
        const key = String(value ?? '')
        const content = cases[key]

        if (content !== undefined) {
          return <>{content}</>
        }

        if (fallback !== undefined) {
          return <>{fallback}</>
        }

        return null
      }}
    </form.Subscribe>
  )
}
