'use client'

import type { SlotStatus } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { slotStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: SlotStatus[] = ['AVAILABLE', 'BOOKED', 'BLOCKED']

export function SelectSlotStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<SlotStatus>[] = allValues.map((value) => ({
    label: slotStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
