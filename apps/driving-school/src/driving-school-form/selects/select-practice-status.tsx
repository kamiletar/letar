'use client'

import type { PracticeStatus } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { practiceStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: PracticeStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']

export function SelectPracticeStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<PracticeStatus>[] = allValues.map((value) => ({
    label: practiceStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
