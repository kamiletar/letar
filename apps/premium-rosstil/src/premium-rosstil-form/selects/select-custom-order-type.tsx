'use client'

import type { CustomOrderType } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { customOrderTypeLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: CustomOrderType[] = ['MADE_TO_ORDER', 'CUSTOM_DESIGN', 'B2B_PARTNERSHIP']

export function SelectCustomOrderType({ name, ...props }: Props): ReactElement {
  const options: SelectOption<CustomOrderType>[] = allValues.map((value) => ({
    label: customOrderTypeLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
