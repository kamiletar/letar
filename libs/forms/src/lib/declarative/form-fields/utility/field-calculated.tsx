'use client'

import { Text } from '@chakra-ui/react'
import type { AnyFieldApi } from '@tanstack/react-form'
import type { ReactElement } from 'react'
import { useEffect } from 'react'
import { FieldWrapper } from '../base/field-wrapper'
import { useResolvedFieldProps } from '../base/use-resolved-field-props'
import { useComputedValue } from './use-computed-value'

/**
 * Props для Form.Field.Calculated
 */
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

/**
 * Внутренний компонент синхронизации вычисленного значения с form state
 */
function CalculatedFieldInner({
  field,
  computedValue,
  format,
  hidden,
}: {
  field: AnyFieldApi
  computedValue: unknown
  format?: (value: unknown) => string
  hidden?: boolean
}) {
  // Синхронизация вычисленного значения в form state
  useEffect(() => {
    if (!Object.is(field.state.value, computedValue)) {
      field.handleChange(computedValue)
    }
  }, [computedValue, field])

  if (hidden) return null

  const displayValue = format ? format(computedValue) : String(computedValue ?? '')

  return (
    <Text fontSize="md" fontWeight="medium" py="2" data-testid="calculated-value">
      {displayValue}
    </Text>
  )
}

/**
 * Form.Field.Calculated — вычисляемое поле формы
 *
 * Автоматически пересчитывает значение при изменении зависимых полей.
 * Значение readonly — пользователь не может редактировать вручную.
 * Вычисленное значение сохраняется в form state и отправляется при submit.
 *
 * @example Калькулятор стоимости
 * ```tsx
 * <Form initialValue={{ price: 100, qty: 2, total: 0 }} onSubmit={save}>
 *   <Form.Field.Number name="price" label="Цена" />
 *   <Form.Field.Number name="qty" label="Количество" />
 *   <Form.Field.Calculated
 *     name="total"
 *     label="Итого"
 *     compute={(v) => (v.price as number) * (v.qty as number)}
 *     format={(v) => `${Number(v).toLocaleString()} ₽`}
 *     deps={['price', 'qty']}
 *   />
 * </Form>
 * ```
 *
 * @example Скрытый режим (вычисление без отображения)
 * ```tsx
 * <Form.Field.Calculated
 *   name="total"
 *   compute={(v) => (v.price as number) * (v.qty as number)}
 *   hidden
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
  const { form, fullPath, ...resolved } = useResolvedFieldProps(name, {
    label,
    helperText,
    readOnly: true,
  })

  // Реактивное вычисление значения
  const computedValue = useComputedValue({
    form,
    compute,
    deps,
    debounce,
    fieldPath: fullPath,
  })

  if (hidden) {
    return (
      <form.Field name={fullPath}>
        {(field: AnyFieldApi) => <CalculatedFieldInner field={field} computedValue={computedValue} hidden />}
      </form.Field>
    )
  }

  return (
    <form.Field name={fullPath}>
      {(field: AnyFieldApi) => (
        <FieldWrapper resolved={resolved} hasError={false} errorMessage="" fullPath={fullPath}>
          <CalculatedFieldInner field={field} computedValue={computedValue} format={format} />
        </FieldWrapper>
      )}
    </form.Field>
  )
}

FieldCalculated.displayName = 'FieldCalculated'
