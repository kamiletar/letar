'use client'

import type { PaymentStatus } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { paymentStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: PaymentStatus[] = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']

export function SelectPaymentStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<PaymentStatus>[] = allValues.map((value) => ({
    label: paymentStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
