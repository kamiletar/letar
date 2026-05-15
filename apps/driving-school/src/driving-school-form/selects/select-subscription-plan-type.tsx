'use client'

import type { SubscriptionPlanType } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { subscriptionPlanTypeLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: SubscriptionPlanType[] = ['FREE', 'INSTRUCTOR', 'SCHOOL']

export function SelectSubscriptionPlanType({ name, ...props }: Props): ReactElement {
  const options: SelectOption<SubscriptionPlanType>[] = allValues.map((value) => ({
    label: subscriptionPlanTypeLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
