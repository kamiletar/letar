'use client'

import type { AbsenceType } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { absenceTypeLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: AbsenceType[] = ['VACATION', 'SICK_LEAVE']

export function SelectAbsenceType({ name, ...props }: Props): ReactElement {
  const options: SelectOption<AbsenceType>[] = allValues.map((value) => ({
    label: absenceTypeLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
