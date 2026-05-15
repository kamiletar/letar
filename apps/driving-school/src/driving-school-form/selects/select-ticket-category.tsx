'use client'

import type { TicketCategory } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { ticketCategoryLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: TicketCategory[] = ['HELP', 'BUG', 'FEATURE', 'OTHER']

export function SelectTicketCategory({ name, ...props }: Props): ReactElement {
  const options: SelectOption<TicketCategory>[] = allValues.map((value) => ({
    label: ticketCategoryLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
