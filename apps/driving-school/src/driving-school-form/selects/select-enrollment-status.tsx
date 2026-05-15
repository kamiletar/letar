'use client'

import type { EnrollmentStatus } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { enrollmentStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: EnrollmentStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']

export function SelectEnrollmentStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<EnrollmentStatus>[] = allValues.map((value) => ({
    label: enrollmentStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
