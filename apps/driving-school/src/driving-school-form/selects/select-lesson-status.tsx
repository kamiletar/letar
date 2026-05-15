'use client'

import type { LessonStatus } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { lessonStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: LessonStatus[] = [
  'PENDING',
  'CONFIRMED',
  'NEEDS_RESCHEDULE',
  'COMPLETED',
  'NO_SHOW',
  'CANCELLED',
  'RESCHEDULED',
]

export function SelectLessonStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<LessonStatus>[] = allValues.map((value) => ({
    label: lessonStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
