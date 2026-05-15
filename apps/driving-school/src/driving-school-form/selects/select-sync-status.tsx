'use client'

import type { SyncStatus } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { syncStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: SyncStatus[] = ['PENDING', 'SYNCED', 'FAILED']

export function SelectSyncStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<SyncStatus>[] = allValues.map((value) => ({
    label: syncStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
