'use client'

import type { PayoutRequestStatus } from '@/generated/prisma'
import { FieldSelect, type SelectOption } from '@letar/forms'
import type { ReactElement } from 'react'
import { payoutRequestStatusLabels } from '../labels'

interface Props {
  name?: string
  label?: string
  placeholder?: string
  helperText?: string
  required?: boolean
  disabled?: boolean
}

const allValues: PayoutRequestStatus[] = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PAID', 'REJECTED']

export function SelectPayoutRequestStatus({ name, ...props }: Props): ReactElement {
  const options: SelectOption<PayoutRequestStatus>[] = allValues.map((value) => ({
    label: payoutRequestStatusLabels[value] ?? value,
    value,
  }))

  return <FieldSelect name={name} options={options} {...props} />
}
