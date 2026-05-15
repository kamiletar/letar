'use client'

import type { PaymentMethod } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { paymentMethodLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: PaymentMethod[] = ['CARD', 'YOOKASSA', 'TINKOFF', 'SBERBANK']

export function SelectPaymentMethod({ name, ...props }: Props): ReactElement {
  const options: SelectOption<PaymentMethod>[] = allValues.map((value) => ({
    label: paymentMethodLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
