'use client'

import type { PenaltyType } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { penaltyTypeLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: PenaltyType[] = ['LATE_CANCEL', 'NO_SHOW']

export function SelectPenaltyType({ name, ...props }: Props): ReactElement {
  const options: SelectOption<PenaltyType>[] = allValues.map((value) => ({
    label: penaltyTypeLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
