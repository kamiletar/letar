'use client'

import type { AnyFieldApi } from '@tanstack/react-form'
import type { ReactElement } from 'react'
import { useEffect } from 'react'
import { useResolvedFieldProps } from '../base/use-resolved-field-props'

/**
 * Props для Form.Field.Hidden
 */
export interface HiddenFieldProps {
  /** Имя поля в форме */
  name?: string
  /** Значение для установки (обновляется при изменении prop) */
  value?: unknown
}

/**
 * Синхронизация внешнего value с form state
 */
function HiddenFieldInner({ field, value }: { field: AnyFieldApi; value?: unknown }) {
  useEffect(() => {
    if (value !== undefined && !Object.is(field.state.value, value)) {
      field.handleChange(value)
    }
  }, [value, field])

  return null
}

/**
 * Form.Field.Hidden — скрытое поле формы
 *
 * Не рендерится в DOM, но участвует в form state.
 * Полезно для передачи UTM-меток, referral кодов, внутренних ID.
 *
 * @example
 * ```tsx
 * <Form.Field.Hidden name="utm_source" value={searchParams.get('utm_source')} />
 * <Form.Field.Hidden name="referralCode" value="ABC123" />
 * ```
 */
export function FieldHidden({ name, value }: HiddenFieldProps): ReactElement | null {
  const { form, fullPath } = useResolvedFieldProps(name, {})

  return (
    <form.Field name={fullPath}>{(field: AnyFieldApi) => <HiddenFieldInner field={field} value={value} />}</form.Field>
  )
}

FieldHidden.displayName = 'FieldHidden'
