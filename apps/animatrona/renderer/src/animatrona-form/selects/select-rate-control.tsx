'use client'

import type { RateControl } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { rateControlLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: RateControl[] = ['VBR', 'CONSTQP', 'CQ']

/**
 * Select для Rate Control профиля кодирования
 */
export function SelectRateControl({ name, ...props }: Props): ReactElement {
  const options: SelectOption<RateControl>[] = allValues.map((value) => ({
    label: rateControlLabels[value],
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
