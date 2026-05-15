'use client'

import type { CustomOrderStatus } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { customOrderStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: CustomOrderStatus[] = ['NEW', 'CONFIRMED', 'IN_PRODUCTION', 'COMPLETED', 'CANCELLED']

export function SelectCustomOrderStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<CustomOrderStatus>[] = allValues.map((value) => ({
    label: customOrderStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
