'use client'

import type { ConnectionStatus } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { connectionStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: ConnectionStatus[] = ['ACTIVE', 'PAUSED', 'DISCONNECTED']

export function SelectConnectionStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<ConnectionStatus>[] = allValues.map((value) => ({
    label: connectionStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
