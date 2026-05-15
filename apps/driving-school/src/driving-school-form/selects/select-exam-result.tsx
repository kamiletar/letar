'use client'

import type { ExamResult } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { examResultLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: ExamResult[] = ['PASSED', 'FAILED', 'NO_SHOW']

export function SelectExamResult({ name, ...props }: Props): ReactElement {
  const options: SelectOption<ExamResult>[] = allValues.map((value) => ({
    label: examResultLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
