'use client'

import type { SellerStatus } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { sellerStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: SellerStatus[] = ['PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED']

export function SelectSellerStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<SellerStatus>[] = allValues.map((value) => ({
    label: sellerStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
