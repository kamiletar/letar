'use client'

import type { PenaltyStatus } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { penaltyStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: PenaltyStatus[] = ['CHARGED', 'PAID', 'CANCELLED']

export function SelectPenaltyStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<PenaltyStatus>[] = allValues.map((value) => ({
    label: penaltyStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
