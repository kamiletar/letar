'use client'

import type { SubOrderStatus } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { subOrderStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: SubOrderStatus[] = [
  'PENDING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'RETURN_REQUESTED',
  'RETURNED',
  'CANCELLED',
]

export function SelectSubOrderStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<SubOrderStatus>[] = allValues.map((value) => ({
    label: subOrderStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
