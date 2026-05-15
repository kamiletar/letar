'use client'

import type { LocationType } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { locationTypeLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: LocationType[] = ['OFFICE', 'CLASSROOM', 'TRAINING']

export function SelectLocationType({ name, ...props }: Props): ReactElement {
  const options: SelectOption<LocationType>[] = allValues.map((value) => ({
    label: locationTypeLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
