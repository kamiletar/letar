'use client'

import type { LearningStatus } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { LearningStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: LearningStatus[] = ['WANT_TO_LEARN', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED']

export function SelectLearningStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<LearningStatus>[] = allValues.map((value) => ({
    label: LearningStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
