'use client'

import type { TransferReason } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { transferReasonLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: TransferReason[] = ['VACATION', 'SICK_LEAVE', 'PERMANENT', 'OTHER']

export function SelectTransferReason({ name, ...props }: Props): ReactElement {
  const options: SelectOption<TransferReason>[] = allValues.map((value) => ({
    label: transferReasonLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
