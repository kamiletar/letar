'use client'

import type { ChangeStatus } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { changeStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: ChangeStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'GIBDD_NOTIFIED']

export function SelectChangeStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<ChangeStatus>[] = allValues.map((value) => ({
    label: changeStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
