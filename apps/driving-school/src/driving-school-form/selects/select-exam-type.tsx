'use client'

import type { ExamType } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { examTypeLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: ExamType[] = [
  'INTERNAL_THEORY',
  'INTERNAL_PRACTICE',
  'GIBDD_THEORY',
  'GIBDD_PRACTICE_AREA',
  'GIBDD_PRACTICE_CITY',
]

export function SelectExamType({ name, ...props }: Props): ReactElement {
  const options: SelectOption<ExamType>[] = allValues.map((value) => ({
    label: examTypeLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
