'use client'

import type { TransmissionType } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { transmissionTypeLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: TransmissionType[] = ['MANUAL', 'AUTOMATIC']

export function SelectTransmissionType({ name, ...props }: Props): ReactElement {
  const options: SelectOption<TransmissionType>[] = allValues.map((value) => ({
    label: transmissionTypeLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
