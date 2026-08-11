'use client'

import { useDeclarativeForm, useFormGroup, useResolvedFieldProps } from '@letar/forms-react'
import type { ReactElement } from 'react'
import { useEffect } from 'react'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import { useComputedValue } from './use-computed-value'

/** Props для Form.Field.Calculated (shadcn-скин). */
export interface CalculatedFieldProps {
  /** Имя поля в форме */
  name?: string
  /** Label поля */
  label?: string
  /** Функция вычисления значения из всех значений формы */
  compute: (values: Record<string, unknown>) => unknown
  /** Форматирование отображаемого значения */
  format?: (value: unknown) => string
  /** Список зависимых полей для оптимизации пересчёта */
  deps?: string[]
  /** Дебаунс вычислений в мс (по умолчанию 0) */
  debounce?: number
  /** Скрытый режим — вычисляет без отображения (как Hidden) */
  hidden?: boolean
  /** Helper text */
  helperText?: string
}

/** Синхронизация вычисленного значения с form state. */
function CalculatedFieldInner({ field, computedValue, format, hidden }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: any
  computedValue: unknown
  format?: (value: unknown) => string
  hidden?: boolean
}): ReactElement | null {
  useEffect(() => {
    if (!Object.is(field.state.value, computedValue)) {
      field.handleChange(computedValue)
    }
  }, [computedValue, field])

  if (hidden) {
    return null
  }

  const displayValue = format ? format(computedValue) : String(computedValue ?? '')

  return (
    <p className="py-2 text-sm font-medium" data-testid="calculated-value">
      {displayValue}
    </p>
  )
}

/**
 * Form.Field.Calculated — shadcn-скин. Вычисляемое поле формы.
 *
 * Автоматически пересчитывает значение при изменении зависимых полей (`useComputedValue`,
 * портирован из Chakra-версии без изменений — framework-free). Значение readonly — пользователь
 * не может редактировать вручную, вычисленное значение сохраняется в form state и отправляется
 * при submit.
 *
 * @example
 * ```tsx
 * <Form.Field.Calculated
 *   name="total"
 *   label="Итого"
 *   compute={(v) => (v.price as number) * (v.qty as number)}
 *   format={(v) => `${Number(v).toLocaleString()} ₽`}
 *   deps={['price', 'qty']}
 * />
 * ```
 */
export function FieldCalculated({
  name,
  label,
  compute,
  format,
  deps,
  debounce = 0,
  hidden,
  helperText,
}: CalculatedFieldProps): ReactElement | null {
  const { form } = useDeclarativeForm()
  useFormGroup()
  const { fullPath, label: resolvedLabel, helperText: resolvedHelperText } = useResolvedFieldProps(name, {
    label,
    helperText,
    readOnly: true,
  })

  const computedValue = useComputedValue({ form, compute, deps, debounce, fieldPath: fullPath })

  if (hidden) {
    return (
      <form.Field name={fullPath}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(field: any) => <CalculatedFieldInner field={field} computedValue={computedValue} hidden />}
      </form.Field>
    )
  }

  return (
    <form.Field name={fullPath}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(field: any) => (
        <shadcnUIKit.FieldRoot invalid={false} readOnly>
          <shadcnUIKit.FieldLabel label={resolvedLabel} />
          <CalculatedFieldInner field={field} computedValue={computedValue} format={format} />
          <shadcnUIKit.FieldError hasError={false} errorMessage={undefined} helperText={resolvedHelperText} />
        </shadcnUIKit.FieldRoot>
      )}
    </form.Field>
  )
}

FieldCalculated.displayName = 'FieldCalculated'
