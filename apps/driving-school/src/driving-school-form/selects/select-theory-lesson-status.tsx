'use client'

import type { TheoryLessonStatus } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { theoryLessonStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: TheoryLessonStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED']

export function SelectTheoryLessonStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<TheoryLessonStatus>[] = allValues.map((value) => ({
    label: theoryLessonStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
