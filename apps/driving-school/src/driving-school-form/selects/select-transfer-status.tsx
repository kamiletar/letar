'use client'

import type { TransferStatus } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { transferStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: TransferStatus[] = ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED']

export function SelectTransferStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<TransferStatus>[] = allValues.map((value) => ({
    label: transferStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
