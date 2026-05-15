'use client'

import type { TheoryStatus } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { theoryStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: TheoryStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED']

export function SelectTheoryStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<TheoryStatus>[] = allValues.map((value) => ({
    label: theoryStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
