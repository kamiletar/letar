'use client'

import type { TransferType } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { transferTypeLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: TransferType[] = ['TEMPORARY', 'PERMANENT']

export function SelectTransferType({ name, ...props }: Props): ReactElement {
  const options: SelectOption<TransferType>[] = allValues.map((value) => ({
    label: transferTypeLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
