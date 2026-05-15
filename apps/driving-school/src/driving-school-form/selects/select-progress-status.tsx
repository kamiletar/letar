'use client'

import type { ProgressStatus } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { progressStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: ProgressStatus[] = ['ACTIVE', 'COMPLETED', 'EXPELLED', 'SUSPENDED']

export function SelectProgressStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<ProgressStatus>[] = allValues.map((value) => ({
    label: progressStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
