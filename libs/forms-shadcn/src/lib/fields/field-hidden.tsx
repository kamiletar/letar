'use client'

import { useResolvedFieldProps } from '@letar/forms-react'
import type { AnyFieldApi } from '@tanstack/react-form'
import { type ReactElement, useEffect } from 'react'

export interface HiddenFieldProps {
  name?: string
  value?: unknown
}

function HiddenFieldInner({ field, value }: { field: AnyFieldApi, value?: unknown }): null {
  useEffect(() => {
    if (value !== undefined && !Object.is(field.state.value, value)) {
      field.handleChange(value)
    }
  }, [value, field])

  return null
}

/**
 * Form.Field.Hidden — shadcn-скин. Не рендерит DOM, синхронизирует внешний `value` с form state
 * (UTM-метки, referral-код и т.п.). Не идёт через `createField`/`UIKit` — нечего рендерить.
 */
export function FieldHidden({ name, value }: HiddenFieldProps): ReactElement | null {
  const { form, fullPath } = useResolvedFieldProps(name, {})

  return (
    <form.Field name={fullPath}>{(field: AnyFieldApi) => <HiddenFieldInner field={field} value={value} />}</form.Field>
  )
}

FieldHidden.displayName = 'FieldHidden'
