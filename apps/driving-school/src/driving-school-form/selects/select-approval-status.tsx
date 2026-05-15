'use client'

import type { ApprovalStatus } from '@letar/driving-school-db/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { approvalStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: ApprovalStatus[] = ['NOT_REQUESTED', 'REQUESTED', 'APPROVED', 'DENIED']

export function SelectApprovalStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<ApprovalStatus>[] = allValues.map((value) => ({
    label: approvalStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
