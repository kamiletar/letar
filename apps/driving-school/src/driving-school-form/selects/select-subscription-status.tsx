'use client'

import type { SubscriptionStatus } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { subscriptionStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: SubscriptionStatus[] = ['ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELLED', 'EXPIRED']

export function SelectSubscriptionStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<SubscriptionStatus>[] = allValues.map((value) => ({
    label: subscriptionStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
