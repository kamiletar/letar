'use client'

import { EFFECT_TYPE_LABELS, EFFECT_TYPES } from '@/app/[locale]/(main)/mandalas/[slug]/_constants/viewer-constants'
import { FieldSelect } from '@letar/forms'
import type { ReactElement } from 'react'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

/**
 * Select для выбора эффекта по умолчанию (индекс 0-5)
 */
export function SelectDefaultEffect({ name, ...props }: Props): ReactElement {
  const options = EFFECT_TYPES.map((type, index) => ({
    label: EFFECT_TYPE_LABELS[type],
    value: index,
  }))

  return <FieldSelect name={name} options={options} valueType="number" {...props} />
}
